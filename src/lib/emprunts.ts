import { ajouterMois, jourUTC, parseDateISO } from "./dates";
import { arrondir2, parseMontant, somme } from "./montants";

export type LigneEcheance = {
  date: Date;
  capital: number;
  interets: number;
  assurance: number;
  total: number;
  capitalRestant: number | null;
};

/** Tableau d'amortissement à mensualités constantes (hors assurance). */
export function genererEcheancier(p: {
  montant: number;
  tauxAnnuel: number;
  dureeMois: number;
  dateDebut: Date;
  assuranceMensuelle?: number | null;
}): LigneEcheance[] {
  if (p.montant <= 0 || p.dureeMois <= 0) return [];
  const t = p.tauxAnnuel / 100 / 12;
  const n = p.dureeMois;
  const mensualite = t === 0 ? p.montant / n : (p.montant * t) / (1 - Math.pow(1 + t, -n));
  const assurance = arrondir2(p.assuranceMensuelle ?? 0);
  let restant = p.montant;
  const lignes: LigneEcheance[] = [];
  for (let i = 0; i < n; i++) {
    const interets = arrondir2(restant * t);
    let capital = arrondir2(mensualite - interets);
    if (i === n - 1 || capital > restant) capital = arrondir2(restant);
    restant = arrondir2(restant - capital);
    lignes.push({
      date: ajouterMois(p.dateDebut, i),
      capital,
      interets,
      assurance,
      total: arrondir2(capital + interets + assurance),
      capitalRestant: restant,
    });
  }
  return lignes;
}

export function totauxParAnnee(echeances: LigneEcheance[], annee: number): { capital: number; interets: number; assurance: number; total: number } {
  const lignes = echeances.filter((e) => e.date.getUTCFullYear() === annee);
  return {
    capital: somme(lignes.map((l) => l.capital)),
    interets: somme(lignes.map((l) => l.interets)),
    assurance: somme(lignes.map((l) => l.assurance)),
    total: somme(lignes.map((l) => l.total)),
  };
}

// ---------------------------------------------------------------------------
// Import de fichiers CSV / Excel
// ---------------------------------------------------------------------------

export const COLONNES = ["date", "capital", "interets", "assurance", "total", "capitalRestant"] as const;
export type Colonne = (typeof COLONNES)[number];

export const LIBELLES_COLONNES: Record<Colonne, string> = {
  date: "Date d'échéance",
  capital: "Capital amorti",
  interets: "Intérêts",
  assurance: "Assurance",
  total: "Montant de l'échéance",
  capitalRestant: "Capital restant dû",
};

export type Mapping = Partial<Record<Colonne, number>>;

export type Cellule = string | number | Date | null;

export function normaliserTexte(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** Propose une correspondance colonne → index à partir des en-têtes. */
export function detecterColonnes(entetes: Cellule[]): Mapping {
  const noms = entetes.map((e) => (e === null || e === undefined ? "" : normaliserTexte(String(e))));
  const mapping: Mapping = {};
  const trouver = (pred: (n: string) => boolean): number | undefined => {
    const i = noms.findIndex((n, idx) => n !== "" && pred(n) && !Object.values(mapping).includes(idx));
    return i === -1 ? undefined : i;
  };
  mapping.capitalRestant = trouver((n) => n.includes("restant") || n === "crd" || n.includes("solde") || n.includes("capital du"));
  mapping.interets = trouver((n) => n.includes("interet"));
  mapping.assurance = trouver((n) => n.includes("assurance"));
  mapping.capital = trouver((n) => n.includes("amorti") || n.includes("capital") || n.includes("principal"));
  mapping.date = trouver((n) => n.includes("date") || n === "echeance" || n.startsWith("echeance du") || n.includes("periode") || n === "mois");
  mapping.total = trouver((n) => n.includes("mensualite") || n.includes("total") || n.includes("montant") || n.includes("echeance"));
  for (const c of COLONNES) if (mapping[c] === undefined) delete mapping[c];
  return mapping;
}

/** Détecte le séparateur d'un CSV (; , ou tabulation). */
export function detecterSeparateur(texte: string): string {
  const lignes = texte.split(/\r?\n/).slice(0, 10);
  const scores = { ";": 0, ",": 0, "\t": 0 };
  for (const l of lignes) {
    scores[";"] += (l.match(/;/g) || []).length;
    scores[","] += (l.match(/,/g) || []).length;
    scores["\t"] += (l.match(/\t/g) || []).length;
  }
  return (Object.entries(scores).sort((a, b) => b[1] - a[1])[0]?.[0] as string) || ";";
}

/** Analyse un CSV (guillemets pris en charge) en tableau de cellules texte. */
export function parserCSV(texte: string, separateur?: string): string[][] {
  const sep = separateur ?? detecterSeparateur(texte);
  const lignes: string[][] = [];
  let ligne: string[] = [];
  let cellule = "";
  let entreGuillemets = false;
  const src = texte.replace(/^﻿/, "");
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (entreGuillemets) {
      if (c === '"') {
        if (src[i + 1] === '"') {
          cellule += '"';
          i++;
        } else entreGuillemets = false;
      } else cellule += c;
    } else if (c === '"') {
      entreGuillemets = true;
    } else if (c === sep) {
      ligne.push(cellule);
      cellule = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && src[i + 1] === "\n") i++;
      ligne.push(cellule);
      lignes.push(ligne);
      ligne = [];
      cellule = "";
    } else cellule += c;
  }
  if (cellule !== "" || ligne.length) {
    ligne.push(cellule);
    lignes.push(ligne);
  }
  return lignes.filter((l) => l.some((c) => c.trim() !== ""));
}

