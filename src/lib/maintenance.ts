import "server-only";
import type { AuteurMessage, Prisma, StatutMaintenance, UrgenceMaintenance } from "@prisma/client";
import { prisma } from "./prisma";
import { includeLocataires } from "./locataires";

/**
 * Demandes de maintenance : le locataire signale un problème depuis son espace,
 * le gestionnaire répond, planifie l'intervention puis clôt la demande.
 * Les helpers purs (tri, compteurs, transitions) sont testés dans __tests__/maintenance.test.ts.
 */

/** Statuts d'une demande encore en cours : elle reste modifiable des deux côtés. */
export const STATUTS_OUVERTS: StatutMaintenance[] = ["NOUVELLE", "PRISE_EN_COMPTE", "PLANIFIEE"];

export function estOuverte(statut: StatutMaintenance): boolean {
  return STATUTS_OUVERTS.includes(statut);
}

/** Les demandes les plus urgentes d'abord (valeur la plus faible en tête). */
export const RANG_URGENCE: Record<UrgenceMaintenance, number> = { TRES_URGENTE: 0, URGENTE: 1, NORMALE: 2 };

type PourTri = { urgence: UrgenceMaintenance; createdAt: Date };

/** Ordre d'affichage : urgence décroissante, puis la demande la plus récente en premier. */
export function comparerDemandes(a: PourTri, b: PourTri): number {
  return RANG_URGENCE[a.urgence] - RANG_URGENCE[b.urgence] || b.createdAt.getTime() - a.createdAt.getTime();
}

export function trierDemandes<T extends PourTri>(demandes: T[]): T[] {
  return [...demandes].sort(comparerDemandes);
}

/**
 * Changements de statut autorisés au gestionnaire. Une demande planifiée peut l'être à nouveau
 * (report de l'intervention) et une demande close peut être rouverte (le problème revient),
 * mais on ne passe pas directement d'un statut clos à l'autre.
 */
export const TRANSITIONS: Record<StatutMaintenance, StatutMaintenance[]> = {
  NOUVELLE: ["PRISE_EN_COMPTE", "PLANIFIEE", "RESOLUE", "REFUSEE"],
  PRISE_EN_COMPTE: ["PLANIFIEE", "RESOLUE", "REFUSEE"],
  PLANIFIEE: ["PRISE_EN_COMPTE", "PLANIFIEE", "RESOLUE", "REFUSEE"],
  RESOLUE: ["PRISE_EN_COMPTE"],
  REFUSEE: ["PRISE_EN_COMPTE"],
};

export function transitionAutorisee(de: StatutMaintenance, vers: StatutMaintenance): boolean {
  return TRANSITIONS[de].includes(vers);
}

export type Compteurs = { total: number; ouvertes: number; nouvelles: number; urgentes: number; cloturees: number };

/** Compteurs affichés en tête de liste ; « urgentes » ne compte que les demandes encore ouvertes. */
export function compterDemandes(demandes: { statut: StatutMaintenance; urgence: UrgenceMaintenance }[]): Compteurs {
  const ouvertes = demandes.filter((d) => estOuverte(d.statut));
  return {
    total: demandes.length,
    ouvertes: ouvertes.length,
    nouvelles: demandes.filter((d) => d.statut === "NOUVELLE").length,
    urgentes: ouvertes.filter((d) => d.urgence !== "NORMALE").length,
    cloturees: demandes.length - ouvertes.length,
  };
}

type PourLecture = { luLocataireLe: Date | null; messages: { auteur: AuteurMessage; createdAt: Date }[] };

/** Le locataire a-t-il une réponse du gestionnaire qu'il n'a pas encore ouverte ? */
export function reponseNonLue(d: PourLecture): boolean {
  const dernier = d.messages.reduce<Date | null>((max, m) => (m.auteur === "GESTIONNAIRE" && (!max || m.createdAt > max) ? m.createdAt : max), null);
  return dernier !== null && (!d.luLocataireLe || d.luLocataireLe < dernier);
}

export function compterNonLues(demandes: PourLecture[]): number {
  return demandes.filter(reponseNonLue).length;
}

// ---------------------------------------------------------------------------
// Requêtes
// ---------------------------------------------------------------------------

const messages = { orderBy: { createdAt: "asc" as const } };

