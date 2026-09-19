import { Prisma } from "@prisma/client";
import type { ObservationSDMX } from "./parseur";
import { debutPeriode } from "./periodes";

/** Comparaison des observations reçues avec celles en base : fonction pure, testée sans base de données. */

export type ObservationExistante = { periode: string; valeur: string; statut: string | null };
export type ObservationACreer = ObservationSDMX & { debutPeriode: Date };
export type MiseAJour = { periode: string; ancienne: ObservationExistante; nouvelle: ObservationSDMX };
export type PlanUpsert = { aCreer: ObservationACreer[]; aMettreAJour: MiseAJour[]; inchangees: number; ignorees: string[] };

/** Égalité numérique exacte (« 147.10 » = « 147.1 »), sans passer par un flottant. */
export function memeValeur(a: string, b: string): boolean {
  try {
    return new Prisma.Decimal(a).equals(new Prisma.Decimal(b));
  } catch {
    return a === b;
  }
}

/**
 * Créations, révisions (valeur ou statut différents : provisoire devenu définitif, correction) et observations inchangées.
 * Idempotent : deux synchronisations successives sans nouveauté ne produisent aucune écriture.
 */
export function planifierUpsert(existantes: ObservationExistante[], recues: ObservationSDMX[]): PlanUpsert {
  const parPeriode = new Map(existantes.map((e) => [e.periode, e]));
  const plan: PlanUpsert = { aCreer: [], aMettreAJour: [], inchangees: 0, ignorees: [] };
  const vues = new Set<string>();
  for (const o of recues) {
    if (vues.has(o.periode)) continue;
    vues.add(o.periode);
    const debut = debutPeriode(o.periode);
    if (!debut || !/^-?\d+(\.\d+)?$/.test(o.valeur)) {
      plan.ignorees.push(o.periode);
      continue;
    }
    const e = parPeriode.get(o.periode);
    if (!e) plan.aCreer.push({ ...o, debutPeriode: debut });
    else if (!memeValeur(e.valeur, o.valeur) || (e.statut ?? null) !== (o.statut ?? null)) plan.aMettreAJour.push({ periode: o.periode, ancienne: e, nouvelle: o });
    else plan.inchangees++;
  }
  return plan;
}
