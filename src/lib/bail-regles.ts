import type { TypeBail } from "@prisma/client";
import { ajouterJours, ajouterMois, differenceMois } from "./dates";
import { formatEuros } from "./montants";

/** Règles issues de la loi n° 89-462 du 6 juillet 1989 (titres Ier, Ier bis et Ier ter). */
export type RegleBail = {
  libelle: string;
  resume: string;
  dureeMoisDefaut: number;
  dureeMoisDefautPersonneMorale: number;
  dureeMinMois: number | null;
  dureeMaxMois: number | null;
  /** Dépôt de garantie maximal, en mois de loyer hors charges. */
  depotMaxMois: number;
  preavisLocataire: string;
  preavisBailleur: string;
  chargesForfaitAutorise: boolean;
  chargesForfaitObligatoire: boolean;
  revisionIRL: boolean;
  motifObligatoire: boolean;
  reconductionTacite: boolean;
};

export const REGLES_BAIL: Record<TypeBail, RegleBail> = {
  NON_MEUBLE: {
    libelle: "Bail non meublé (logement vide)",
    resume:
      "Durée de 3 ans (6 ans si le bailleur est une société), reconduction tacite, dépôt de garantie limité à 1 mois de loyer hors charges, charges en provisions régularisées chaque année.",
    dureeMoisDefaut: 36,
    dureeMoisDefautPersonneMorale: 72,
    dureeMinMois: 36,
    dureeMaxMois: null,
    depotMaxMois: 1,
    preavisLocataire: "3 mois (1 mois en zone tendue ou motif légitime)",
    preavisBailleur: "6 mois avant l'échéance (congé pour vente, reprise ou motif légitime et sérieux)",
    chargesForfaitAutorise: false,
    chargesForfaitObligatoire: false,
    revisionIRL: true,
    motifObligatoire: false,
    reconductionTacite: true,
  },
  MEUBLE: {
    libelle: "Bail meublé",
    resume:
      "Durée d'1 an (9 mois pour un étudiant, sans reconduction), reconduction tacite, dépôt de garantie limité à 2 mois de loyer hors charges, charges au forfait ou en provisions.",
    dureeMoisDefaut: 12,
    dureeMoisDefautPersonneMorale: 12,
    dureeMinMois: 12,
    dureeMaxMois: null,
    depotMaxMois: 2,
    preavisLocataire: "1 mois",
    preavisBailleur: "3 mois avant l'échéance (congé pour vente, reprise ou motif légitime et sérieux)",
    chargesForfaitAutorise: true,
    chargesForfaitObligatoire: false,
    revisionIRL: true,
    motifObligatoire: false,
    reconductionTacite: true,
  },
  MOBILITE: {
    libelle: "Bail mobilité",
    resume:
      "Logement meublé loué de 1 à 10 mois à un locataire en formation, études, apprentissage, stage, service civique, mutation ou mission temporaire. Non renouvelable, sans dépôt de garantie, charges obligatoirement au forfait, pas de révision de loyer.",
    dureeMoisDefaut: 6,
    dureeMoisDefautPersonneMorale: 6,
    dureeMinMois: 1,
    dureeMaxMois: 10,
    depotMaxMois: 0,
    preavisLocataire: "1 mois, à tout moment",
    preavisBailleur: "Aucun congé possible : le bail prend fin à son terme",
    chargesForfaitAutorise: true,
    chargesForfaitObligatoire: true,
    revisionIRL: false,
    motifObligatoire: true,
    reconductionTacite: false,
  },
};

/** Date de fin proposée par défaut : début + durée légale − 1 jour. */
export function dateFinParDefaut(type: TypeBail, dateDebut: Date, bailleurPersonneMorale = false): Date {
  const regle = REGLES_BAIL[type];
  const mois = bailleurPersonneMorale ? regle.dureeMoisDefautPersonneMorale : regle.dureeMoisDefaut;
  return ajouterJours(ajouterMois(dateDebut, mois), -1);
}

/** Durée d'un bail en mois entiers (fin incluse). */
export function dureeEnMois(dateDebut: Date, dateFin: Date): number {
  return differenceMois(dateDebut, ajouterJours(dateFin, 1));
}

export type BailAVerifier = {
  type: TypeBail;
  dateDebut: Date;
  dateFin: Date;
  loyerHC: number;
  depotGarantie: number;
  chargesForfait: boolean;
  motifMobilite: string | null;
  lotMeuble?: boolean | null;
};

export type ResultatVerification = {
  erreurs: Record<string, string>;
  avertissements: string[];
};

/** Contrôle la cohérence d'un bail avec les règles légales de son type. */
export function verifierRegles(b: BailAVerifier): ResultatVerification {
  const erreurs: Record<string, string> = {};
  const avertissements: string[] = [];
  const regle = REGLES_BAIL[b.type];

  if (b.dateFin.getTime() <= b.dateDebut.getTime()) {
    erreurs.dateFin = "La date de fin doit être postérieure à la date de début.";
    return { erreurs, avertissements };
  }

  const mois = dureeEnMois(b.dateDebut, b.dateFin);

  if (b.type === "MOBILITE") {
    if (mois < 1) erreurs.dateFin = "Un bail mobilité dure au minimum 1 mois.";
    else if (mois > 10) erreurs.dateFin = "Un bail mobilité dure au maximum 10 mois.";
    if (b.depotGarantie > 0) erreurs.depotGarantie = "Aucun dépôt de garantie ne peut être demandé pour un bail mobilité.";
    if (!b.motifMobilite) erreurs.motifMobilite = "Le motif du bail mobilité est obligatoire.";
    if (!b.chargesForfait) avertissements.push("Les charges d'un bail mobilité sont obligatoirement au forfait : le forfait a été appliqué.");
  } else {
    const plafond = regle.depotMaxMois * b.loyerHC;
    if (b.depotGarantie > plafond + 0.005) {
      erreurs.depotGarantie = `Le dépôt de garantie est limité à ${regle.depotMaxMois} mois de loyer hors charges, soit ${formatEuros(plafond)}.`;
    }
    if (regle.dureeMinMois !== null && mois < regle.dureeMinMois) {
      avertissements.push(
        b.type === "MEUBLE"
          ? "Durée inférieure à 1 an : réservée à la location à un étudiant (9 mois, sans reconduction tacite)."
          : "Durée inférieure à 3 ans : possible uniquement pour un bailleur personne physique justifiant d'un événement précis (art. 11 de la loi du 6 juillet 1989).",
      );
    }
    if (b.type === "NON_MEUBLE" && b.chargesForfait) {
      avertissements.push("Pour un logement vide, les charges sont en principe des provisions régularisées annuellement (le forfait n'est admis qu'en colocation).");
    }
  }

  if ((b.type === "MEUBLE" || b.type === "MOBILITE") && b.lotMeuble === false) {
    avertissements.push("Le lot n'est pas indiqué comme meublé alors que ce type de bail porte sur un logement meublé.");
  }

  return { erreurs, avertissements };
}
