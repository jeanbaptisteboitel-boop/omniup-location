import type { CategorieDepense, TypeBail, TypeLot } from "@prisma/client";
import { arrondir2 } from "./montants";
import { usageHabitation } from "./tva";

/**
 * Aide au remplissage de la déclaration des revenus fonciers n° 2044 (régime réel), à partir des encaissements et des dépenses
 * de l'année. Une colonne du formulaire (« immeuble ») correspond à un immeuble de l'application (tous ses lots) ou à un lot isolé.
 * Seules les locations nues relèvent des revenus fonciers : les locations meublées (meublé, mobilité, saisonnier) sont des BIC
 * et sont écartées, avec leurs montants, dans la rubrique « hors champ ».
 */

export const LIGNES_2044 = ["211", "212", "213", "214", "215", "221", "222", "223", "224", "224bis", "225", "226", "227", "228", "229", "230", "240", "250", "261", "262", "263"] as const;
export type Ligne2044 = (typeof LIGNES_2044)[number];

export const LIBELLES_2044: Record<Ligne2044, string> = {
  "211": "Loyers (ou fermages) bruts encaissés",
  "212": "Dépenses mises par convention à la charge des locataires",
  "213": "Recettes brutes diverses (subventions Anah, indemnités d'assurance…)",
  "214": "Valeur locative réelle des propriétés dont vous vous réservez la jouissance",
  "215": "Total des recettes (lignes 211 à 214)",
  "221": "Frais d'administration et de gestion",
  "222": "Autres frais de gestion : 20 € par local",
  "223": "Primes d'assurance",
  "224": "Dépenses de réparation, d'entretien et d'amélioration",
  "224bis": "Travaux de rénovation énergétique (en cas d'option)",
  "225": "Charges récupérables non récupérées au départ du locataire",
  "226": "Indemnités d'éviction, frais de relogement",
  "227": "Taxes foncières, taxes annexes",
  "228": "Déductions spécifiques",
  "229": "Provisions pour charges de copropriété payées dans l'année",
  "230": "Régularisation des provisions pour charges déduites au titre de l'année précédente",
  "240": "Total des frais et charges (lignes 221 à 229 – ligne 230)",
  "250": "Intérêts d'emprunt (rubrique 410)",
  "261": "Ligne 215 – ligne 240 – ligne 250",
  "262": "Réintégration du supplément de déduction",
  "263": "Bénéfice (+) ou déficit (–) : ligne 261 + ligne 262",
};

/** Lignes que l'application ne peut pas calculer : à compléter à la main le cas échéant. */
export const LIGNES_A_COMPLETER: Ligne2044[] = ["212", "213", "214", "224bis", "225", "226", "228", "230", "262"];

/** Plafond d'imputation du déficit foncier sur le revenu global (CGI, art. 156 I 3°). */
export const PLAFOND_DEFICIT_REVENU_GLOBAL = 10_700;
/** Seuil du régime micro-foncier (CGI, art. 32) et abattement forfaitaire. */
export const SEUIL_MICRO_FONCIER = 15_000;
export const ABATTEMENT_MICRO_FONCIER = 0.3;
export const FORFAIT_PAR_LOCAL = 20;

export type LotEntree = { id: number; nom: string; adresse: string; codePostal: string; ville: string; type: TypeLot; meuble: boolean; immeubleId: number | null };
export type ImmeubleEntree = { id: number; nom: string; adresse: string; codePostal: string; ville: string };
export type PaiementEntree = { montant: number; appel: { loyer: number; charges: number; montantTva: number; total: number }; bail: { type: TypeBail; lotId: number } };
export type BailEntree = { type: TypeBail; lotId: number };
export type DepenseEntree = { date: Date; libelle: string; categorie: CategorieDepense; montant: number; fournisseur: string | null; lotId: number | null; immeubleId: number | null };
export type EcheanceEntree = { date: Date; interets: number; assurance: number; emprunt: { id: number; libelle: string; banque: string | null; dateDebut: Date | null; lotId: number | null; immeubleId: number | null } };

export type Donnees2044 = {
  annee: number;
  lots: LotEntree[];
  immeubles: ImmeubleEntree[];
  /** Paiements encaissés dans l'année. */
  paiements: PaiementEntree[];
  /** Baux signés ou terminés ayant couru sur l'année (détermine le régime, foncier ou BIC, de chaque lot). */
  baux: BailEntree[];
  depenses: DepenseEntree[];
  echeances: EcheanceEntree[];
};

