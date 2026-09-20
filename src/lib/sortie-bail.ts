import type { OrigineConge, TypeBail } from "@prisma/client";
import { ajouterJours, ajouterMois, differenceMois } from "./dates";
import { arrondir2, somme } from "./montants";

/**
 * Sortie du locataire et dépôt de garantie.
 * Préavis : 3 mois pour un logement vide (1 mois en zone tendue ou cas de l'article 15 I), 1 mois en meublé et en bail mobilité,
 * 6 mois pour un bail commercial ou professionnel. Congé du bailleur : 6 mois en logement vide, 3 mois en meublé.
 * Restitution du dépôt de garantie (article 22 de la loi du 6 juillet 1989) : 1 mois si l'état des lieux de sortie est conforme
 * à celui d'entrée, 2 mois sinon ; à défaut, le solde est majoré de 10 % du loyer mensuel hors charges par mois de retard commencé.
 */

export const MOTIFS_PREAVIS_REDUIT = [
  "Logement situé en zone tendue",
  "Mutation professionnelle",
  "Perte d'emploi",
  "Nouvel emploi consécutif à une perte d'emploi",
  "Obtention d'un premier emploi",
  "État de santé justifiant un changement de domicile",
  "Bénéficiaire du RSA ou de l'AAH",
  "Attribution d'un logement social",
  "Violences au sein du couple",
] as const;

export const MOTIFS_CONGE_BAILLEUR = ["Reprise pour habiter", "Vente du logement", "Motif légitime et sérieux"] as const;

/** Préavis légal en mois, selon le type de bail et l'auteur du congé. */
export function preavisMois(type: TypeBail, origine: OrigineConge, preavisReduit = false): number {
  if (origine === "BAILLEUR") {
    switch (type) {
      case "NON_MEUBLE":
        return 6;
      case "MEUBLE":
        return 3;
      case "COMMERCIAL":
      case "PROFESSIONNEL":
        return 6;
      default:
        return 0;
    }
  }
  switch (type) {
    case "NON_MEUBLE":
      return preavisReduit ? 1 : 3;
    case "MEUBLE":
    case "MOBILITE":
      return 1;
    case "COMMERCIAL":
    case "PROFESSIONNEL":
      return 6;
    default:
      return 0;
  }
}

/** Dernier jour du préavis : le congé court à compter de sa réception (art. 15 I de la loi du 6 juillet 1989). */
export function finPreavis(congeRecuLe: Date, mois: number): Date {
  return ajouterJours(ajouterMois(congeRecuLe, mois), -1);
}

/** Délai légal de restitution du dépôt, en mois, selon la conformité de l'état des lieux de sortie. */
export function delaiRestitutionMois(etatLieuxConforme: boolean | null | undefined): number {
  return etatLieuxConforme === false ? 2 : 1;
}

/** Date limite de restitution du dépôt de garantie à compter de la remise des clés. */
export function dateLimiteRestitution(departLe: Date, etatLieuxConforme: boolean | null | undefined): Date {
  return ajouterMois(departLe, delaiRestitutionMois(etatLieuxConforme));
}

/**
 * Majoration due au locataire en cas de restitution tardive : 10 % du loyer mensuel hors charges
 * par mois de retard commencé (article 22 de la loi du 6 juillet 1989).
 */
export function majorationRetard(soldeRestituable: number, loyerHC: number, dateLimite: Date, dateRestitution: Date): number {
  if (soldeRestituable <= 0 || dateRestitution.getTime() <= dateLimite.getTime()) return 0;
  const moisEntiers = differenceMois(dateLimite, dateRestitution);
  const moisCommences = moisEntiers + (ajouterMois(dateLimite, moisEntiers).getTime() < dateRestitution.getTime() ? 1 : 0);
  return arrondir2(loyerHC * 0.1 * Math.max(moisCommences, 1));
}

export type Retenue = { libelle: string; montant: number };

export type SoldeDepot = {
  /** Dépôt effectivement encaissé (à défaut, le montant prévu au bail). */
  recu: number;
  retenues: number;
  /** Loyers, charges ou régularisations restant dus au départ. */
  impayes: number;
  /** Solde à restituer au locataire (0 si les retenues dépassent le dépôt). */
  restituable: number;
  /** Somme restant due par le locataire lorsque les retenues dépassent le dépôt. */
  resteDuParLocataire: number;
  restitue: number;
  /** Ce qu'il reste à verser au locataire. */
  aVerser: number;
};

/** Décompte de restitution du dépôt de garantie (solde de tout compte). */
export function soldeDepot(
  bail: { depotGarantie: number; depotRecuMontant?: number | null; depotRecuLe?: Date | null; depotRestitueMontant?: number | null },
  retenues: Retenue[] = [],
  impayes = 0,
): SoldeDepot {
  const recu = arrondir2(bail.depotRecuLe ? (bail.depotRecuMontant ?? bail.depotGarantie) : (bail.depotRecuMontant ?? 0));
  const totalRetenues = arrondir2(somme(retenues.map((r) => r.montant)));
  const impayesArrondis = arrondir2(impayes);
  const net = arrondir2(recu - totalRetenues - impayesArrondis);
  const restitue = arrondir2(bail.depotRestitueMontant ?? 0);
  return {
    recu,
    retenues: totalRetenues,
    impayes: impayesArrondis,
    restituable: Math.max(net, 0),
    resteDuParLocataire: net < 0 ? arrondir2(-net) : 0,
    restitue,
    aVerser: arrondir2(Math.max(net, 0) - restitue),
  };
}

export type EtapeSortie = { cle: "conge" | "etatLieux" | "cloture" | "depot"; libelle: string; faite: boolean; detail: string | null };

/** Étapes de la sortie du locataire, dans l'ordre : congé reçu, état des lieux, clôture du bail, dépôt restitué. */
export function etapesSortie(bail: {
  congeRecuLe: Date | null;
  congeDateDepart: Date | null;
  etatLieuxSortieLe: Date | null;
  dateFinEffective: Date | null;
  statut: string;
  depotRestitueLe: Date | null;
  depotRecuLe: Date | null;
}): EtapeSortie[] {
  return [
    { cle: "conge", libelle: "Congé reçu", faite: !!bail.congeRecuLe, detail: bail.congeDateDepart ? "départ annoncé" : null },
    { cle: "etatLieux", libelle: "État des lieux de sortie", faite: !!bail.etatLieuxSortieLe, detail: null },
    { cle: "cloture", libelle: "Bail clôturé", faite: bail.statut === "TERMINE" && !!bail.dateFinEffective, detail: null },
    { cle: "depot", libelle: "Dépôt de garantie restitué", faite: !!bail.depotRestitueLe, detail: bail.depotRecuLe ? null : "aucun dépôt encaissé" },
  ];
}
