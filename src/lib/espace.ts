import "server-only";
import { randomBytes } from "node:crypto";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import type { Locataire, Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { includeLocataires } from "./locataires";
import { aujourdhui } from "./dates";
import { etatAppel, type StatutAppel } from "./loyers";
import { arrondir2, somme } from "./montants";

/**
 * Espace locataire : chaque locataire dispose d'un jeton d'accès personnel (lien), créé par le gestionnaire.
 * Le cookie de session contient ce jeton ; le révoquer déconnecte immédiatement le locataire.
 */

export const COOKIE_ESPACE = "omniup_locataire";
export const DUREE_SESSION_ESPACE_S = 90 * 24 * 3600;
const FORMAT_JETON = /^[a-f0-9]{64}$/;

export function genererJetonAcces(): string {
  return randomBytes(32).toString("hex");
}

export function jetonValide(jeton: string | undefined | null): jeton is string {
  return !!jeton && FORMAT_JETON.test(jeton);
}

/** Adresse publique de l'application (APP_URL, sinon l'hôte de la requête). */
export async function origineApplication(): Promise<string> {
  const app = (process.env.APP_URL ?? "")
    .split(",")
    .map((o) => o.trim().replace(/\/+$/, ""))
    .find(Boolean);
  if (app) return app;
  const h = await headers();
  const hote = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (/^(localhost|127\.)/.test(hote) ? "http" : "https");
  return `${proto}://${hote}`;
}

export function lienAcces(origine: string, jeton: string): string {
  return `${origine}/espace/acces/${jeton}`;
}

/** Locataire identifié par le cookie de l'espace locataire, sinon null. */
export async function locataireConnecte(): Promise<Locataire | null> {
  const jeton = (await cookies()).get(COOKIE_ESPACE)?.value;
  if (!jetonValide(jeton)) return null;
  const l = await prisma.locataire.findUnique({ where: { accesJeton: jeton } });
  if (!l) return null;
  if (!l.accesDernierLe || Date.now() - l.accesDernierLe.getTime() > 3600_000) {
    await prisma.locataire.update({ where: { id: l.id }, data: { accesDernierLe: new Date() } }).catch(() => undefined);
  }
  return l;
}

export async function exigerLocataire(): Promise<Locataire> {
  const l = await locataireConnecte();
  if (!l) redirect("/espace/connexion");
  return l;
}

/** Baux visibles par le locataire : en signature, signés ou terminés (les brouillons restent internes). */
export const includeBailEspace = {
  lot: { include: { bailleur: true } },
  locataires: includeLocataires,
  appels: { orderBy: { periode: "desc" as const }, include: { paiements: { orderBy: { date: "asc" as const } } } },
  courriers: { where: { dateEnvoi: { not: null } }, orderBy: { dateEnvoi: "desc" as const } },
  documents: { where: { dateEnvoi: { not: null } }, orderBy: { dateEnvoi: "desc" as const } },
} satisfies Prisma.BailInclude;

export type BailEspace = Prisma.BailGetPayload<{ include: typeof includeBailEspace }>;

const STATUTS_VISIBLES = ["EN_SIGNATURE", "SIGNE", "TERMINE"] as const;

export async function bauxDuLocataire(locataireId: number): Promise<BailEspace[]> {
  return prisma.bail.findMany({
    where: { locataires: { some: { id: locataireId } }, statut: { in: [...STATUTS_VISIBLES] } },
    include: includeBailEspace,
    orderBy: [{ statut: "asc" }, { dateDebut: "desc" }],
  });
}

export async function bailDuLocataire(locataireId: number, bailId: number): Promise<BailEspace | null> {
  return prisma.bail.findFirst({ where: { id: bailId, locataires: { some: { id: locataireId } }, statut: { in: [...STATUTS_VISIBLES] } }, include: includeBailEspace });
}

export type LigneSolde<A> = { appel: A; etat: { regle: number; reste: number; statut: StatutAppel } };

/** Solde dû d'un bail : appels non soldés (retard, partiel ou à venir). */
export function soldeBail<A extends { total: number; dateEcheance: Date; paiements: { montant: number }[] }>(appels: A[], auj = aujourdhui()): { total: number; enRetard: number; lignes: LigneSolde<A>[]; dus: LigneSolde<A>[] } {
  const lignes = appels.map((appel) => ({ appel, etat: etatAppel(appel, auj) }));
  const dus = lignes.filter((x) => x.etat.reste > 0);
  return { total: arrondir2(somme(dus.map((x) => x.etat.reste))), enRetard: arrondir2(somme(dus.filter((x) => x.etat.statut === "EN_RETARD").map((x) => x.etat.reste))), lignes, dus };
}
