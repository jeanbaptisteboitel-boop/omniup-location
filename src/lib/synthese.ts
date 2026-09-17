import "server-only";
import type { CategorieDepense } from "@prisma/client";
import { prisma } from "./prisma";
import { jourUTC } from "./dates";
import { arrondir2, somme } from "./montants";

export type LigneSynthese = {
  cle: string;
  type: "lot" | "immeuble";
  id: number;
  nom: string;
  ville: string;
  bailleur: string | null;
  loyers: number;
  charges: number;
  recettes: number;
  depenses: Record<CategorieDepense, number>;
  totalDepenses: number;
  interets: number;
  assurance: number;
  resultat: number;
};

const CATEGORIES: CategorieDepense[] = ["REPARATION_ENTRETIEN", "AMELIORATION", "GESTION_LOCATIVE", "COPROPRIETE", "ASSURANCE_PNO", "TAXE_FONCIERE", "INTERETS_EMPRUNT", "AUTRE"];

function vide(): Record<CategorieDepense, number> {
  return Object.fromEntries(CATEGORIES.map((c) => [c, 0])) as Record<CategorieDepense, number>;
}

/** Recettes encaissées et dépenses de l'année, bien par bien (lots, puis immeubles pour les dépenses communes). */
export async function calculerSynthese(annee: number): Promise<{ lignes: LigneSynthese[]; total: LigneSynthese; annees: number[] }> {
  const debut = jourUTC(annee, 1, 1);
  const fin = jourUTC(annee + 1, 1, 1);
  const [lots, immeubles, paiements, depenses, echeances, anneesPaiements, anneesDepenses] = await Promise.all([
    prisma.lot.findMany({ orderBy: [{ ville: "asc" }, { nom: "asc" }], include: { bailleur: true } }),
    prisma.immeuble.findMany({ orderBy: { nom: "asc" }, include: { bailleur: true } }),
    prisma.paiement.findMany({ where: { date: { gte: debut, lt: fin } }, include: { appel: { include: { bail: { select: { lotId: true } } } } } }),
    prisma.depense.findMany({ where: { date: { gte: debut, lt: fin } } }),
    prisma.echeanceEmprunt.findMany({ where: { date: { gte: debut, lt: fin } }, include: { emprunt: { select: { lotId: true, immeubleId: true } } } }),
    prisma.paiement.findMany({ select: { date: true }, orderBy: { date: "asc" }, take: 1 }),
    prisma.depense.findMany({ select: { date: true }, orderBy: { date: "asc" }, take: 1 }),
  ]);

  const lignes = new Map<string, LigneSynthese>();
  for (const l of lots) lignes.set(`lot:${l.id}`, { cle: `lot:${l.id}`, type: "lot", id: l.id, nom: l.nom, ville: l.ville, bailleur: l.bailleur?.nom ?? null, loyers: 0, charges: 0, recettes: 0, depenses: vide(), totalDepenses: 0, interets: 0, assurance: 0, resultat: 0 });
  for (const i of immeubles) lignes.set(`immeuble:${i.id}`, { cle: `immeuble:${i.id}`, type: "immeuble", id: i.id, nom: i.nom, ville: i.ville, bailleur: i.bailleur?.nom ?? null, loyers: 0, charges: 0, recettes: 0, depenses: vide(), totalDepenses: 0, interets: 0, assurance: 0, resultat: 0 });

  for (const p of paiements) {
    const ligne = lignes.get(`lot:${p.appel.bail.lotId}`);
    if (!ligne) continue;
    const partLoyer = p.appel.total > 0 ? p.montant * (p.appel.loyer / p.appel.total) : p.montant;
    ligne.loyers += partLoyer;
    ligne.charges += p.montant - partLoyer;
  }
  for (const d of depenses) {
    const ligne = lignes.get(d.lotId ? `lot:${d.lotId}` : `immeuble:${d.immeubleId}`);
    if (!ligne) continue;
    ligne.depenses[d.categorie] += d.montant;
  }
  for (const e of echeances) {
    const ligne = lignes.get(e.emprunt.lotId ? `lot:${e.emprunt.lotId}` : `immeuble:${e.emprunt.immeubleId}`);
    if (!ligne) continue;
    ligne.interets += e.interets;
    ligne.assurance += e.assurance;
  }

  const total: LigneSynthese = { cle: "total", type: "lot", id: 0, nom: "Total", ville: "", bailleur: null, loyers: 0, charges: 0, recettes: 0, depenses: vide(), totalDepenses: 0, interets: 0, assurance: 0, resultat: 0 };
  const resultat: LigneSynthese[] = [];
  for (const ligne of lignes.values()) {
    ligne.loyers = arrondir2(ligne.loyers);
    ligne.charges = arrondir2(ligne.charges);
    ligne.recettes = arrondir2(ligne.loyers + ligne.charges);
    for (const c of CATEGORIES) ligne.depenses[c] = arrondir2(ligne.depenses[c]);
    ligne.totalDepenses = somme(CATEGORIES.map((c) => ligne.depenses[c]));
    ligne.interets = arrondir2(ligne.interets);
    ligne.assurance = arrondir2(ligne.assurance);
    ligne.resultat = arrondir2(ligne.recettes - ligne.totalDepenses - ligne.interets - ligne.assurance);
    const actif = ligne.recettes !== 0 || ligne.totalDepenses !== 0 || ligne.interets !== 0 || ligne.assurance !== 0;
    if (ligne.type === "immeuble" && !actif) continue;
    resultat.push(ligne);
    total.loyers = arrondir2(total.loyers + ligne.loyers);
    total.charges = arrondir2(total.charges + ligne.charges);
    total.recettes = arrondir2(total.recettes + ligne.recettes);
    for (const c of CATEGORIES) total.depenses[c] = arrondir2(total.depenses[c] + ligne.depenses[c]);
    total.totalDepenses = arrondir2(total.totalDepenses + ligne.totalDepenses);
    total.interets = arrondir2(total.interets + ligne.interets);
    total.assurance = arrondir2(total.assurance + ligne.assurance);
    total.resultat = arrondir2(total.resultat + ligne.resultat);
  }

  const anneeCourante = new Date().getFullYear();
  const premiere = Math.min(anneeCourante, anneesPaiements[0]?.date.getUTCFullYear() ?? anneeCourante, anneesDepenses[0]?.date.getUTCFullYear() ?? anneeCourante);
  const annees: number[] = [];
  for (let a = anneeCourante + 1; a >= premiere; a--) annees.push(a);
  return { lignes: resultat, total, annees };
}

export { CATEGORIES as CATEGORIES_SYNTHESE };
