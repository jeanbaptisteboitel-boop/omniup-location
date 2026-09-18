import { arrondir2 } from "@/lib/montants";

type EmpruntCalcul = { montantInitial: number; tauxAnnuel: number | null; dureeMois: number | null; assuranceMensuelle: number | null };
type Echeance = { date: Date; total: number; capital: number; capitalRestant: number | null };

/** Mensualité (assurance comprise) : dernière échéance connue, sinon calcul théorique à partir des caractéristiques du prêt. */
export function mensualiteDe(e: EmpruntCalcul & { echeances: Pick<Echeance, "date" | "total">[] }, auj: Date): number | null {
  if (e.echeances.length) {
    const passees = e.echeances.filter((x) => x.date.getTime() <= auj.getTime());
    return (passees.length ? passees[passees.length - 1] : e.echeances[0]).total;
  }
  if (e.tauxAnnuel !== null && e.dureeMois && e.montantInitial > 0) {
    const t = e.tauxAnnuel / 100 / 12;
    const m = t === 0 ? e.montantInitial / e.dureeMois : (e.montantInitial * t) / (1 - Math.pow(1 + t, -e.dureeMois));
    return arrondir2(m + (e.assuranceMensuelle ?? 0));
  }
  return null;
}

/**
 * Capital restant dû à une date : capital restant de la dernière échéance passée quand la banque le fournit,
 * sinon capital initial diminué du capital amorti par les échéances passées. `null` sans échéancier.
 */
export function capitalRestantDu(e: EmpruntCalcul & { echeances: Echeance[] }, auj: Date): number | null {
  if (!e.echeances.length) return null;
  const passees = e.echeances.filter((x) => x.date.getTime() <= auj.getTime());
  if (!passees.length) return e.montantInitial;
  const derniere = passees[passees.length - 1];
  if (derniere.capitalRestant !== null) return derniere.capitalRestant;
  return Math.max(0, arrondir2(e.montantInitial - passees.reduce((acc, x) => acc + x.capital, 0)));
}

/** Durée lisible : « 20 ans » quand elle est un nombre entier d'années, sinon en mois. */
export function dureeLisible(dureeMois: number | null): string | null {
  if (!dureeMois) return null;
  return dureeMois % 12 === 0 ? `${dureeMois / 12} ans` : `${dureeMois} mois`;
}
