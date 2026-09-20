import type { CategoriePiece, RoleDossier, SituationCandidat, StatutCandidature, StatutPiece, TypeGarantie } from "@prisma/client";

/**
 * Dossier de candidature à la location.
 *
 * Les pièces qui peuvent être réclamées à un candidat comme à sa caution sont énumérées de façon
 * LIMITATIVE par le décret n° 2015-1437 du 5 novembre 2015, pris pour l'application de l'article
 * 22-2 de la loi n° 89-462 du 6 juillet 1989. Réclamer une pièce absente de cette liste expose le
 * bailleur à une amende administrative (3 000 € pour une personne physique, 15 000 € pour une
 * personne morale). L'application ne propose donc que les pièces autorisées et rappelle les pièces
 * interdites au gestionnaire.
 */

export const STATUTS_CANDIDATURE: Record<StatutCandidature, string> = {
  BROUILLON: "Brouillon",
  TRANSMISE: "Dossier en cours",
  DEPOSEE: "Dossier déposé",
  ACCEPTEE: "Retenue",
  CONCLUE: "Bail signé",
  REFUSEE: "Non retenue",
  RETIREE: "Retirée",
};

export const TONS_CANDIDATURE: Record<StatutCandidature, "gris" | "bleu" | "violet" | "vert" | "rouge"> = {
  BROUILLON: "gris",
  TRANSMISE: "bleu",
  DEPOSEE: "violet",
  ACCEPTEE: "vert",
  CONCLUE: "vert",
  REFUSEE: "rouge",
  RETIREE: "gris",
};

export const SITUATIONS: Record<SituationCandidat, string> = {
  CDI: "Salarié en CDI",
  CDI_ESSAI: "Salarié en CDI (période d'essai)",
  CDD: "Salarié en CDD",
  INTERIM: "Intérimaire",
  FONCTIONNAIRE: "Fonctionnaire",
  INDEPENDANT: "Indépendant, gérant ou profession libérale",
  RETRAITE: "Retraité",
  ETUDIANT: "Étudiant",
  ALTERNANT: "Alternant, apprenti ou stagiaire",
  SANS_EMPLOI: "Sans emploi",
  AUTRE: "Autre situation",
};

export const TYPES_GARANTIE: Record<TypeGarantie, string> = {
  AUCUNE: "Aucune garantie",
  PERSONNE_PHYSIQUE: "Caution d'un proche (personne physique)",
  PERSONNE_MORALE: "Caution d'une personne morale (employeur, organisme)",
  VISALE: "Garantie Visale (Action Logement)",
  ASSURANCE_LOYERS_IMPAYES: "Assurance loyers impayés souscrite par le bailleur",
};

export const CATEGORIES_PIECE: Record<CategoriePiece, string> = {
  IDENTITE: "Pièce d'identité",
  DOMICILE: "Justificatif de domicile",
  ACTIVITE: "Justificatif d'activité professionnelle",
  RESSOURCES: "Justificatif de ressources",
};

export const ORDRE_CATEGORIES: CategoriePiece[] = ["IDENTITE", "DOMICILE", "ACTIVITE", "RESSOURCES"];

export const STATUTS_PIECE: Record<StatutPiece, string> = {
  DEPOSEE: "À vérifier",
  VALIDEE: "Validée",
  REFUSEE: "À remplacer",
};

export const TONS_PIECE: Record<StatutPiece, "bleu" | "vert" | "rouge"> = {
  DEPOSEE: "bleu",
  VALIDEE: "vert",
  REFUSEE: "rouge",
};

/** Une pièce de la liste du décret du 5 novembre 2015. */
export type Piece = {
  code: string;
  categorie: CategoriePiece;
  libelle: string;
  aide: string;
  /** Situations pour lesquelles la pièce est proposée ; absent = toutes. */
  situations?: SituationCandidat[];
  /** Pièce proposée uniquement à une caution personne morale. */
  personneMorale?: boolean;
};

const TOUS_SALARIES: SituationCandidat[] = ["CDI", "CDI_ESSAI", "CDD", "INTERIM", "FONCTIONNAIRE", "ALTERNANT"];