export const includeDemande = {
  lot: { include: { immeuble: { select: { id: true, nom: true } }, bailleur: { select: { nom: true, representant: true, email: true } } } },
  bail: { include: { locataires: includeLocataires } },
  locataire: true,
  messages,
} satisfies Prisma.DemandeMaintenanceInclude;

export type DemandeComplete = Prisma.DemandeMaintenanceGetPayload<{ include: typeof includeDemande }>;

const includeListe = { lot: { select: { id: true, nom: true } }, locataire: true, messages } satisfies Prisma.DemandeMaintenanceInclude;

export type DemandeListe = Prisma.DemandeMaintenanceGetPayload<{ include: typeof includeListe }>;

export type FiltresDemandes = { statut?: StatutMaintenance | null; urgence?: UrgenceMaintenance | null; lotId?: number | null };

/** Demandes de l'entité courante, filtrées puis triées par urgence et par date. */
export async function demandesEntite(entiteId: number, filtres: FiltresDemandes = {}): Promise<DemandeListe[]> {
  const demandes = await prisma.demandeMaintenance.findMany({
    where: {
      entiteId,
      ...(filtres.statut ? { statut: filtres.statut } : {}),
      ...(filtres.urgence ? { urgence: filtres.urgence } : {}),
      ...(filtres.lotId ? { lotId: filtres.lotId } : {}),
    },
    include: includeListe,
  });
  return trierDemandes(demandes);
}

export async function demandeEntite(id: number, entiteId: number): Promise<DemandeComplete | null> {
  return prisma.demandeMaintenance.findFirst({ where: { id, entiteId }, include: includeDemande });
}

/** Nombre de demandes en cours (pastille de la barre latérale). */
export async function compterOuvertes(entiteId: number): Promise<number> {
  return prisma.demandeMaintenance.count({ where: { entiteId, statut: { in: STATUTS_OUVERTS } } });
}

/** Demandes rattachées à un lot (encart de la fiche du lot). */
export async function demandesDuLot(lotId: number, entiteId: number): Promise<DemandeListe[]> {
  return trierDemandes(await prisma.demandeMaintenance.findMany({ where: { lotId, entiteId }, include: includeListe }));
}

// --- Côté locataire ---------------------------------------------------------

const includeDemandeLocataire = { lot: { select: { id: true, nom: true } }, bail: { select: { id: true } }, messages } satisfies Prisma.DemandeMaintenanceInclude;

export type DemandeLocataire = Prisma.DemandeMaintenanceGetPayload<{ include: typeof includeDemandeLocataire }>;

export async function demandesDuLocataire(locataireId: number): Promise<DemandeLocataire[]> {
  return trierDemandes(await prisma.demandeMaintenance.findMany({ where: { locataireId }, include: includeDemandeLocataire }));
}

export async function demandeDuLocataire(locataireId: number, id: number): Promise<DemandeLocataire | null> {
  return prisma.demandeMaintenance.findFirst({ where: { id, locataireId }, include: includeDemandeLocataire });
}

/** Baux en cours sur lesquels le locataire peut déposer une demande (un bail signé au minimum). */
export async function bauxPourDemande(locataireId: number) {
  return prisma.bail.findMany({
    where: { statut: "SIGNE", locataires: { some: { id: locataireId } } },
    select: { id: true, entiteId: true, lotId: true, lot: { select: { nom: true, adresse: true, codePostal: true, ville: true } } },
    orderBy: { dateDebut: "desc" },
  });
}

/** Marque les réponses comme lues à l'ouverture de la fiche par le locataire. */
export async function marquerLue(id: number, locataireId: number): Promise<void> {
  await prisma.demandeMaintenance.updateMany({ where: { id, locataireId }, data: { luLocataireLe: new Date() } });
}

/** Nombre de demandes du locataire comportant une réponse non lue (pastille de navigation). */
export async function compterNonLuesLocataire(locataireId: number): Promise<number> {
  const demandes = await prisma.demandeMaintenance.findMany({
    where: { locataireId },
    select: { luLocataireLe: true, messages: { where: { auteur: "GESTIONNAIRE" }, orderBy: { createdAt: "desc" }, take: 1, select: { auteur: true, createdAt: true } } },
  });
  return compterNonLues(demandes);
}
