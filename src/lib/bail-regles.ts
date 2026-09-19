import type { TypeBail, TypeLot } from "@prisma/client";
import { ajouterJours, ajouterMois, differenceMois } from "./dates";
import { LOTS_HABITATION } from "./libelles";
import { formatEuros } from "./montants";
import { problemeTauxTva, tauxTvaAutorises, usageHabitation } from "./tva";

/**
 * Règles des baux d'habitation (loi n° 89-462 du 6 juillet 1989, titres Ier, Ier bis et Ier ter), des baux commerciaux
 * (Code de commerce, art. L. 145-1 et suivants), des baux professionnels (loi n° 86-1290 du 23 décembre 1986, art. 57 A)
 * et des locations meublées de tourisme (Code du tourisme, art. L. 324-1-1).
 */
export type RegleBail = {
  libelle: string;
  resume: string;
  /** Texte de référence, cité sur les quittances et dans les contrats. */
  reference: string;
  dureeMoisDefaut: number;
  dureeMoisDefautPersonneMorale: number;
  dureeMinMois: number | null;
  dureeMaxMois: number | null;
  /** Dépôt de garantie maximal, en mois de loyer hors charges ; null : montant libre. */
  depotMaxMois: number | null;
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
    reference: "loi n° 89-462 du 6 juillet 1989",
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
    reference: "loi n° 89-462 du 6 juillet 1989",
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
    reference: "loi n° 89-462 du 6 juillet 1989",
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
  COMMERCIAL: {
    libelle: "Bail commercial",
    reference: "articles L. 145-1 et suivants du Code de commerce",
    resume:
      "Statut des baux commerciaux : durée minimale de 9 ans, résiliation possible par le locataire à l'expiration de chaque période triennale avec 6 mois de préavis, droit au renouvellement et prolongation tacite à défaut de congé. Dépôt de garantie libre (intérêts dus au-delà de deux termes de loyer), révision triennale sur l'ILC ou l'ILAT. Loyers soumis à la TVA à 20 % lorsque le bailleur a opté.",
    dureeMoisDefaut: 108,
    dureeMoisDefautPersonneMorale: 108,
    dureeMinMois: 108,
    dureeMaxMois: null,
    depotMaxMois: null,
    preavisLocataire: "6 mois avant l'expiration de chaque période triennale",
    preavisBailleur: "6 mois avant l'échéance, par acte extrajudiciaire ; indemnité d'éviction sauf motif grave et légitime",
    chargesForfaitAutorise: true,
    chargesForfaitObligatoire: false,
    revisionIRL: false,
    motifObligatoire: false,
    reconductionTacite: true,
  },
  PROFESSIONNEL: {
    libelle: "Bail professionnel",
    reference: "article 57 A de la loi n° 86-1290 du 23 décembre 1986",
    resume:
      "Locaux à usage exclusivement professionnel (professions libérales) : durée minimale de 6 ans, résiliation par le locataire à tout moment avec 6 mois de préavis, reconduction tacite pour 6 ans à défaut de congé. Dépôt de garantie libre, révision selon la clause du bail (ILAT en général). Loyers soumis à la TVA à 20 % lorsque le bailleur a opté.",
    dureeMoisDefaut: 72,
    dureeMoisDefautPersonneMorale: 72,
    dureeMinMois: 72,
    dureeMaxMois: null,
    depotMaxMois: null,
    preavisLocataire: "6 mois, à tout moment",
    preavisBailleur: "6 mois avant l'échéance, par lettre recommandée ou acte extrajudiciaire",
    chargesForfaitAutorise: true,
    chargesForfaitObligatoire: false,
    revisionIRL: false,
    motifObligatoire: false,
    reconductionTacite: true,
  },
  SAISONNIER: {
    libelle: "Location meublée de tourisme (saisonnière)",
    reference: "article L. 324-1-1 du Code du tourisme",
    resume:
      "Location meublée de courte durée à une clientèle de passage, hors loi du 6 juillet 1989 : 90 jours consécutifs au maximum pour un même client, prix libre, charges comprises ou au forfait, sans révision d'indice ni reconduction. Loyers soumis à la TVA à 10 % lorsque des prestations para-hôtelières sont fournies.",
    dureeMoisDefaut: 1,
    dureeMoisDefautPersonneMorale: 1,
    dureeMinMois: null,
    dureeMaxMois: 3,
    depotMaxMois: null,
    preavisLocataire: "Selon les conditions de réservation (aucun préavis légal)",
    preavisBailleur: "Le contrat prend fin à son terme",
    chargesForfaitAutorise: true,
    chargesForfaitObligatoire: true,
    revisionIRL: false,
    motifObligatoire: false,
    reconductionTacite: false,
  },
};