/** Liste limitative du décret n° 2015-1437 du 5 novembre 2015 (annexes 1 et 2). */
export const PIECES: Piece[] = [
  // --- Identité (annexe, 1°) : une seule pièce, en cours de validité, comportant la photographie.
  { code: "CNI", categorie: "IDENTITE", libelle: "Carte nationale d'identité", aide: "Recto et verso, en cours de validité (française ou étrangère)." },
  { code: "PASSEPORT", categorie: "IDENTITE", libelle: "Passeport", aide: "Page d'identité, en cours de validité (français ou étranger)." },
  { code: "PERMIS", categorie: "IDENTITE", libelle: "Permis de conduire", aide: "Recto et verso (français ou étranger)." },
  { code: "TITRE_SEJOUR", categorie: "IDENTITE", libelle: "Titre ou carte de séjour", aide: "Document en cours de validité." },
  { code: "KBIS_IDENTITE", categorie: "IDENTITE", libelle: "Extrait K bis de la société", aide: "Caution personne morale : extrait de moins de trois mois.", personneMorale: true },

  // --- Domicile (annexe, 2°) : une seule pièce.
  { code: "QUITTANCES", categorie: "DOMICILE", libelle: "Trois dernières quittances de loyer", aide: "Quittances remises par votre bailleur actuel." },
  { code: "ATTESTATION_BAILLEUR", categorie: "DOMICILE", libelle: "Attestation du précédent bailleur", aide: "À défaut de quittances : attestation indiquant que vous êtes à jour de vos loyers et charges." },
  { code: "ATTESTATION_HEBERGEANT", categorie: "DOMICILE", libelle: "Attestation d'hébergement", aide: "Attestation sur l'honneur de la personne qui vous héberge, accompagnée de sa pièce d'identité." },
  { code: "TAXE_FONCIERE", categorie: "DOMICILE", libelle: "Avis de taxe foncière ou titre de propriété", aide: "Si vous êtes propriétaire de votre logement actuel : dernier avis de taxe foncière." },

  // --- Activité professionnelle (annexe, 3°).
  { code: "CONTRAT_TRAVAIL", categorie: "ACTIVITE", libelle: "Contrat de travail ou de stage", aide: "Contrat signé, ou attestation de l'employeur précisant l'emploi et la rémunération.", situations: TOUS_SALARIES },
  { code: "KBIS", categorie: "ACTIVITE", libelle: "Extrait K bis, carte professionnelle ou avis SIRENE", aide: "Au choix : extrait K ou K bis, carte professionnelle, ou certificat d'identification de l'INSEE portant le numéro SIREN.", situations: ["INDEPENDANT"] },
  { code: "CARTE_ETUDIANT", categorie: "ACTIVITE", libelle: "Carte d'étudiant ou certificat de scolarité", aide: "Pour l'année en cours.", situations: ["ETUDIANT", "ALTERNANT"] },

  // --- Ressources (annexe, 4°).
  { code: "BULLETINS_SALAIRE", categorie: "RESSOURCES", libelle: "Trois derniers bulletins de salaire", aide: "Les trois derniers mois, en un ou plusieurs fichiers.", situations: TOUS_SALARIES },
  { code: "AVIS_IMPOSITION", categorie: "RESSOURCES", libelle: "Deux derniers avis d'impôt sur le revenu", aide: "Avis complets, toutes pages. Si vous êtes rattaché au foyer fiscal de vos parents, fournissez leur avis." },
  { code: "BILANS", categorie: "RESSOURCES", libelle: "Deux derniers bilans", aide: "Ou attestation de ressources établie par un expert-comptable pour l'exercice en cours. Deux bilans au maximum peuvent être exigés.", situations: ["INDEPENDANT"] },
  { code: "INDEMNITES_STAGE", categorie: "RESSOURCES", libelle: "Justificatif des indemnités de stage", aide: "Convention de stage ou justificatifs de versement.", situations: ["ALTERNANT", "ETUDIANT"] },
  { code: "PRESTATIONS", categorie: "RESSOURCES", libelle: "Indemnités, retraites, pensions et allocations", aide: "Justificatifs de versement des trois derniers mois : retraite, pension, allocations familiales, aides au logement, indemnités journalières…" },
  { code: "BOURSE", categorie: "RESSOURCES", libelle: "Avis d'attribution de bourse", aide: "Notification pour l'année en cours.", situations: ["ETUDIANT", "ALTERNANT"] },
  { code: "REVENUS_FONCIERS", categorie: "RESSOURCES", libelle: "Revenus fonciers, rentes ou revenus de capitaux", aide: "Justificatif de revenus fonciers, de rentes viagères ou de revenus de valeurs et capitaux mobiliers." },
  { code: "TITRE_PROPRIETE", categorie: "RESSOURCES", libelle: "Titre de propriété d'un bien immobilier", aide: "Ou dernier avis de taxe foncière du bien." },
];

