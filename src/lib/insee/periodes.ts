/**
 * Périodes de l'INSEE : « 2026-06 » (mensuelle), « 2026-Q2 » (trimestrielle), « 2026-S1 » (semestrielle), « 2026 » (annuelle).
 * Aucune hypothèse sur un format unique : chaque fonction analyse la période reçue.
 */

export type Frequence = "M" | "Q" | "S" | "A";
export type PeriodeAnalysee = { frequence: Frequence; annee: number; rang: number };

const RANGS: Record<Frequence, number> = { M: 12, Q: 4, S: 2, A: 1 };
const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];

export function analyserPeriode(periode: string | null | undefined): PeriodeAnalysee | null {
  const p = (periode ?? "").trim();
  let m: RegExpExecArray | null;
  if ((m = /^(\d{4})-(\d{2})$/.exec(p))) {
    const mois = Number(m[2]);
    return mois >= 1 && mois <= 12 ? { frequence: "M", annee: Number(m[1]), rang: mois } : null;
  }
  if ((m = /^(\d{4})-Q([1-4])$/i.exec(p))) return { frequence: "Q", annee: Number(m[1]), rang: Number(m[2]) };
  if ((m = /^(\d{4})-S([12])$/i.exec(p))) return { frequence: "S", annee: Number(m[1]), rang: Number(m[2]) };
  if ((m = /^(\d{4})$/.exec(p))) return { frequence: "A", annee: Number(m[1]), rang: 1 };
  return null;
}

export function formaterPeriode(p: PeriodeAnalysee): string {
  switch (p.frequence) {
    case "M":
      return `${p.annee}-${String(p.rang).padStart(2, "0")}`;
    case "Q":
      return `${p.annee}-Q${p.rang}`;
    case "S":
      return `${p.annee}-S${p.rang}`;
    default:
      return String(p.annee);
  }
}

/** Premier mois (1-12) couvert par la période. */
function premierMois(p: PeriodeAnalysee): number {
  if (p.frequence === "M") return p.rang;
  if (p.frequence === "Q") return (p.rang - 1) * 3 + 1;
  if (p.frequence === "S") return (p.rang - 1) * 6 + 1;
  return 1;
}

/** Premier jour de la période (minuit UTC), pour les tris et les requêtes. */
export function debutPeriode(periode: string): Date | null {
  const a = analyserPeriode(periode);
  return a ? new Date(Date.UTC(a.annee, premierMois(a) - 1, 1)) : null;
}

/** Période décalée de n rangs (n négatif pour reculer), dans la même fréquence. */
export function periodeDecalee(periode: string, n: number): string | null {
  const a = analyserPeriode(periode);
  if (!a) return null;
  const parAn = RANGS[a.frequence];
  const total = a.annee * parAn + (a.rang - 1) + n;
  const annee = Math.floor(total / parAn);
  return formaterPeriode({ frequence: a.frequence, annee, rang: total - annee * parAn + 1 });
}

/** Même période, un an plus tôt (12 mois, 4 trimestres, 2 semestres ou 1 an). */
export function periodeUnAnAvant(periode: string): string | null {
  const a = analyserPeriode(periode);
  return a ? periodeDecalee(periode, -RANGS[a.frequence]) : null;
}

/** Premier jour suivant la fin de la période (fin exclusive). */
export function finPeriode(periode: string): Date | null {
  const suivante = periodeDecalee(periode, 1);
  return suivante ? debutPeriode(suivante) : null;
}

/** Nombre de périodes entièrement écoulées après la période indiquée, à une date donnée. */
export function periodesEcoulees(periode: string, date: Date): number {
  let n = 0;
  let courante = periode;
  while (n < 10000) {
    const suivante = periodeDecalee(courante, 1);
    const fin = suivante ? finPeriode(suivante) : null;
    if (!suivante || !fin || fin.getTime() > date.getTime()) break;
    n++;
    courante = suivante;
  }
  return n;
}

/** Libellé lisible : « juin 2026 », « T2 2026 », « 1er semestre 2026 », « 2026 ». */
export function libellePeriode(periode: string): string {
  const a = analyserPeriode(periode);
  if (!a) return periode;
  switch (a.frequence) {
    case "M":
      return `${MOIS[a.rang - 1]} ${a.annee}`;
    case "Q":
      return `T${a.rang} ${a.annee}`;
    case "S":
      return `${a.rang === 1 ? "1er" : "2e"} semestre ${a.annee}`;
    default:
      return String(a.annee);
  }
}

/** « 2026-Q2 » → « T2 2026 » (saisie des baux) ; null pour une période non trimestrielle. */
export function trimestreDepuisPeriode(periode: string): string | null {
  const a = analyserPeriode(periode);
  return a && a.frequence === "Q" ? `T${a.rang} ${a.annee}` : null;
}

/** « T2 2026 » → « 2026-Q2 ». */
export function periodeDepuisTrimestre(trimestre: string): string | null {
  const m = /^T([1-4])\s+(\d{4})$/.exec(trimestre.trim());
  return m ? `${m[2]}-Q${m[1]}` : null;
}

/** « T2 2025 » + 1 an → « T2 2026 ». */
export function trimestrePlus(trimestre: string, annees: number): string | null {
  const m = /^T([1-4])\s+(\d{4})$/.exec(trimestre.trim());
  return m ? `T${m[1]} ${Number(m[2]) + annees}` : null;
}

/** Paramètre startPeriod d'un historique complet, dans le format attendu pour la fréquence. */
export function startPeriodPour(frequence: "M" | "Q" | "A", annee: number): string {
  return frequence === "M" ? `${annee}-01` : frequence === "Q" ? `${annee}-Q1` : String(annee);
}
