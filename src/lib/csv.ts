/** Génère un CSV (séparateur point-virgule, compatible Excel français, UTF-8 avec BOM). */
export function versCSV(entetes: string[], lignes: (string | number | null | undefined)[][]): string {
  const cellule = (v: string | number | null | undefined): string => {
    if (v === null || v === undefined) return "";
    if (typeof v === "number") return v.toFixed(2).replace(".", ",");
    const s = String(v);
    return /[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return "﻿" + [entetes, ...lignes].map((l) => l.map(cellule).join(";")).join("\r\n");
}

export function reponseCSV(contenu: string, nomFichier: string): Response {
  return new Response(contenu, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${nomFichier}"` } });
}
