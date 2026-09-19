import type { TypeBail } from "@prisma/client";
import { arrondir2 } from "./montants";

/**
 * TVA sur les loyers.
 * - Les locations à usage d'habitation (loi du 6 juillet 1989) sont exonérées sans possibilité d'option (CGI, art. 261 D).
 * - Les locaux commerciaux ou professionnels loués nus sont soumis à la TVA à 20 % sur option du bailleur (CGI, art. 260 2°),
 *   exercée immeuble par immeuble puis, dans l'application, local par local.
 * - L'hébergement meublé avec prestations para-hôtelières relève du taux de 10 % (CGI, art. 279 a).
 * La TVA s'applique au loyer et aux charges refacturées, accessoires du loyer.
 */

export const TAUX_TVA = [10, 20] as const;
export type TauxTva = (typeof TAUX_TVA)[number];

export const EXPLICATION_TAUX: Record<TauxTva, string> = {
  10: "Hébergement meublé avec prestations para-hôtelières (au moins trois des quatre : petit-déjeuner, nettoyage régulier des locaux, fourniture du linge de maison, réception de la clientèle).",
  20: "Local commercial ou professionnel dont le bailleur a opté pour la TVA : taux normal sur le loyer et les charges.",
};

/** Location à usage d'habitation : exonérée de TVA, aucune option possible. */
export function usageHabitation(type: TypeBail): boolean {
  return type === "NON_MEUBLE" || type === "MEUBLE" || type === "MOBILITE";
}

/** Taux possibles pour un type de bail (vide pour l'habitation). */
export function tauxTvaAutorises(type: TypeBail): TauxTva[] {
  switch (type) {
    case "COMMERCIAL":
    case "PROFESSIONNEL":
      return [20];
    case "SAISONNIER":
      return [10];
    default:
      return [];
  }
}

/** Le lot est soumis à la TVA quand l'option est cochée sur le lot et, s'il dépend d'un immeuble, sur l'immeuble. */
export function optionTvaEffective(lot: { optionTva: boolean; immeuble?: { optionTva: boolean } | null }): boolean {
  return lot.optionTva && (!lot.immeuble || lot.immeuble.optionTva);
}

/** Motif pour lequel un taux ne peut pas s'appliquer à ce bail, sinon null. */
export function problemeTauxTva(type: TypeBail, taux: number, lotSoumisTva: boolean): string | null {
  if (!taux) return null;
  if (usageHabitation(type)) return "Une location à usage d'habitation est exonérée de TVA : aucun taux ne peut être appliqué.";
  const autorises: number[] = tauxTvaAutorises(type);
  if (!autorises.includes(taux)) return `Taux non applicable à ce type de bail (taux possible : ${autorises.map((t) => `${t} %`).join(", ")}).`;
  if (!lotSoumisTva) return "Le lot n'est pas soumis à la TVA : activez d'abord l'option sur l'immeuble, puis sur le lot.";
  return null;
}

export function montantTva(baseHT: number, taux: number): number {
  return taux > 0 ? arrondir2((baseHT * taux) / 100) : 0;
}

/** Décomposition mensuelle d'un bail : hors taxes (loyer + charges), TVA, toutes taxes comprises. */
export function montantsMensuels(bail: { loyerHC: number; charges: number; tauxTva: number }): { ht: number; tva: number; ttc: number } {
  const ht = arrondir2(bail.loyerHC + bail.charges);
  const tva = montantTva(ht, bail.tauxTva);
  return { ht, tva, ttc: arrondir2(ht + tva) };
}

/** « 20 % » */
export function libelleTaux(taux: number): string {
  return `${String(taux).replace(".", ",")} %`;
}