const PAR_CODE = new Map(PIECES.map((p) => [p.code, p]));

export function pieceDe(code: string): Piece | null {
  return PAR_CODE.get(code) ?? null;
}

export function libellePiece(code: string): string {
  return PAR_CODE.get(code)?.libelle ?? code;
}

/**
 * Pièces proposées pour une situation donnée. Un dossier de caution personne morale n'a ni
 * justificatif de domicile ni justificatif d'activité au sens du décret : seuls son identification
 * et ses ressources sont demandées.
 */
export function piecesProposees(situation: SituationCandidat | null, personneMorale = false): Piece[] {
  if (personneMorale) return PIECES.filter((p) => p.personneMorale || (p.categorie === "RESSOURCES" && ["BILANS", "AVIS_IMPOSITION"].includes(p.code)));
  return PIECES.filter((p) => !p.personneMorale && (!p.situations || (situation !== null && p.situations.includes(situation))));
}

/** Catégories dont au moins une pièce est attendue pour cette situation. */
export function categoriesAttendues(situation: SituationCandidat | null, personneMorale = false): CategoriePiece[] {
  const proposees = piecesProposees(situation, personneMorale);
  return ORDRE_CATEGORIES.filter((c) => proposees.some((p) => p.categorie === c));
}

/**
 * Pièces INTERDITES par l'article 22-2 de la loi du 6 juillet 1989 : les réclamer expose à une
 * amende administrative. Rappelées au gestionnaire pour éviter la demande « par habitude ».
 */
export const PIECES_INTERDITES: string[] = [
  "Photographie d'identité (hors celle de la pièce d'identité)",
  "Carte d'assuré social ou carte Vitale",
  "Copie d'un relevé de compte bancaire ou postal",
  "Attestation de bonne tenue de compte bancaire",
  "Attestation d'absence de crédit en cours",
  "Autorisation de prélèvement automatique",
  "Jugement de divorce, hors le paragraphe fixant la résidence",
  "Contrat de mariage ou certificat de concubinage",
  "Chèque de réservation du logement",
  "Dossier médical personnel",
  "Extrait de casier judiciaire",
  "Inscription au fichier des incidents de remboursement des crédits (FICP)",
  "Plus de deux bilans pour un travailleur indépendant",
  "Attestation de l'employeur lorsque le contrat de travail et les bulletins de salaire sont fournis",
  "Attestation du précédent bailleur lorsque d'autres justificatifs de domicile sont fournis",
  "Renseignements sur le candidat obtenus auprès d'un tiers",
];

/** Revenu mensuel net retenu pour un dossier (revenus d'activité et autres revenus déclarés). */
export function revenuTotal(d: { revenuMensuel: number | null; autresRevenus: number | null }): number {
  return (d.revenuMensuel ?? 0) + (d.autresRevenus ?? 0);
}

/** Loyer charges comprises annoncé au candidat. */
export function loyerCharges(c: { loyerAnnonce: number | null; chargesAnnonce: number | null }): number {
  return (c.loyerAnnonce ?? 0) + (c.chargesAnnonce ?? 0);
}

/**
 * Taux d'effort : part du loyer charges comprises dans les revenus nets du foyer candidat.
 * La pratique retient des revenus au moins égaux à trois fois le loyer, soit un taux d'effort
 * d'environ 33 %. Ce n'est pas une règle de droit : aucun seuil n'est imposé au bailleur.
 */
export function tauxEffort(revenus: number, loyerCC: number): number | null {
  if (revenus <= 0 || loyerCC <= 0) return null;
  return Math.round((loyerCC / revenus) * 1000) / 10;
}

export type Appreciation = { ton: "vert" | "orange" | "rouge"; libelle: string; detail: string };

export function apprecierTauxEffort(taux: number | null): Appreciation | null {
  if (taux === null) return null;
  if (taux <= 33.4) return { ton: "vert", libelle: "Confortable", detail: "Les revenus atteignent au moins trois fois le loyer charges comprises." };
  if (taux <= 40) return { ton: "orange", libelle: "Limite", detail: "Les revenus représentent entre 2,5 et 3 fois le loyer : une garantie solide est recommandée." };
  return { ton: "rouge", libelle: "Insuffisant", detail: "Les revenus représentent moins de 2,5 fois le loyer charges comprises." };
}

