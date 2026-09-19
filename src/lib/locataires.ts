import { adresseSurUneLigne, nomComplet } from "./libelles";
import { formatDate } from "./dates";

/**
 * Un bail peut avoir plusieurs titulaires (couple, colocation) : ces fonctions produisent
 * les libellés, formules d'appel et adresses d'envoi à partir de la liste des locataires.
 */

export type LocataireNom = { civilite?: string | null; prenom: string; nom: string };

/** Ordre d'affichage des locataires d'un bail (nom puis prénom). */
export const includeLocataires = { orderBy: [{ nom: "asc" as const }, { prenom: "asc" as const }] };

/** « A », « A et B », « A, B et C ». */
export function joindre(elements: string[]): string {
  const l = elements.filter(Boolean);
  if (l.length <= 1) return l[0] ?? "";
  return `${l.slice(0, -1).join(", ")} et ${l[l.length - 1]}`;
}

/** Noms complets des locataires, joints : « Mme Claire Martin et M. Paul Durand ». */
export function nomsLocataires(locataires: LocataireNom[]): string {
  return joindre(locataires.map(nomComplet));
}

/** Adresses email distinctes des locataires (destinataires des envois). */
export function emailsLocataires(locataires: { email: string | null }[]): string[] {
  return Array.from(new Set(locataires.map((l) => l.email?.trim() ?? "").filter(Boolean)));
}

/** Formule d'appel : « Mme Martin », « Mme Martin et M. Durand », sinon « Madame, Monsieur ». */
export function formuleAppel(locataires: { civilite: string | null; nom: string }[]): string {
  if (!locataires.length || locataires.some((l) => !l.civilite)) return "Madame, Monsieur";
  return joindre(locataires.map((l) => `${l.civilite} ${l.nom}`));
}

/** « le locataire » / « les locataires » (majuscule initiale sur demande). */
export function libelleLocataires(nombre: number, majuscule = false): string {
  const l = nombre > 1 ? "les locataires" : "le locataire";
  return majuscule ? l.charAt(0).toUpperCase() + l.slice(1) : l;
}

/** Identification complète d'un locataire pour les contrats : nom, naissance, domicile, contacts. */
export function identificationLocataire(l: LocataireNom & { dateNaissance?: Date | null; adresse?: string | null; complementAdresse?: string | null; codePostal?: string | null; ville?: string | null; email?: string | null; telephone?: string | null }): string {
  const adresse = adresseSurUneLigne(l);
  const feminin = l.civilite === "Mme";
  return [
    nomComplet(l),
    l.dateNaissance ? `${feminin ? "née" : "né(e)"} le ${formatDate(l.dateNaissance)}` : null,
    adresse ? `demeurant ${adresse}` : null,
    l.email?.trim() ? `email ${l.email.trim()}` : null,
    l.telephone?.trim() ? `téléphone ${l.telephone.trim()}` : null,
  ]
    .filter(Boolean)
    .join(", ");
}

/** Identification de tous les locataires, séparés par « ; ». */
export function identificationLocataires(locataires: Parameters<typeof identificationLocataire>[0][]): string {
  return locataires.map(identificationLocataire).join(" ; ");
}

/** Valeur commune à tous les locataires, sinon chaque valeur suivie du nom entre parenthèses. */
export function valeurParLocataire<T extends LocataireNom>(locataires: T[], valeur: (l: T) => string): string {
  const valeurs = locataires.map((l) => ({ v: valeur(l).trim(), l })).filter((x) => x.v);
  if (!valeurs.length) return "";
  if (valeurs.length === locataires.length && new Set(valeurs.map((x) => x.v)).size === 1) return valeurs[0].v;
  if (valeurs.length === 1 && locataires.length === 1) return valeurs[0].v;
  return valeurs.map((x) => `${x.v} (${nomComplet(x.l)})`).join(" ; ");
}
