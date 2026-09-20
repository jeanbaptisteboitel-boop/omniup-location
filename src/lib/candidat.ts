import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Prisma, StatutCandidature } from "@prisma/client";
import { prisma } from "./prisma";
import { jetonValide } from "./espace";

/**
 * Espace candidat : chaque dossier d'une candidature (candidat, colocataire ou caution) dispose de
 * son propre lien d'accès, pour que chacun dépose ses justificatifs sans passer par les autres.
 * Le cookie de session contient ce jeton ; le révoquer coupe l'accès immédiatement.
 */

export const COOKIE_CANDIDAT = "omniup_candidat";
export const DUREE_SESSION_CANDIDAT_S = 30 * 24 * 3600;

export function lienCandidature(origine: string, jeton: string): string {
  return `${origine}/candidature/acces/${jeton}`;
}

export const includeDossier = {
  pieces: { orderBy: { createdAt: "asc" as const } },
  candidature: { include: { lot: true } },
  cautions: { include: { pieces: true }, orderBy: { createdAt: "asc" as const } },
  garantDe: true,
} satisfies Prisma.DossierCandidatureInclude;

export type DossierComplet = Prisma.DossierCandidatureGetPayload<{ include: typeof includeDossier }>;

/** Dossier identifié par le cookie de l'espace candidat, sinon null. */
export async function dossierConnecte(): Promise<DossierComplet | null> {
  const jeton = (await cookies()).get(COOKIE_CANDIDAT)?.value;
  if (!jetonValide(jeton)) return null;
  const d = await prisma.dossierCandidature.findUnique({ where: { accesJeton: jeton }, include: includeDossier });
  if (!d) return null;
  if (!d.accesDernierLe || Date.now() - d.accesDernierLe.getTime() > 3600_000) {
    await prisma.dossierCandidature.update({ where: { id: d.id }, data: { accesDernierLe: new Date() } }).catch(() => undefined);
  }
  return d;
}

export async function exigerDossier(): Promise<DossierComplet> {
  const d = await dossierConnecte();
  if (!d) redirect("/candidature/connexion");
  return d;
}

/**
 * Le dossier reste modifiable tant que le bailleur n'a pas tranché : après le dépôt, le candidat
 * doit pouvoir remplacer une pièce que le bailleur a refusée.
 */
export function dossierModifiable(statut: StatutCandidature): boolean {
  return statut === "BROUILLON" || statut === "TRANSMISE" || statut === "DEPOSEE";
}

export async function exigerDossierModifiable(): Promise<DossierComplet> {
  const d = await exigerDossier();
  if (!dossierModifiable(d.candidature.statut)) redirect("/candidature");
  return d;
}

/** Les dossiers rattachés à une candidature, dans l'ordre : candidats puis leurs cautions. */
export const includeDossiersCandidature = {
  dossiers: {
    include: { pieces: { orderBy: { createdAt: "asc" as const } }, garantDe: true },
    orderBy: [{ role: "asc" as const }, { createdAt: "asc" as const }],
  },
  lot: true,
  bail: true,
} satisfies Prisma.CandidatureInclude;

export type CandidatureComplete = Prisma.CandidatureGetPayload<{ include: typeof includeDossiersCandidature }>;
