import type {
  CategorieDepense,
  CategorieDocument,
  ModePaiement,
  StatutBail,
  TypeBail,
  TypeCourrier,
  TypeLot,
  TypePersonne,
} from "@prisma/client";

export const TYPES_LOT: Record<TypeLot, string> = {
  APPARTEMENT: "Appartement",
  MAISON: "Maison",
};

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
};

export const TYPES_BAIL_COURT: Record<TypeBail, string> = {
  NON_MEUBLE: "Non meublé",
  MEUBLE: "Meublé",
  MOBILITE: "Mobilité",
};

export const STATUTS_BAIL: Record<StatutBail, string> = {
  BROUILLON: "Brouillon",
  EN_SIGNATURE: "En signature (Omniup Sign)",
  SIGNE: "Signé",
  TERMINE: "Terminé",
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
