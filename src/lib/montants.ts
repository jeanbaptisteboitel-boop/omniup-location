/** Arrondi commercial à 2 décimales. */
export function arrondir2(x: number): number {
  return Math.round((x + Number.EPSILON) * 100) / 100;
}

const formatEurosIntl = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });
const formatNombreIntl = new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function formatEuros(x: number | null | undefined): string {
  if (x === null || x === undefined || Number.isNaN(x)) return "—";
  return formatEurosIntl.format(x);
}

export function formatNombre(x: number | null | undefined, decimales = 2): string {
  if (x === null || x === undefined || Number.isNaN(x)) return "—";
  if (decimales === 2) return formatNombreIntl.format(x);
  return new Intl.NumberFormat("fr-FR", { minimumFractionDigits: decimales, maximumFractionDigits: decimales }).format(x);
}

/** Valeur à afficher dans un <input> : "650.5" -> "650,50". */
export function montantPourSaisie(x: number | null | undefined): string {
  if (x === null || x === undefined) return "";
  return x.toFixed(2).replace(".", ",");
}

/**
 * Analyse une saisie française : "1 234,56", "1234.56", "1 234,56 €", "-12,5".
 * Retourne null si la saisie n'est pas un nombre.
 */
export function parseMontant(s: string | null | undefined): number | null {
  if (s === null || s === undefined) return null;
  let t = String(s).replace(/[€\s  ]/g, "").trim();
  if (t === "") return null;
  // Si virgule ET point : le dernier séparateur est le décimal.
  if (t.includes(",") && t.includes(".")) {
    if (t.lastIndexOf(",") > t.lastIndexOf(".")) t = t.replace(/\./g, "").replace(",", ".");
    else t = t.replace(/,/g, "");
  } else {
    t = t.replace(",", ".");
  }
  if (!/^-?\d+(\.\d+)?$/.test(t)) return null;
  const n = Number(t);
  return Number.isFinite(n) ? arrondir2(n) : null;
}

export function somme(valeurs: number[]): number {
  return arrondir2(valeurs.reduce((acc, v) => acc + v, 0));
}

// ---------------------------------------------------------------------------
// Montants en toutes lettres (pour les quittances)
// ---------------------------------------------------------------------------

const UNITES = ["zéro", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf", "dix", "onze", "douze", "treize", "quatorze", "quinze", "seize"];
const DIZAINES = ["", "dix", "vingt", "trente", "quarante", "cinquante", "soixante", "soixante", "quatre-vingt", "quatre-vingt"];

function moinsDeCent(n: number): string {
  if (n < 17) return UNITES[n];
  if (n < 20) return "dix-" + UNITES[n - 10];
  const d = Math.floor(n / 10);
  const u = n % 10;
  if (d === 7 || d === 9) {
    const reste = n - (d === 7 ? 60 : 80);
    const base = d === 7 ? "soixante" : "quatre-vingt";
    if (d === 7 && reste === 11) return "soixante et onze";
    return base + "-" + moinsDeCent(reste);
  }
  if (u === 0) return d === 8 ? "quatre-vingts" : DIZAINES[d];
  if (u === 1 && d !== 8) return DIZAINES[d] + " et un";
  return DIZAINES[d] + "-" + UNITES[u];
}

function moinsDeMille(n: number): string {
  const c = Math.floor(n / 100);
  const r = n % 100;
  if (c === 0) return moinsDeCent(r);
  const cent = c === 1 ? "cent" : UNITES[c] + " cent" + (r === 0 ? "s" : "");
  return r === 0 ? cent : cent + " " + moinsDeCent(r);
}

export function nombreEnLettres(n: number): string {
  n = Math.floor(Math.abs(n));
  if (n === 0) return "zéro";
  const parties: string[] = [];
  const millions = Math.floor(n / 1_000_000);
  const milliers = Math.floor((n % 1_000_000) / 1000);
  const reste = n % 1000;
  if (millions) parties.push(millions === 1 ? "un million" : moinsDeMille(millions) + " millions");
  if (milliers) parties.push(milliers === 1 ? "mille" : moinsDeMille(milliers) + " mille");
  if (reste) parties.push(moinsDeMille(reste));
  return parties.join(" ");
}

export function montantEnLettres(x: number): string {
  const euros = Math.floor(Math.abs(x));
  const centimes = Math.round((Math.abs(x) - euros) * 100);
  let s = nombreEnLettres(euros) + (euros > 1 ? " euros" : " euro");
  if (centimes) s += " et " + nombreEnLettres(centimes) + (centimes > 1 ? " centimes" : " centime");
  return s;
}
