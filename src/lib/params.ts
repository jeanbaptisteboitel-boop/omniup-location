import { notFound } from "next/navigation";

export type ParamsId = Promise<{ id: string }>;
export type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/** Identifiant numérique depuis les paramètres de route, sinon 404. */
export async function idDepuis(params: ParamsId): Promise<number> {
  const { id } = await params;
  const n = Number(id);
  if (!Number.isInteger(n) || n <= 0) notFound();
  return n;
}

export function texteParam(sp: Record<string, string | string[] | undefined>, cle: string): string | null {
  const v = sp[cle];
  return typeof v === "string" && v !== "" ? v : null;
}

export function entierParam(sp: Record<string, string | string[] | undefined>, cle: string): number | null {
  const v = texteParam(sp, cle);
  if (v === null) return null;
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : null;
}

/** Identifiants numériques répétés dans l'URL (?locataireId=1&locataireId=2). */
export function entiersParam(sp: Record<string, string | string[] | undefined>, cle: string): number[] {
  const v = sp[cle];
  const brut = v === undefined ? [] : Array.isArray(v) ? v : [v];
  return brut.map(Number).filter((n) => Number.isInteger(n) && n > 0);
}

/** Nombre décimal depuis les paramètres de route (loyer pré-rempli), sinon null. */
export function nombreParam(sp: Record<string, string | string[] | undefined>, cle: string): number | null {
  const v = texteParam(sp, cle);
  if (v === null) return null;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : null;
}
