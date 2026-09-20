import { ajouterJours, differenceJours } from "./dates";

/**
 * Assurance habitation du locataire : il doit justifier chaque année d'une assurance contre les risques locatifs
 * (article 7 g de la loi du 6 juillet 1989). L'application suit la dernière attestation reçue et relance avant son échéance.
 */

export type StatutAssurance = "A_JOUR" | "BIENTOT_EXPIREE" | "EXPIREE" | "MANQUANTE";

export const LIBELLES_ASSURANCE: Record<StatutAssurance, string> = {
  A_JOUR: "À jour",
  BIENTOT_EXPIREE: "Bientôt expirée",
  EXPIREE: "Expirée",
  MANQUANTE: "Attestation manquante",
};

export const TONS_ASSURANCE: Record<StatutAssurance, "vert" | "orange" | "rouge" | "gris"> = {
  A_JOUR: "vert",
  BIENTOT_EXPIREE: "orange",
  EXPIREE: "rouge",
  MANQUANTE: "rouge",
};

/** Nombre de jours avant l'échéance à partir duquel l'attestation est signalée et le locataire relancé. */
export const JOURS_ALERTE_ASSURANCE = 45;
/** Délai minimal entre deux relances automatiques. */
export const JOURS_ENTRE_RELANCES = 15;

export type Attestation = { dateEcheance: Date; dateDebut?: Date | null; createdAt?: Date };

/** Attestation en vigueur : celle dont l'échéance est la plus lointaine. */
export function attestationCourante<T extends Attestation>(attestations: T[]): T | null {
  return attestations.reduce<T | null>((meilleure, a) => (!meilleure || a.dateEcheance.getTime() > meilleure.dateEcheance.getTime() ? a : meilleure), null);
}

export type EtatAssurance = { statut: StatutAssurance; echeance: Date | null; jours: number | null };

/** État de l'assurance d'un bail à une date donnée. */
export function etatAssurance(attestations: Attestation[], auj: Date): EtatAssurance {
  const courante = attestationCourante(attestations);
  if (!courante) return { statut: "MANQUANTE", echeance: null, jours: null };
  const jours = differenceJours(auj, courante.dateEcheance);
  if (jours < 0) return { statut: "EXPIREE", echeance: courante.dateEcheance, jours };
  if (jours <= JOURS_ALERTE_ASSURANCE) return { statut: "BIENTOT_EXPIREE", echeance: courante.dateEcheance, jours };
  return { statut: "A_JOUR", echeance: courante.dateEcheance, jours };
}

/**
 * Faut-il relancer le locataire ? Uniquement sur un bail en cours, quand l'attestation manque ou approche de son terme,
 * et si la dernière relance date de plus de quinze jours.
 */
export function doitRelancer(bail: { statut: string; assuranceRelanceLe: Date | null }, etat: EtatAssurance, auj: Date): boolean {
  if (bail.statut !== "SIGNE") return false;
  if (etat.statut === "A_JOUR") return false;
  if (!bail.assuranceRelanceLe) return true;
  return ajouterJours(bail.assuranceRelanceLe, JOURS_ENTRE_RELANCES).getTime() <= auj.getTime();
}