/** Bail à durée fixe : aucune reconduction ni prolongation après la date de fin. */
export function bailADureeFixe(type: TypeBail): boolean {
  return !REGLES_BAIL[type].reconductionTacite;
}

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
  /** Taux de TVA appliqué au loyer (0 = exonéré). */
  tauxTva?: number;
  lotMeuble?: boolean | null;
  lotType?: TypeLot | null;
  /** Le lot est soumis à la TVA (option sur l'immeuble et sur le lot). */
  lotSoumisTva?: boolean | null;
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
  } else if (b.type === "COMMERCIAL") {
    if (mois < 108) {
      if (mois <= 36) avertissements.push("Durée inférieure à 9 ans : bail dérogatoire (art. L. 145-5 du Code de commerce), 3 ans au plus, sans droit au renouvellement.");
      else erreurs.dateFin = "Un bail commercial dure 9 ans au minimum ; en deçà, seul un bail dérogatoire de 3 ans au plus est possible.";
    }
    if (b.depotGarantie > 2 * b.loyerHC + 0.005) avertissements.push("Le dépôt de garantie dépasse deux termes de loyer : l'excédent produit des intérêts au profit du locataire (art. L. 145-40 du Code de commerce).");
  } else if (b.type === "PROFESSIONNEL") {
    if (mois < 72) erreurs.dateFin = "Un bail professionnel dure 6 ans au minimum (art. 57 A de la loi du 23 décembre 1986).";
  } else if (b.type === "SAISONNIER") {
    if (mois > 3) avertissements.push("Au-delà de 90 jours consécutifs pour un même client, la location ne relève plus du meublé de tourisme : vérifiez le régime applicable (bail meublé ou bail mobilité).");
    if (!b.chargesForfait) avertissements.push("Les charges d'une location saisonnière sont comprises dans le prix ou au forfait : le forfait a été appliqué.");
  } else {
    const plafond = (regle.depotMaxMois ?? 0) * b.loyerHC;
    if (regle.depotMaxMois !== null && b.depotGarantie > plafond + 0.005) {
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

  if ((b.type === "MEUBLE" || b.type === "MOBILITE" || b.type === "SAISONNIER") && b.lotMeuble === false) {
    avertissements.push("Le lot n'est pas indiqué comme meublé alors que ce type de bail porte sur un logement meublé.");
  }
  if (b.lotType) {
    const lotHabitation = LOTS_HABITATION.includes(b.lotType);
    if ((b.type === "COMMERCIAL" || b.type === "PROFESSIONNEL") && lotHabitation) avertissements.push("Le lot est enregistré comme logement (appartement ou maison) : vérifiez que son usage commercial ou professionnel est autorisé.");
    if (usageHabitation(b.type) && !lotHabitation) avertissements.push("Le lot est un local commercial ou professionnel : un bail d'habitation suppose un logement.");
  }

  // TVA : exonération d'office pour l'habitation ; sinon taux du type de bail, si le lot est soumis à la TVA.
  const tauxTva = b.tauxTva ?? 0;
  const pbTva = problemeTauxTva(b.type, tauxTva, !!b.lotSoumisTva);
  if (pbTva) erreurs.tauxTva = pbTva;
  else if (tauxTva === 0 && b.lotSoumisTva && tauxTvaAutorises(b.type).length) {
    avertissements.push(`Le lot est soumis à la TVA mais ce bail est enregistré sans TVA (taux possible : ${tauxTvaAutorises(b.type).map((t) => `${t} %`).join(", ")}).`);
  }

  return { erreurs, avertissements };
}
