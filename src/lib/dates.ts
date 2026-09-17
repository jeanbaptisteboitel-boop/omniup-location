/**
 * Helpers de dates « jour » : toutes les dates métier sont stockées à minuit UTC
 * et formatées avec le fuseau UTC pour éviter les décalages d'un jour.
 */

export function jourUTC(annee: number, mois: number, jour: number): Date {
  return new Date(Date.UTC(annee, mois - 1, jour));
}

/** Date du jour (date locale du serveur), normalisée à minuit UTC. */
export function aujourdhui(): Date {
  const n = new Date();
  return jourUTC(n.getFullYear(), n.getMonth() + 1, n.getDate());
}

/** "AAAA-MM-JJ" -> Date (minuit UTC), ou null si invalide. */
export function parseDateISO(s: string | null | undefined): Date | null {
  if (!s) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s.trim());
  if (!m) return null;
  const [a, mo, j] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const d = jourUTC(a, mo, j);
  if (d.getUTCFullYear() !== a || d.getUTCMonth() !== mo - 1 || d.getUTCDate() !== j) return null;
  return d;
}

/** Date -> "AAAA-MM-JJ" (valeur d'un <input type="date">). */
export function toISODate(d: Date | null | undefined): string {
  if (!d) return "";
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

export function formatDate(d: Date | null | undefined): string {
  if (!d) return "";
  return new Intl.DateTimeFormat("fr-FR", { timeZone: "UTC", day: "2-digit", month: "2-digit", year: "numeric" }).format(d);
}

export function formatDateLongue(d: Date | null | undefined): string {
  if (!d) return "";
  return new Intl.DateTimeFormat("fr-FR", { timeZone: "UTC", day: "numeric", month: "long", year: "numeric" }).format(d);
}

export function formatDateHeure(d: Date | null | undefined): string {
  if (!d) return "";
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "short" }).format(d);
}

/** Période mensuelle "AAAA-MM". */
export function periodeDe(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function parsePeriode(p: string): { annee: number; mois: number } {
  const m = /^(\d{4})-(\d{2})$/.exec(p);
  if (!m) throw new Error(`Période invalide : ${p}`);
  return { annee: Number(m[1]), mois: Number(m[2]) };
}

export function formatPeriode(p: string): string {
  const { annee, mois } = parsePeriode(p);
  const s = new Intl.DateTimeFormat("fr-FR", { timeZone: "UTC", month: "long", year: "numeric" }).format(jourUTC(annee, mois, 1));
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function debutMois(p: string): Date {
  const { annee, mois } = parsePeriode(p);
  return jourUTC(annee, mois, 1);
}

export function finMois(p: string): Date {
  const { annee, mois } = parsePeriode(p);
  return jourUTC(annee, mois + 1, 0);
}

export function joursDansMois(p: string): number {
  return finMois(p).getUTCDate();
}

export function periodeSuivante(p: string): string {
  const { annee, mois } = parsePeriode(p);
  return periodeDe(jourUTC(annee, mois + 1, 1));
}

export function periodePrecedente(p: string): string {
  const { annee, mois } = parsePeriode(p);
  return periodeDe(jourUTC(annee, mois - 1, 1));
}

/** Compare deux périodes "AAAA-MM" (ordre lexicographique = chronologique). */
export function comparerPeriodes(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

export function ajouterJours(d: Date, n: number): Date {
  return new Date(d.getTime() + n * 86_400_000);
}

/** Ajoute n mois en conservant le jour (borné au dernier jour du mois cible). */
export function ajouterMois(d: Date, n: number): Date {
  const cible = jourUTC(d.getUTCFullYear(), d.getUTCMonth() + 1 + n, 1);
  const dernierJour = jourUTC(cible.getUTCFullYear(), cible.getUTCMonth() + 2, 0).getUTCDate();
  return jourUTC(cible.getUTCFullYear(), cible.getUTCMonth() + 1, Math.min(d.getUTCDate(), dernierJour));
}

export function ajouterAnnees(d: Date, n: number): Date {
  return ajouterMois(d, 12 * n);
}

/** Nombre de jours entre a et b (b - a). */
export function differenceJours(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

/** Nombre de mois entiers entre deux dates (approximation calendaire). */
export function differenceMois(a: Date, b: Date): number {
  let mois = (b.getUTCFullYear() - a.getUTCFullYear()) * 12 + (b.getUTCMonth() - a.getUTCMonth());
  if (b.getUTCDate() < a.getUTCDate()) mois -= 1;
  return mois;
}

export function minDate(a: Date, b: Date): Date {
  return a.getTime() <= b.getTime() ? a : b;
}

export function maxDate(a: Date, b: Date): Date {
  return a.getTime() >= b.getTime() ? a : b;
}

export function memeJour(a: Date, b: Date): boolean {
  return a.getTime() === b.getTime();
}
