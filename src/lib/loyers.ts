import type { StatutBail, TypeBail } from "@prisma/client";
import {
  ajouterJours,
  comparerPeriodes,
  debutMois,
  differenceJours,
  finMois,
  jourUTC,
  joursDansMois,
  maxDate,
  minDate,
  parsePeriode,
  periodeDe,
  periodeSuivante,
} from "./dates";
import { arrondir2, somme } from "./montants";
import { bailADureeFixe } from "./bail-regles";
import { montantTva } from "./tva";

export type BailPourAppels = {
  id: number;
  type: TypeBail;
  statut: StatutBail;
  dateDebut: Date;
  dateFin: Date;
  dateFinEffective: Date | null;
  loyerHC: number;
  charges: number;
  jourEcheance: number;
  /** Taux de TVA du bail (0 = exonéré) ; absent pour les anciens objets. */
  tauxTva?: number;
};

export type AppelCalcule = {
  periode: string;
  debutPeriode: Date;
  finPeriode: Date;
  /** Loyer et charges hors taxes, TVA, total toutes taxes comprises. */
  loyer: number;
  charges: number;
  tauxTva: number;
  montantTva: number;
  total: number;
  prorata: boolean;
  dateEcheance: Date;
};

/**
 * Dernier jour de location connu. `null` signifie « sans fin connue » :
 * les baux reconductibles (habitation, commercial, professionnel) continuent tant qu'ils ne sont pas clôturés ;
 * les baux à durée fixe (mobilité, saisonnier) s'arrêtent à leur date de fin.
 */
export function finLocation(bail: Pick<BailPourAppels, "type" | "statut" | "dateFin" | "dateFinEffective">): Date | null {
  if (bail.dateFinEffective) return bail.dateFinEffective;
  if (bail.statut === "TERMINE") return bail.dateFin;
  if (bailADureeFixe(bail.type)) return bail.dateFin;
  return null;
}

export function bailGenereDesAppels(bail: Pick<BailPourAppels, "statut">): boolean {
  return bail.statut === "SIGNE" || bail.statut === "TERMINE";
}

/**
 * Périodes (AAAA-MM) pour lesquelles un appel de loyer doit exister à la date donnée.
 * L'appel du mois M est émis `joursAvance` jours avant le 1er du mois M.
 */
export function periodesAGenerer(bail: BailPourAppels, aujourdhui: Date, joursAvance: number): string[] {
  if (!bailGenereDesAppels(bail)) return [];
  const fin = finLocation(bail);
  if (fin && fin.getTime() < bail.dateDebut.getTime()) return [];

  const premiere = periodeDe(bail.dateDebut);
  let derniere = periodeDe(ajouterJours(aujourdhui, joursAvance));
  if (fin) {
    const periodeFin = periodeDe(fin);
    if (comparerPeriodes(periodeFin, derniere) < 0) derniere = periodeFin;
  }

  const periodes: string[] = [];
  let p = premiere;
  while (comparerPeriodes(p, derniere) <= 0 && periodes.length < 1200) {
    periodes.push(p);
    p = periodeSuivante(p);
  }
  return periodes;
}

/** Montants d'un appel pour une période, avec prorata temporis en début et fin de bail. */
export function calculerAppel(bail: BailPourAppels, periode: string): AppelCalcule {
  const fin = finLocation(bail);
  const debutPeriode = maxDate(debutMois(periode), bail.dateDebut);
  const finPeriode = fin ? minDate(finMois(periode), fin) : finMois(periode);
  const joursOccupes = differenceJours(debutPeriode, finPeriode) + 1;
  const joursMois = joursDansMois(periode);
  const prorata = joursOccupes < joursMois;
  const ratio = prorata ? joursOccupes / joursMois : 1;
  const loyer = arrondir2(bail.loyerHC * ratio);
  const charges = arrondir2(bail.charges * ratio);
  const tauxTva = bail.tauxTva ?? 0;
  const tva = montantTva(arrondir2(loyer + charges), tauxTva);
  const { annee, mois } = parsePeriode(periode);
  const jour = Math.min(Math.max(bail.jourEcheance || 1, 1), joursMois);
  let dateEcheance = jourUTC(annee, mois, jour);
  if (dateEcheance.getTime() < debutPeriode.getTime()) dateEcheance = debutPeriode;
  return { periode, debutPeriode, finPeriode, loyer, charges, tauxTva, montantTva: tva, total: arrondir2(loyer + charges + tva), prorata, dateEcheance };
}

export type StatutAppel = "PAYE" | "PARTIEL" | "A_PAYER" | "EN_RETARD";

export const STATUTS_APPEL: Record<StatutAppel, string> = {
  PAYE: "Payé",
  PARTIEL: "Partiellement payé",
  A_PAYER: "À payer",
  EN_RETARD: "En retard",
};

export function etatAppel(
  appel: { total: number; dateEcheance: Date; paiements: { montant: number }[] },
  aujourdhui: Date,
): { regle: number; reste: number; statut: StatutAppel } {
  const regle = somme(appel.paiements.map((p) => p.montant));
  const reste = arrondir2(appel.total - regle);
  let statut: StatutAppel;
  if (reste <= 0) statut = "PAYE";
  else if (aujourdhui.getTime() > appel.dateEcheance.getTime()) statut = "EN_RETARD";
  else if (regle > 0) statut = "PARTIEL";
  else statut = "A_PAYER";
  return { regle, reste, statut };
}

/** Numéro lisible d'un appel de loyer ou d'une quittance. */
export function numeroAppel(id: number): string {
  return `AL-${String(id).padStart(6, "0")}`;
}

export function numeroQuittance(id: number): string {
  return `Q-${String(id).padStart(6, "0")}`;
}
