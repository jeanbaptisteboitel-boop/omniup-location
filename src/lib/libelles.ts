import type {
  CategorieDepense,
  CategorieDocument,
  CategorieModele,
  TypeEntite,
  ModePaiement,
  OrigineConge,
  StatutBail,
  TypeBail,
  TypeCourrier,
  TypeLot,
  TypePersonne,
} from "@prisma/client";

export const TYPES_LOT: Record<TypeLot, string> = {
  APPARTEMENT: "Appartement",
  MAISON: "Maison",
  LOCAL_COMMERCIAL: "Local commercial",
  LOCAL_PROFESSIONNEL: "Local professionnel (bureau, cabinet)",
};

/** Lots à usage d'habitation (par opposition aux locaux commerciaux ou professionnels). */
export const LOTS_HABITATION: TypeLot[] = ["APPARTEMENT", "MAISON"];

export const TYPES_PERSONNE: Record<TypePersonne, string> = {
  PHYSIQUE: "Personne physique",
  MORALE: "Société (SCI, SARL…)",
};

export const CATEGORIES_DOCUMENT: Record<CategorieDocument, string> = {
  PIECE_IDENTITE: "Pièce d'identité",
  AVIS_IMPOSITION: "Avis d'imposition",
  LETTRE_RECOMMANDATION: "Lettre de recommandation",
  JUSTIFICATIF_DOMICILE: "Justificatif de domicile",
  JUSTIFICATIF_REVENUS: "Justificatif de revenus",
  AUTRE: "Autre justificatif",
};

export const TYPES_BAIL: Record<TypeBail, string> = {
  NON_MEUBLE: "Bail non meublé (logement vide)",
  MEUBLE: "Bail meublé",
  MOBILITE: "Bail mobilité",
  COMMERCIAL: "Bail commercial",
  PROFESSIONNEL: "Bail professionnel",
  SAISONNIER: "Location meublée de tourisme (saisonnière)",
};

export const TYPES_BAIL_COURT: Record<TypeBail, string> = {
  NON_MEUBLE: "Non meublé",
  MEUBLE: "Meublé",
  MOBILITE: "Mobilité",
  COMMERCIAL: "Commercial",
  PROFESSIONNEL: "Professionnel",
  SAISONNIER: "Saisonnier",
};

export const STATUTS_BAIL: Record<StatutBail, string> = {
  BROUILLON: "Brouillon",
  EN_SIGNATURE: "En signature (Omniup Sign)",
  SIGNE: "Signé",
  TERMINE: "Terminé",
};

export const ORIGINES_CONGE: Record<OrigineConge, string> = {
  LOCATAIRE: "Le locataire",
  BAILLEUR: "Le bailleur",
};

export const MODES_PAIEMENT: Record<ModePaiement, string> = {
  VIREMENT: "Virement",
  PRELEVEMENT: "Prélèvement",
  CHEQUE: "Chèque",
  ESPECES: "Espèces",
  AUTRE: "Autre",
};

export const CATEGORIES_DEPENSE: Record<CategorieDepense, string> = {
  REPARATION_ENTRETIEN: "Réparation et entretien",
  AMELIORATION: "Travaux d'amélioration",
  GESTION_LOCATIVE: "Frais de gestion locative",
  COPROPRIETE: "Charges de copropriété",
  ASSURANCE_PNO: "Assurance propriétaire non occupant",
  TAXE_FONCIERE: "Taxe foncière",
  INTERETS_EMPRUNT: "Intérêts d'emprunt",
  AUTRE: "Autre dépense",
};

export const TYPES_COURRIER: Record<TypeCourrier, string> = {
  REVISION_LOYER: "Révision de loyer",
  RELANCE: "Relance de loyer impayé",
  AUTRE: "Autre courrier",
};

export const CIVILITES = ["M.", "Mme"] as const;

export const MOTIFS_MOBILITE = [
  "Formation professionnelle",
  "Études supérieures",
  "Contrat d'apprentissage",
  "Stage",
  "Engagement volontaire dans le cadre d'un service civique",
  "Mutation professionnelle",
  "Mission temporaire dans le cadre de l'activité professionnelle",
] as const;

export function options<T extends string>(map: Record<T, string>): { value: T; label: string }[] {
  return (Object.keys(map) as T[]).map((value) => ({ value, label: map[value] }));
}

export function nomComplet(p: { civilite?: string | null; prenom: string; nom: string }): string {
  return [p.civilite, p.prenom, p.nom].filter(Boolean).join(" ");
}

export function adresseSurUneLigne(a: {
  adresse?: string | null;
  complementAdresse?: string | null;
  codePostal?: string | null;
  ville?: string | null;
}): string {
  return [a.adresse, a.complementAdresse, [a.codePostal, a.ville].filter(Boolean).join(" ")].filter(Boolean).join(", ");
}

export function adresseSurPlusieursLignes(a: {
  adresse?: string | null;
  complementAdresse?: string | null;
  codePostal?: string | null;
  ville?: string | null;
}): string[] {
  return [a.adresse, a.complementAdresse, [a.codePostal, a.ville].filter(Boolean).join(" ")].filter((l): l is string => !!l);
}

export const TYPES_ENTITE: Record<TypeEntite, string> = {
  PERSONNE: "Personne physique",
  SOCIETE: "Société",
  AUTRE: "Autre / non précisé",
};

export const CATEGORIES_MODELE: Record<CategorieModele, string> = {
  BAIL: "Baux et contrats de location",
  AVENANT: "Avenants",
  RENOUVELLEMENT: "Renouvellements",
  RESILIATION: "Fins de bail et résiliations",
  CAUTION: "Cautions et garanties",
  CONVENTION: "Conventions, location-gérance et domiciliation",
  AUTRE: "Autres documents",
};

// ---------------------------------------------------------------------------
// Demandes de maintenance (interventions signalées par le locataire)
// ---------------------------------------------------------------------------

import type { CategorieMaintenance, StatutMaintenance, UrgenceMaintenance } from "@prisma/client";

export const CATEGORIES_MAINTENANCE: Record<CategorieMaintenance, string> = {
  PLOMBERIE: "Plomberie (fuite, robinetterie, évacuation)",
  ELECTRICITE: "Électricité (prise, interrupteur, tableau)",
  CHAUFFAGE: "Chauffage, eau chaude et ventilation",
  SERRURERIE: "Serrurerie (porte, serrure, clés)",
  MENUISERIE: "Menuiserie (fenêtre, volet, placard)",
  ELECTROMENAGER: "Électroménager fourni avec le logement",
  DEGAT_EAUX: "Dégât des eaux, infiltration, humidité",
  NUISIBLES: "Nuisibles (rongeurs, insectes)",
  PARTIES_COMMUNES: "Parties communes de l'immeuble",
  AUTRE: "Autre problème",
};

export const URGENCES_MAINTENANCE: Record<UrgenceMaintenance, string> = {
  NORMALE: "Normale",
  URGENTE: "Urgente",
  TRES_URGENTE: "Très urgente",
};

export const STATUTS_MAINTENANCE: Record<StatutMaintenance, string> = {
  NOUVELLE: "Nouvelle",
  PRISE_EN_COMPTE: "Prise en compte",
  PLANIFIEE: "Planifiée",
  RESOLUE: "Résolue",
  REFUSEE: "Refusée",
};