export type Travaux2044 = { date: Date; libelle: string; fournisseur: string | null; montant: number; categorie: CategorieDepense; bien: string };
export type Interets2044 = { emprunt: string; banque: string | null; dateDebut: Date | null; interets: number; assurance: number; bien: string };

export type Colonne2044 = {
  numero: number;
  cle: string;
  nom: string;
  adresse: string;
  lots: { id: number; nom: string; type: TypeLot }[];
  nombreLocaux: number;
  /** Montants exacts (centimes). */
  lignes: Record<Ligne2044, number>;
  /** Montants à inscrire sur le formulaire (euros entiers, sous-totaux recalculés sur les lignes arrondies). */
  cases: Record<Ligne2044, number>;
  chargesRecuperables: number;
  tvaCollectee: number;
  travaux: Travaux2044[];
  interets: Interets2044[];
  notes: string[];
};

export type Resultat2044 = {
  annee: number;
  colonnes: Colonne2044[];
  total: Record<Ligne2044, number>;
  totalCases: Record<Ligne2044, number>;
  horsChamp: { lots: { id: number; nom: string; loyers: number; depenses: number }[]; loyers: number; depenses: number };
  depensesNonAffectees: { date: Date; libelle: string; montant: number; bien: string | null }[];
  resultat: {
    ligne420: number;
    ligne431: number;
    ligne432: number;
    ligne433: number;
    cases: { "4BA"?: number; "4BB"?: number; "4BC"?: number };
    etapes: { ligne: string; libelle: string; montant: number }[];
  };
  microFoncier: { eligible: boolean; recettesBrutes: number; revenuNetMicro: number; revenuNetReel: number };
  chargesRecuperables: number;
  tvaCollectee: number;
};

const LIGNES_DEPENSE: Partial<Record<CategorieDepense, Ligne2044>> = {
  GESTION_LOCATIVE: "221",
  ASSURANCE_PNO: "223",
  REPARATION_ENTRETIEN: "224",
  AMELIORATION: "224",
  TAXE_FONCIERE: "227",
  COPROPRIETE: "229",
  INTERETS_EMPRUNT: "250",
};

export function lignesVides(): Record<Ligne2044, number> {
  return Object.fromEntries(LIGNES_2044.map((l) => [l, 0])) as Record<Ligne2044, number>;
}

/** Location nue relevant des revenus fonciers (les locations meublées relèvent des BIC). */
export function bailRevenusFonciers(type: TypeBail): boolean {
  return type === "NON_MEUBLE" || type === "COMMERCIAL" || type === "PROFESSIONNEL";
}

/** Régime d'un lot pour l'année : revenus fonciers dès qu'il a été loué nu ; BIC s'il n'a été loué que meublé ou s'il est meublé sans bail. */
export function regimeLot(lot: Pick<LotEntree, "meuble">, baux: BailEntree[]): "FONCIER" | "BIC" {
  if (baux.some((b) => bailRevenusFonciers(b.type))) return "FONCIER";
  if (baux.length > 0) return "BIC";
  return lot.meuble ? "BIC" : "FONCIER";
}

function adresseDe(a: { adresse: string; codePostal: string; ville: string }): string {
  return `${a.adresse}, ${a.codePostal} ${a.ville}`;
}

/** Sous-totaux du formulaire à partir des lignes de détail (exactes ou arrondies). */
function totaliser(l: Record<Ligne2044, number>, arrondi: (x: number) => number): Record<Ligne2044, number> {
  const r = { ...l };
  r["215"] = arrondi(r["211"] + r["212"] + r["213"] + r["214"]);
  r["240"] = arrondi(r["221"] + r["222"] + r["223"] + r["224"] + r["224bis"] + r["225"] + r["226"] + r["227"] + r["228"] + r["229"] - r["230"]);
  r["261"] = arrondi(r["215"] - r["240"] - r["250"]);
  r["263"] = arrondi(r["261"] + r["262"]);
  return r;
}

function casesDe(lignes: Record<Ligne2044, number>): Record<Ligne2044, number> {
  const arrondies = { ...lignes };
  for (const l of LIGNES_2044) arrondies[l] = Math.round(lignes[l]);
  return totaliser(arrondies, Math.round);
}

