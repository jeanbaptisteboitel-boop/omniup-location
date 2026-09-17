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

const SCHEMA_ECHEANCIER = {
  type: "object",
  properties: {
    echeances: {
      type: "array",
      description: "Une ligne par échéance du tableau d'amortissement, dans l'ordre chronologique.",
      items: {
        type: "object",
        properties: {
          date: { type: "string", description: "Date de l'échéance au format AAAA-MM-JJ (le 1er du mois si seul le mois est connu)." },
          capital: { type: "number", description: "Part de capital amorti (positif)." },
          interets: { type: "number", description: "Part d'intérêts (positif)." },
          assurance: { type: "number", description: "Assurance emprunteur incluse dans l'échéance, 0 si absente." },
          total: { type: "number", description: "Montant total de l'échéance." },
          capitalRestant: { anyOf: [{ type: "number" }, { type: "null" }], description: "Capital restant dû après l'échéance, null si non indiqué." },
        },
        required: ["date", "capital", "interets", "assurance", "total", "capitalRestant"],
        additionalProperties: false,
      },
    },
    remarques: { type: "string", description: "Anomalies ou incertitudes relevées (colonnes ambiguës, lignes illisibles), vide sinon." },
  },
  required: ["echeances", "remarques"],
  additionalProperties: false,
} as const;

export type EcheanceExtraite = { date: string; capital: number; interets: number; assurance: number; total: number; capitalRestant: number | null };

/** Extraction structurée d'un tableau d'amortissement depuis un PDF ou une image. */
export async function extraireEcheancier(contenu: Buffer, mimeType: string): Promise<{ echeances: EcheanceExtraite[]; remarques: string }> {
  const data = contenu.toString("base64");
  const bloc: Anthropic.Beta.BetaContentBlockParam =
    mimeType === "application/pdf"
      ? { type: "document", source: { type: "base64", media_type: "application/pdf", data } }
      : { type: "image", source: { type: "base64", media_type: mimeType as "image/jpeg" | "image/png" | "image/webp", data } };

  const message = await clientIA().beta.messages.create({
    model: modeleIA(),
    max_tokens: 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    system:
      "Tu extrais fidèlement les tableaux d'amortissement d'emprunts immobiliers français. Tu reproduis chaque échéance avec ses montants exacts (les virgules sont des séparateurs décimaux). Tu n'inventes aucune ligne : si une valeur est illisible, signale-le dans les remarques.",
    messages: [
      {
        role: "user",
        content: [bloc, { type: "text", text: "Extrais toutes les échéances de ce tableau d'amortissement." }],
      },
    ],
    output_config: { format: { type: "json_schema", schema: SCHEMA_ECHEANCIER } },
  });
  const texte = texteDe(message);
  let json: unknown;
  try {
    json = JSON.parse(texte);
  } catch {
    throw new Error("La réponse de l'assistant IA n'est pas un JSON valide.");
  }
  const obj = json as { echeances?: unknown; remarques?: unknown };
  if (!Array.isArray(obj.echeances)) throw new Error("La réponse de l'assistant IA ne contient pas d'échéances.");
  return { echeances: obj.echeances as EcheanceExtraite[], remarques: typeof obj.remarques === "string" ? obj.remarques : "" };
}
