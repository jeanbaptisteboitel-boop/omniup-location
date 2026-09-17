import "server-only";
import { Mistral } from "@mistralai/mistralai";
import { mistralConfigure, modeleMistralExtraction, modeleMistralOCR } from "./mistral-config";

/**
 * OCR et extraction structurée de documents (tableaux d'amortissement, justificatifs) via Mistral.
 * La rédaction (contrats, courriers, emails) reste assurée par l'assistant Anthropic (src/lib/ia.ts).
 */

let client: Mistral | null = null;

function clientMistral(): Mistral {
  if (!mistralConfigure()) throw new Error("L'OCR n'est pas configuré : renseignez MISTRAL_API_KEY dans le fichier .env.");
  if (!client) client = new Mistral({ apiKey: process.env.MISTRAL_API_KEY });
  return client;
}

/** Texte (markdown) d'un PDF ou d'une image, page par page. */
export async function ocrDocument(contenu: Buffer, mimeType: string): Promise<{ markdown: string; pages: number }> {
  const b64 = contenu.toString("base64");
  const document =
    mimeType === "application/pdf"
      ? { type: "document_url" as const, documentUrl: `data:application/pdf;base64,${b64}`, documentName: "document.pdf" }
      : { type: "image_url" as const, imageUrl: `data:${mimeType};base64,${b64}` };
  const r = await clientMistral().ocr.process({ model: modeleMistralOCR(), document });
  const markdown = r.pages.map((p) => p.markdown).join("\n\n");
  if (!markdown.trim()) throw new Error("Aucun texte lisible dans ce document.");
  return { markdown, pages: r.pages.length };
}

export type EcheanceExtraite = { date: string; capital: number; interets: number; assurance: number; total: number; capitalRestant: number | null };

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
    remarques: { type: "string", description: "Anomalies ou incertitudes relevées (colonnes ambiguës, lignes illisibles), chaîne vide sinon." },
  },
  required: ["echeances", "remarques"],
  additionalProperties: false,
};

/** Lit un tableau d'amortissement (PDF ou image) : OCR puis extraction JSON. */
export async function extraireEcheancier(contenu: Buffer, mimeType: string): Promise<{ echeances: EcheanceExtraite[]; remarques: string; pages: number }> {
  const { markdown, pages } = await ocrDocument(contenu, mimeType);
  const r = await clientMistral().chat.complete({
    model: modeleMistralExtraction(),
    temperature: 0,
    messages: [
      {
        role: "system",
        content:
          "Tu extrais fidèlement les tableaux d'amortissement d'emprunts immobiliers français à partir de leur texte OCR. Reproduis chaque échéance avec ses montants exacts (la virgule est le séparateur décimal, les espaces séparent les milliers). N'invente aucune ligne : si une valeur est illisible, signale-le dans « remarques ». Réponds uniquement avec le JSON demandé.",
      },
      { role: "user", content: `Texte OCR du tableau d'amortissement (${pages} page${pages > 1 ? "s" : ""}) :\n\n${markdown}` },
    ],
    responseFormat: { type: "json_schema", jsonSchema: { name: "echeancier", schemaDefinition: SCHEMA_ECHEANCIER, strict: true } },
  });
  const contenuReponse = r.choices[0]?.message?.content;
  const texte = typeof contenuReponse === "string" ? contenuReponse : Array.isArray(contenuReponse) ? contenuReponse.map((c) => (c.type === "text" ? c.text : "")).join("") : "";
  let json: unknown;
  try {
    json = JSON.parse(texte);
  } catch {
    throw new Error("La réponse de Mistral n'est pas un JSON valide.");
  }
  const obj = json as { echeances?: unknown; remarques?: unknown };
  if (!Array.isArray(obj.echeances)) throw new Error("La réponse de Mistral ne contient pas d'échéances.");
  return { echeances: obj.echeances as EcheanceExtraite[], remarques: typeof obj.remarques === "string" ? obj.remarques : "", pages };
}