export function construire2044(d: Donnees2044): Resultat2044 {
  const bauxParLot = new Map<number, BailEntree[]>();
  for (const b of d.baux) bauxParLot.set(b.lotId, [...(bauxParLot.get(b.lotId) ?? []), b]);
  const lotsParId = new Map(d.lots.map((l) => [l.id, l]));
  const immeublesParId = new Map(d.immeubles.map((i) => [i.id, i]));
  const regimes = new Map<number, "FONCIER" | "BIC">();
  for (const lot of d.lots) regimes.set(lot.id, regimeLot(lot, bauxParLot.get(lot.id) ?? []));

  // Colonnes : un immeuble = une colonne (ses lots fonciers), un lot isolé = une colonne.
  const colonnes = new Map<string, Colonne2044>();
  const cleDuLot = (lot: LotEntree) => (lot.immeubleId && immeublesParId.has(lot.immeubleId) ? `immeuble:${lot.immeubleId}` : `lot:${lot.id}`);
  const colonne = (cle: string): Colonne2044 => {
    let c = colonnes.get(cle);
    if (c) return c;
    if (cle.startsWith("immeuble:")) {
      const im = immeublesParId.get(Number(cle.slice(9)))!;
      c = { numero: 0, cle, nom: im.nom, adresse: adresseDe(im), lots: [], nombreLocaux: 0, lignes: lignesVides(), cases: lignesVides(), chargesRecuperables: 0, tvaCollectee: 0, travaux: [], interets: [], notes: [] };
    } else {
      const lot = lotsParId.get(Number(cle.slice(4)))!;
      c = { numero: 0, cle, nom: lot.nom, adresse: adresseDe(lot), lots: [], nombreLocaux: 0, lignes: lignesVides(), cases: lignesVides(), chargesRecuperables: 0, tvaCollectee: 0, travaux: [], interets: [], notes: [] };
    }
    colonnes.set(cle, c);
    return c;
  };
  for (const lot of d.lots) if (regimes.get(lot.id) === "FONCIER") colonne(cleDuLot(lot)).lots.push({ id: lot.id, nom: lot.nom, type: lot.type });

  const horsChamp = new Map<number, { id: number; nom: string; loyers: number; depenses: number }>();
  const hc = (lot: LotEntree) => {
    let h = horsChamp.get(lot.id);
    if (!h) horsChamp.set(lot.id, (h = { id: lot.id, nom: lot.nom, loyers: 0, depenses: 0 }));
    return h;
  };
  const depensesNonAffectees: Resultat2044["depensesNonAffectees"] = [];
  const locauxLoues = new Map<string, Set<number>>();

  // Recettes : loyers hors charges encaissés ; les provisions sur charges et la TVA collectée ne sont pas des recettes.
  for (const p of d.paiements) {
    const lot = lotsParId.get(p.bail.lotId);
    if (!lot) continue;
    const partLoyer = p.appel.total > 0 ? p.montant * (p.appel.loyer / p.appel.total) : p.montant;
    const partTva = p.appel.total > 0 ? p.montant * (p.appel.montantTva / p.appel.total) : 0;
    const partCharges = p.montant - partLoyer - partTva;
    if (!bailRevenusFonciers(p.bail.type) || regimes.get(lot.id) === "BIC") {
      hc(lot).loyers += partLoyer + partCharges;
      continue;
    }
    const c = colonne(cleDuLot(lot));
    c.lignes["211"] += partLoyer;
    c.chargesRecuperables += partCharges;
    c.tvaCollectee += partTva;
    if (!locauxLoues.has(c.cle)) locauxLoues.set(c.cle, new Set());
    locauxLoues.get(c.cle)!.add(lot.id);
  }

  // Dépenses : ventilées par ligne selon la catégorie ; celles des lots meublés sont hors champ ; « autre » à affecter à la main.
  for (const dep of d.depenses) {
    const lot = dep.lotId ? lotsParId.get(dep.lotId) : undefined;
    const immeuble = dep.immeubleId ? immeublesParId.get(dep.immeubleId) : undefined;
    if (lot && regimes.get(lot.id) === "BIC") {
      hc(lot).depenses += dep.montant;
      continue;
    }
    const cle = lot ? cleDuLot(lot) : immeuble ? `immeuble:${immeuble.id}` : null;
    const ligne = LIGNES_DEPENSE[dep.categorie];
    if (!cle || !ligne) {
      depensesNonAffectees.push({ date: dep.date, libelle: dep.libelle, montant: dep.montant, bien: lot?.nom ?? immeuble?.nom ?? null });
      continue;
    }
    const c = colonne(cle);
    c.lignes[ligne] += dep.montant;
    if (ligne === "224") {
      c.travaux.push({ date: dep.date, libelle: dep.libelle, fournisseur: dep.fournisseur, montant: dep.montant, categorie: dep.categorie, bien: lot?.nom ?? immeuble?.nom ?? c.nom });
      if (dep.categorie === "AMELIORATION" && lot && (lot.type === "LOCAL_COMMERCIAL" || lot.type === "LOCAL_PROFESSIONNEL")) {
        c.notes.push(`Dépense d'amélioration « ${dep.libelle} » sur un local commercial ou professionnel : non déductible en principe (sauf amiante, accessibilité) ; à vérifier avant de la retenir ligne 224.`);
      }
    }
    if (ligne === "250") c.interets.push({ emprunt: dep.libelle, banque: dep.fournisseur, dateDebut: null, interets: dep.montant, assurance: 0, bien: lot?.nom ?? immeuble?.nom ?? c.nom });
  }

  // Intérêts d'emprunt et assurance emprunteur, d'après les échéanciers.
  const interetsParEmprunt = new Map<string, Interets2044 & { colonne: Colonne2044 }>();
  for (const e of d.echeances) {
    const lot = e.emprunt.lotId ? lotsParId.get(e.emprunt.lotId) : undefined;
    const immeuble = e.emprunt.immeubleId ? immeublesParId.get(e.emprunt.immeubleId) : undefined;
    if (lot && regimes.get(lot.id) === "BIC") {
      hc(lot).depenses += e.interets + e.assurance;
      continue;
    }
    const cle = lot ? cleDuLot(lot) : immeuble ? `immeuble:${immeuble.id}` : null;
    if (!cle) continue;
    const c = colonne(cle);
    c.lignes["250"] += e.interets + e.assurance;
    const k = `${cle}|${e.emprunt.id}`;
    let agg = interetsParEmprunt.get(k);
    if (!agg) interetsParEmprunt.set(k, (agg = { emprunt: e.emprunt.libelle, banque: e.emprunt.banque, dateDebut: e.emprunt.dateDebut, interets: 0, assurance: 0, bien: lot?.nom ?? immeuble?.nom ?? c.nom, colonne: c }));
    agg.interets += e.interets;
    agg.assurance += e.assurance;
  }
  for (const agg of interetsParEmprunt.values()) {
    const { colonne: c, ...reste } = agg;
    c.interets.push({ ...reste, interets: arrondir2(reste.interets), assurance: arrondir2(reste.assurance) });
  }

  // Finalisation des colonnes : forfait de 20 € par local loué, arrondis, sous-totaux, numérotation.
  const ordre = Array.from(colonnes.values()).sort((a, b) => a.nom.localeCompare(b.nom, "fr"));
  const total = lignesVides();
  const retenues: Colonne2044[] = [];
  for (const c of ordre) {
    c.nombreLocaux = locauxLoues.get(c.cle)?.size ?? 0;
    c.lignes["222"] = FORFAIT_PAR_LOCAL * c.nombreLocaux;
    for (const l of LIGNES_2044) c.lignes[l] = arrondir2(c.lignes[l]);
    c.lignes = totaliser(c.lignes, arrondir2);
    c.cases = casesDe(c.lignes);
    c.chargesRecuperables = arrondir2(c.chargesRecuperables);
    c.tvaCollectee = arrondir2(c.tvaCollectee);
    if (c.tvaCollectee > 0) c.notes.push(`Loyers soumis à la TVA : les montants sont retenus hors taxes ; TVA collectée ${c.tvaCollectee.toFixed(2).replace(".", ",")} € à déclarer sur la CA3/CA12, hors revenus fonciers.`);
    if (c.lignes["227"] > 0) c.notes.push("Taxe foncière : la taxe d'enlèvement des ordures ménagères, récupérable sur le locataire, n'est pas déductible ; retirez-la du montant si elle y figure.");
    const actif = LIGNES_2044.some((l) => c.lignes[l] !== 0) || c.travaux.length > 0;
    if (!actif) continue;
    c.numero = retenues.length + 1;
    retenues.push(c);
    for (const l of LIGNES_2044) total[l] = arrondir2(total[l] + c.lignes[l]);
  }
  const totalCases = lignesVides();
  for (const c of retenues) for (const l of LIGNES_2044) totalCases[l] += c.cases[l];

  // Résultat et report sur la 2042 (cadre 420-442).
  const ligne420 = totalCases["263"];
  const ligne431 = totalCases["215"];
  const ligne432 = totalCases["250"];
  const ligne433 = totalCases["240"];
  const cases: Resultat2044["resultat"]["cases"] = {};
  const etapes: Resultat2044["resultat"]["etapes"] = [
    { ligne: "420", libelle: "Résultat : bénéfice ou déficit total", montant: ligne420 },
  ];
  if (ligne420 >= 0) {
    cases["4BA"] = ligne420;
  } else {
    etapes.push({ ligne: "431", libelle: "Total des revenus bruts", montant: ligne431 }, { ligne: "432", libelle: "Total des intérêts d'emprunt", montant: ligne432 }, { ligne: "433", libelle: "Total des autres frais et charges", montant: ligne433 });
    if (ligne432 > ligne431) {
      const l436 = Math.min(ligne433, PLAFOND_DEFICIT_REVENU_GLOBAL);
      const l437 = ligne433 - l436;
      const l438 = ligne432 - ligne431;
      etapes.push(
        { ligne: "436", libelle: `Report de la ligne 433 dans la limite de ${PLAFOND_DEFICIT_REVENU_GLOBAL} € (imputable sur le revenu global)`, montant: l436 },
        { ligne: "437", libelle: "Report de la ligne 433 pour son montant supérieur à la ligne 436", montant: l437 },
        { ligne: "438", libelle: "Différence ligne 432 – ligne 431 (intérêts excédant les revenus bruts)", montant: l438 },
        { ligne: "439", libelle: "Total 437 + 438 (imputable sur les revenus fonciers des 10 années suivantes)", montant: l437 + l438 },
      );
      cases["4BC"] = l436;
      cases["4BB"] = l437 + l438;
    } else {
      const deficit = -ligne420;
      const l441 = Math.min(deficit, PLAFOND_DEFICIT_REVENU_GLOBAL);
      etapes.push(
        { ligne: "441", libelle: `Report de la ligne 420 dans la limite de ${PLAFOND_DEFICIT_REVENU_GLOBAL} € (imputable sur le revenu global)`, montant: l441 },
        { ligne: "442", libelle: "Report de la ligne 420 pour son montant supérieur à la ligne 441 (imputable sur les revenus fonciers des 10 années suivantes)", montant: deficit - l441 },
      );
      cases["4BC"] = l441;
      cases["4BB"] = deficit - l441;
    }
  }

  const horsChampListe = Array.from(horsChamp.values()).map((h) => ({ ...h, loyers: arrondir2(h.loyers), depenses: arrondir2(h.depenses) })).filter((h) => h.loyers !== 0 || h.depenses !== 0);
  const recettesBrutes = totalCases["215"];
  return {
    annee: d.annee,
    colonnes: retenues,
    total,
    totalCases,
    horsChamp: { lots: horsChampListe, loyers: arrondir2(horsChampListe.reduce((s, h) => s + h.loyers, 0)), depenses: arrondir2(horsChampListe.reduce((s, h) => s + h.depenses, 0)) },
    depensesNonAffectees,
    resultat: { ligne420, ligne431, ligne432, ligne433, cases, etapes },
    microFoncier: { eligible: recettesBrutes > 0 && recettesBrutes <= SEUIL_MICRO_FONCIER, recettesBrutes, revenuNetMicro: Math.round(recettesBrutes * (1 - ABATTEMENT_MICRO_FONCIER)), revenuNetReel: ligne420 },
    chargesRecuperables: arrondir2(retenues.reduce((s, c) => s + c.chargesRecuperables, 0)),
    tvaCollectee: arrondir2(retenues.reduce((s, c) => s + c.tvaCollectee, 0)),
  };
}
