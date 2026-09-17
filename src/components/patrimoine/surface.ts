import { formatNombre } from "@/lib/montants";

/** Surface en m² au format fr-FR : « 62 m² », « 45,5 m² », « 12,25 m² » ; null si inconnue. */
export function formatSurface(x: number | null | undefined): string | null {
  if (x === null || x === undefined || Number.isNaN(x)) return null;
  const decimales = Number.isInteger(x) ? 0 : Number.isInteger(x * 10) ? 1 : 2;
  return `${formatNombre(x, decimales)} m²`;
}
