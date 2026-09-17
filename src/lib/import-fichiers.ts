import "server-only";
import ExcelJS from "exceljs";
import { parserCSV, type Cellule } from "./emprunts";

/** Lit un CSV ou un classeur Excel en tableau de cellules (première feuille). */
export async function lireTableau(fichier: File): Promise<Cellule[][]> {
  const nom = fichier.name.toLowerCase();
  const buffer = Buffer.from(await fichier.arrayBuffer());
  if (nom.endsWith(".xlsx") || nom.endsWith(".xlsm") || fichier.type.includes("spreadsheetml")) {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buffer as unknown as ArrayBuffer);
    const ws = wb.worksheets[0];
    if (!ws) return [];
    const lignes: Cellule[][] = [];
    ws.eachRow({ includeEmpty: false }, (row) => {
      const valeurs = row.values as ExcelJS.CellValue[];
      const cellules: Cellule[] = [];
      for (let i = 1; i < valeurs.length; i++) cellules.push(normaliserCellule(valeurs[i]));
      if (cellules.some((c) => c !== null && c !== "")) lignes.push(cellules);
    });
    return lignes;
  }
  // CSV / texte : détection d'encodage sommaire (UTF-8 sinon Windows-1252)
  let texte = buffer.toString("utf8");
  if (texte.includes("�")) texte = new TextDecoder("windows-1252").decode(buffer);
  return parserCSV(texte);
}

function normaliserCellule(v: ExcelJS.CellValue): Cellule {
  if (v === null || v === undefined) return null;
  if (v instanceof Date) return v;
  if (typeof v === "number" || typeof v === "string") return v;
  if (typeof v === "boolean") return v ? "1" : "0";
  if (typeof v === "object") {
    const o = v as { result?: ExcelJS.CellValue; richText?: { text: string }[]; text?: string; hyperlink?: string; error?: string };
    if ("result" in o && o.result !== undefined) return normaliserCellule(o.result as ExcelJS.CellValue);
    if (Array.isArray(o.richText)) return o.richText.map((r) => r.text).join("");
    if (typeof o.text === "string") return o.text;
    if (o.error) return null;
  }
  return String(v);
}