/** Date depuis une cellule : Date, numéro de série Excel, ou texte (JJ/MM/AAAA, AAAA-MM-JJ, MM/AAAA…). */
export function parseDateSouple(v: Cellule): Date | null {
  if (v === null || v === undefined || v === "") return null;
  if (v instanceof Date) {
    if (Number.isNaN(v.getTime())) return null;
    // Les dates Excel sont lues à minuit UTC ou locale selon la source : on ne garde que le jour.
    const local = new Date(v.getTime() + 12 * 3600 * 1000);
    return jourUTC(local.getUTCFullYear(), local.getUTCMonth() + 1, local.getUTCDate());
  }
  if (typeof v === "number") {
    if (v > 20000 && v < 80000) {
      // numéro de série Excel (jours depuis le 30/12/1899)
      return new Date(Date.UTC(1899, 11, 30) + Math.round(v) * 86_400_000);
    }
    return null;
  }
  const s = String(v).trim();
  const iso = parseDateISO(s.slice(0, 10));
  if (iso && /^\d{4}-\d{2}-\d{2}/.test(s)) return iso;
  let m = /^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})$/.exec(s);
  if (m) {
    let a = Number(m[3]);
    if (a < 100) a += 2000;
    const d = jourUTC(a, Number(m[2]), Number(m[1]));
    return d.getUTCMonth() === Number(m[2]) - 1 ? d : null;
  }
  m = /^(\d{1,2})[\/.\-](\d{4})$/.exec(s);
  if (m) return jourUTC(Number(m[2]), Number(m[1]), 1);
  return null;
}

export function parseNombreSouple(v: Cellule): number | null {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number") return Number.isFinite(v) ? arrondir2(v) : null;
  if (v instanceof Date) return null;
  return parseMontant(String(v));
}

/** Convertit des lignes (après en-tête) en échéances selon la correspondance de colonnes. */
export function lignesVersEcheances(lignes: Cellule[][], mapping: Mapping): { echeances: LigneEcheance[]; erreurs: string[] } {
  const echeances: LigneEcheance[] = [];
  const erreurs: string[] = [];
  if (mapping.date === undefined) return { echeances, erreurs: ["La colonne de date d'échéance est obligatoire."] };
  if (mapping.interets === undefined) return { echeances, erreurs: ["La colonne des intérêts est obligatoire."] };

  const val = (l: Cellule[], c: Colonne): Cellule => (mapping[c] === undefined ? null : (l[mapping[c]!] ?? null));

  lignes.forEach((l, idx) => {
    const date = parseDateSouple(val(l, "date"));
    const interets = parseNombreSouple(val(l, "interets"));
    let capital = parseNombreSouple(val(l, "capital"));
    const assurance = parseNombreSouple(val(l, "assurance")) ?? 0;
    let total = parseNombreSouple(val(l, "total"));
    const capitalRestant = parseNombreSouple(val(l, "capitalRestant"));

    const vide = interets === null && capital === null && total === null;
    if (!date && vide) return; // ligne de totaux ou ligne vide
    if (!date) {
      erreurs.push(`Ligne ${idx + 2} : date illisible.`);
      return;
    }
    if (interets === null) {
      erreurs.push(`Ligne ${idx + 2} : intérêts illisibles.`);
      return;
    }
    if (capital === null && total !== null) capital = arrondir2(total - interets - assurance);
    if (capital === null) {
      erreurs.push(`Ligne ${idx + 2} : capital amorti illisible.`);
      return;
    }
    if (total === null) total = arrondir2(capital + interets + assurance);
    echeances.push({ date, capital: Math.abs(capital), interets: Math.abs(interets), assurance: Math.abs(assurance), total: Math.abs(total), capitalRestant });
  });

  echeances.sort((a, b) => a.date.getTime() - b.date.getTime());
  return { echeances, erreurs };
}
