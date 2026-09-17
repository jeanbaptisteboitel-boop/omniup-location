import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { iaConfiguree, modeleIA } from "@/lib/ia-config";
import { SYSTEME_REDACTION } from "@/lib/ia";
import { contexteEntite } from "@/lib/ia-contexte-entite";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const SYSTEME_ASSISTANT = `Tu es l'assistant conversationnel d'OMNIUP Location, application de gestion locative utilisée par un cabinet d'expertise comptable de Normandie et par ses clients bailleurs (particuliers, SCI, entreprises de gérance locative).
Tu conseilles l'utilisateur sur la gestion locative en droit français (loi n° 89-462 du 6 juillet 1989, Code civil, Code de commerce pour les baux commerciaux, Code de la construction et de l'habitation, fiscalité des revenus fonciers et de la location meublée) et tu rédiges tout courrier ou document demandé : relances, congés, réponses au locataire, attestations, avenants, mises en demeure, courriers au syndic ou à l'assureur.
Règles :
- Réponds en français, de façon claire et concrète, en citant les textes applicables quand tu donnes un conseil juridique et en signalant les points à vérifier avec un professionnel du droit lorsque la situation est litigieuse.
- Utilise le contexte de l'entité fourni ci-dessous (lots, locataires, loyers en retard) pour personnaliser tes réponses ; n'invente jamais une donnée absente : demande-la ou mets un champ [À COMPLÉTER : …].
- Quand tu rédiges un courrier ou un document, donne-le en entier, prêt à être enregistré : titre sur une ligne commençant par « # », sous-titres éventuels avec « ## », listes avec « - », coordonnées de l'expéditeur puis du destinataire, lieu et date, objet, corps, formule de politesse et signature.
- Sois concis dans les échanges ordinaires ; développe seulement quand la question l'exige.`;

type MessageEntrant = { role: "user" | "assistant"; content: string };

export async function POST(req: NextRequest) {
  if (!iaConfiguree()) return Response.json({ erreur: "L'assistant IA n'est pas configuré (ANTHROPIC_API_KEY)." }, { status: 503 });
  let corps: { messages?: MessageEntrant[] };
  try {
    corps = (await req.json()) as { messages?: MessageEntrant[] };
  } catch {
    return Response.json({ erreur: "Requête invalide." }, { status: 400 });
  }
  const messages = (corps.messages ?? [])
    .filter((m): m is MessageEntrant => !!m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim() !== "")
    .slice(-30)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 20000) }));
  if (messages.length === 0 || messages[messages.length - 1].role !== "user") return Response.json({ erreur: "Aucune question." }, { status: 400 });

  const contexte = await contexteEntite();
  const client = new Anthropic({ timeout: 10 * 60 * 1000 });
  const stream = client.beta.messages.stream({
    model: modeleIA(),
    max_tokens: 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    system: [
      { type: "text", text: `${SYSTEME_ASSISTANT}\n\n${SYSTEME_REDACTION}`, cache_control: { type: "ephemeral" } },
      { type: "text", text: `# CONTEXTE DE L'ENTITÉ\n${contexte}` },
    ],
    messages,
  });

  const encodeur = new TextEncoder();
  const corpsReponse = new ReadableStream<Uint8Array>({
    async start(controleur) {
      try {
        for await (const evenement of stream) {
          if (evenement.type === "content_block_delta" && evenement.delta.type === "text_delta") controleur.enqueue(encodeur.encode(evenement.delta.text));
        }
        const final = await stream.finalMessage();
        if (final.stop_reason === "refusal") controleur.enqueue(encodeur.encode("\n\n[L'assistant a décliné cette demande.]"));
        else if (final.stop_reason === "max_tokens") controleur.enqueue(encodeur.encode("\n\n[Réponse tronquée : la longueur maximale a été atteinte.]"));
      } catch (e) {
        controleur.enqueue(encodeur.encode(`\n\n[Erreur de l'assistant : ${e instanceof Error ? e.message : "inconnue"}]`));
      } finally {
        controleur.close();
      }
    },
  });
  return new Response(corpsReponse, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store", "X-Accel-Buffering": "no" } });
}
