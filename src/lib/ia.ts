import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { iaConfiguree, modeleIA } from "./ia-config";

export const SYSTEME_REDACTION = `Tu es l'assistant de rédaction d'une application de gestion locative utilisée par un cabinet d'expertise comptable de Normandie et par ses clients bailleurs (particuliers et petites sociétés civiles immobilières).
Tu rédiges en français des documents juridiquement rigoureux, conformes à la loi n° 89-462 du 6 juillet 1989 et à ses textes d'application (contrat type du décret n° 2015-587 du 29 mai 2015, notice d'information), avec un ton professionnel, clair et courtois.
Règles :
- Tu n'inventes jamais une information. Si une donnée nécessaire manque, insère un champ entre crochets, par exemple [À COMPLÉTER : surface habitable].
- Tu utilises exclusivement les informations fournies dans la fiche ; tu n'ajoutes ni honoraires ni frais non mentionnés.
- Tu réponds uniquement avec le document demandé, sans phrase d'introduction ni de conclusion, sans commentaire.
- Mise en forme : une ligne commençant par « # » pour le titre du document, « ## » pour les titres d'articles ou de parties, « - » pour les éléments de liste, des paragraphes séparés par une ligne vide. Pas de tableau, pas de gras ni d'italique.`;

let client: Anthropic | null = null;

function clientIA(): Anthropic {
  if (!iaConfiguree()) throw new Error("L'assistant IA n'est pas configuré : renseignez ANTHROPIC_API_KEY dans le fichier .env.");
  if (!client) client = new Anthropic({ timeout: 10 * 60 * 1000 });
  return client;
}

function texteDe(message: Anthropic.Beta.BetaMessage): string {
  if (message.stop_reason === "refusal") {
    throw new Error("L'assistant IA a décliné cette demande. Reformulez-la ou rédigez le document manuellement.");
  }
  const texte = message.content
    .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();
  if (!texte) throw new Error("L'assistant IA n'a renvoyé aucun texte.");
  if (message.stop_reason === "max_tokens") return texte + "\n\n[Document tronqué : la réponse a atteint la longueur maximale.]";
  return texte;
}

/** Rédaction d'un document texte (contrat, courrier, email). */
export async function rediger({ system = SYSTEME_REDACTION, prompt, maxTokens = 16000 }: { system?: string; prompt: string; maxTokens?: number }): Promise<string> {
  const stream = clientIA().beta.messages.stream({
    model: modeleIA(),
    max_tokens: maxTokens,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    system,
    messages: [{ role: "user", content: prompt }],
  });
  const message = await stream.finalMessage();
  return texteDe(message);
}
