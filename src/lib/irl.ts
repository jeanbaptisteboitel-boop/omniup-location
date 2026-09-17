import { arrondir2 } from "./montants";

/**
 * Loyer révisé selon l'indice de référence des loyers (IRL) :
 * nouveau loyer = loyer actuel × IRL nouveau / IRL ancien (art. 17-1 loi du 6 juillet 1989).
 */
export function calculerLoyerRevise(loyerActuel: number, irlAncien: number, irlNouveau: number): number {
  if (irlAncien <= 0 || irlNouveau <= 0) throw new Error("Les indices IRL doivent être positifs.");
  return arrondir2((loyerActuel * irlNouveau) / irlAncien);
}

export function variationIRL(irlAncien: number, irlNouveau: number): number {
  return arrondir2(((irlNouveau - irlAncien) / irlAncien) * 100);
}

/** Libellé de trimestre : "T2 2026". */
export function formatTrimestre(trimestre: number, annee: number): string {
  return `T${trimestre} ${annee}`;
}

/** Trimestres proposés dans les formulaires (les 5 dernières années). */
export function trimestresIRL(anneeCourante: number): string[] {
  const out: string[] = [];
  for (let a = anneeCourante; a >= anneeCourante - 5; a--) {
    for (let t = 4; t >= 1; t--) out.push(formatTrimestre(t, a));
  }
  return out;
}