/** Couverture apportée par une caution : nombre de fois le loyer charges comprises. */
export function couvertureGarant(revenusGarant: number, loyerCC: number): number | null {
  if (revenusGarant <= 0 || loyerCC <= 0) return null;
  return Math.round((revenusGarant / loyerCC) * 10) / 10;
}

/**
 * Article 22-1 de la loi du 6 juillet 1989 : le bailleur qui a souscrit une assurance pour loyers
 * impayés ne peut pas demander en plus un cautionnement, sauf si le logement est loué à un étudiant
 * ou à un apprenti.
 */
export function cumulGarantieInterdit(typeGarantie: TypeGarantie | null, assuranceLoyersImpayes: boolean, situation: SituationCandidat | null): boolean {
  if (!assuranceLoyersImpayes) return false;
  if (typeGarantie !== "PERSONNE_PHYSIQUE" && typeGarantie !== "PERSONNE_MORALE") return false;
  return situation !== "ETUDIANT" && situation !== "ALTERNANT";
}

export type EtatPieces = { categorie: CategoriePiece; deposees: number; refusees: number; couverte: boolean };

/** Couverture des catégories attendues par les pièces effectivement déposées (une pièce refusée ne compte pas). */
export function etatPieces(
  situation: SituationCandidat | null,
  personneMorale: boolean,
  pieces: { code: string; statut: StatutPiece }[],
): EtatPieces[] {
  return categoriesAttendues(situation, personneMorale).map((categorie) => {
    const duGroupe = pieces.filter((p) => pieceDe(p.code)?.categorie === categorie);
    const refusees = duGroupe.filter((p) => p.statut === "REFUSEE").length;
    const deposees = duGroupe.length - refusees;
    return { categorie, deposees, refusees, couverte: deposees > 0 };
  });
}

export type DossierAvancement = { informations: boolean; justificatifs: boolean; complet: boolean; manquantes: CategoriePiece[] };

/** Avancement d'un dossier (candidat ou caution) : informations renseignées puis justificatifs déposés. */
export function avancementDossier(
  d: { nom: string; prenom: string | null; raisonSociale: string | null; email: string | null; situation: SituationCandidat | null; revenuMensuel: number | null; personneMorale: boolean },
  pieces: { code: string; statut: StatutPiece }[],
): DossierAvancement {
  const identifie = d.personneMorale ? !!d.raisonSociale?.trim() : !!d.nom.trim() && !!d.prenom?.trim();
  const informations = identifie && !!d.email?.trim() && (d.personneMorale || d.situation !== null) && d.revenuMensuel !== null;
  const etats = etatPieces(d.situation, d.personneMorale, pieces);
  const manquantes = etats.filter((e) => !e.couverte).map((e) => e.categorie);
  const justificatifs = etats.length > 0 && manquantes.length === 0;
  return { informations, justificatifs, complet: informations && justificatifs, manquantes };
}

/** Une candidature est déposable quand le dossier du ou des candidats et celui des cautions déclarées sont complets. */
export function candidatureDeposable(dossiers: { complet: boolean; role: RoleDossier }[]): boolean {
  return dossiers.length > 0 && dossiers.every((d) => d.complet) && dossiers.some((d) => d.role === "CANDIDAT");
}

export function nomDossier(d: { nom: string; prenom: string | null; raisonSociale: string | null; personneMorale: boolean }): string {
  if (d.personneMorale) return d.raisonSociale?.trim() || d.nom;
  return [d.prenom, d.nom].filter((p) => p?.trim()).join(" ") || d.nom;
}

/**
 * Délai de conservation d'un dossier de candidature non retenu. La CNIL admet une conservation
 * limitée après l'attribution du logement ; au-delà, les pièces doivent être détruites.
 */
export const JOURS_CONSERVATION_REFUS = 90;

export function aPurger(c: { statut: StatutCandidature; decisionLe: Date | null }, auj: Date): boolean {
  if (c.statut !== "REFUSEE" && c.statut !== "RETIREE") return false;
  if (!c.decisionLe) return false;
  return (auj.getTime() - c.decisionLe.getTime()) / 86400000 >= JOURS_CONSERVATION_REFUS;
}
