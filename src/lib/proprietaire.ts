import "server-only";
import { randomBytes } from "node:crypto";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import type { Bailleur, Prisma, StatutBail } from "@prisma/client";
import { prisma } from "./prisma";
import { includeLocataires } from "./locataires";
import { aujourdhui } from "./dates";
import { etatAppel, type StatutAppel } from "./loyers";
import { arrondir2, somme } from "./montants";

/**
 * Espace propriétaire : chaque bailleur dispose d'un jeton d'accès personnel (lien), créé par le gestionnaire.
 * Le cookie de session contient ce jeton ; le révoquer déconnecte immédiatement le bailleur.
 * Indépendant de l'espace locataire (src/lib/espace.ts) : mêmes principes, mais cookie et périmètre distincts.
 */

export const COOKIE_PROPRIETAIRE = "omniup_proprietaire";
export const DUREE_SESSION_PROPRIETAIRE_S = 90 * 24 * 3600;
const FORMAT_JETON = /^[a-f0-9]{64}$/;

export function genererJetonAccesProprietaire(): string {
  return randomBytes(32).toString("hex");
}

export function jetonProprietaireValide(jeton: string | undefined | null): jeton is string {
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

export function lienAccesProprietaire(origine: string, jeton: string): string {
  return `${origine}/proprietaire/acces/${jeton}`;
}

/** Bailleur identifié par le cookie de l'espace propriétaire, sinon null. */
export async function bailleurConnecte(): Promise<Bailleur | null> {
  const jeton = (await cookies()).get(COOKIE_PROPRIETAIRE)?.value;
  if (!jetonProprietaireValide(jeton)) return null;
  const b = await prisma.bailleur.findUnique({ where: { accesJeton: jeton } });
  if (!b) return null;
  if (!b.accesDernierLe || Date.now() - b.accesDernierLe.getTime() > 3600_000) {
    await prisma.bailleur.update({ where: { id: b.id }, data: { accesDernierLe: new Date() } }).catch(() => undefined);
  }
  return b;
}

export async function exigerBailleur(): Promise<Bailleur> {
  const b = await bailleurConnecte();
  if (!b) redirect("/proprietaire/connexion");
  return b;
}

// ---------------------------------------------------------------------------
// Requêtes : lots, baux, appels et dépenses du bailleur
// ---------------------------------------------------------------------------

/** Baux visibles par le propriétaire : en signature, signés ou terminés (les brouillons restent internes au gestionnaire). */
const STATUTS_VISIBLES: StatutBail[] = ["EN_SIGNATURE", "SIGNE", "TERMINE"];

export const includeLotProprietaire = {
  immeuble: true,
  baux: {
    where: { statut: { in: STATUTS_VISIBLES } },
    orderBy: { dateDebut: "desc" as const },
    include: {
      locataires: includeLocataires,
      appels: { orderBy: { periode: "desc" as const }, include: { paiements: { orderBy: { date: "asc" as const } } } },
    },
  },
} satisfies Prisma.LotInclude;

export type LotProprietaire = Prisma.LotGetPayload<{ include: typeof includeLotProprietaire }>;
export type BailProprietaire = LotProprietaire["baux"][number];
export type AppelProprietaire = BailProprietaire["appels"][number];

/** Lots du bailleur (lot.bailleurId), avec immeuble, baux, locataires, appels et paiements. */
export async function lotsDuBailleur(bailleurId: number): Promise<LotProprietaire[]> {
  return prisma.lot.findMany({ where: { bailleurId }, include: includeLotProprietaire, orderBy: [{ ville: "asc" }, { nom: "asc" }] });
}

export async function lotDuBailleur(bailleurId: number, lotId: number): Promise<LotProprietaire | null> {
  return prisma.lot.findFirst({ where: { id: lotId, bailleurId }, include: includeLotProprietaire });
}

/** Dépenses du bailleur : celles de ses lots et de ses immeubles (dépenses communes). */
export function whereDepensesDuBailleur(bailleurId: number): Prisma.DepenseWhereInput {
  return { OR: [{ lot: { bailleurId } }, { immeuble: { bailleurId } }] };
}

export const includeDepenseProprietaire = {
  lot: { select: { id: true, nom: true } },
  immeuble: { select: { id: true, nom: true } },
} satisfies Prisma.DepenseInclude;

export type DepenseProprietaire = Prisma.DepenseGetPayload<{ include: typeof includeDepenseProprietaire }>;

export async function depensesDuBailleur(bailleurId: number, filtre: { lotId?: number } = {}): Promise<DepenseProprietaire[]> {
  return prisma.depense.findMany({
    where: { ...whereDepensesDuBailleur(bailleurId), ...(filtre.lotId ? { lotId: filtre.lotId } : {}) },
    include: includeDepenseProprietaire,
    orderBy: [{ date: "desc" }, { id: "desc" }],
  });
}

// ---------------------------------------------------------------------------
// Calculs : lots loués, encaissements, reste dû
// ---------------------------------------------------------------------------

/** Bail en cours d'un lot : le bail signé (même règle que la fiche du lot côté gestionnaire). */
export function bailEnCours<B extends { statut: StatutBail }>(baux: B[]): B | null {
  return baux.find((b) => b.statut === "SIGNE") ?? null;
}

export type LigneSolde<A> = { appel: A; etat: { regle: number; reste: number; statut: StatutAppel } };
export type Solde<A> = { total: number; enRetard: number; lignes: LigneSolde<A>[]; dus: LigneSolde<A>[] };

/** Reste dû d'une liste d'appels : appels non soldés (en retard, partiels ou à venir) et part en retard. */
export function soldeAppels<A extends { total: number; dateEcheance: Date; paiements: { montant: number }[] }>(appels: A[], auj = aujourdhui()): Solde<A> {
  const lignes = appels.map((appel) => ({ appel, etat: etatAppel(appel, auj) }));
  const dus = lignes.filter((x) => x.etat.reste > 0);
  return { total: arrondir2(somme(dus.map((x) => x.etat.reste))), enRetard: arrondir2(somme(dus.filter((x) => x.etat.statut === "EN_RETARD").map((x) => x.etat.reste))), lignes, dus };
}

/** Appels de loyer de tous les baux d'un lot, chacun avec son bail, du plus récent au plus ancien. */
export function appelsDuLot<B extends { appels: { periode: string }[] }>(lot: { baux: B[] }): { appel: B["appels"][number]; bail: B }[] {
  return lot.baux
    .flatMap((bail) => bail.appels.map((appel) => ({ appel, bail })))
    .sort((x, y) => (x.appel.periode < y.appel.periode ? 1 : x.appel.periode > y.appel.periode ? -1 : 0));
}

/** Loyers encaissés sur une année civile : paiements datés de l'année, sur les appels des baux du lot. */
export function encaisseSurAnnee(lot: { baux: { appels: { paiements: { date: Date; montant: number }[] }[] }[] }, annee: number): number {
  return somme(lot.baux.flatMap((b) => b.appels.flatMap((a) => a.paiements.filter((p) => p.date.getUTCFullYear() === annee).map((p) => p.montant))));
}

export type ResumeLot = { lot: LotProprietaire; bail: BailProprietaire | null; solde: Solde<AppelProprietaire>; encaisse: number };

/** Indicateurs d'un lot : bail en cours, reste dû (tous baux confondus) et encaissements de l'année. */
export function resumerLot(lot: LotProprietaire, annee: number, auj = aujourdhui()): ResumeLot {
  return { lot, bail: bailEnCours(lot.baux), solde: soldeAppels(lot.baux.flatMap((b) => b.appels), auj), encaisse: encaisseSurAnnee(lot, annee) };
}

export type ResumePatrimoine = { lignes: ResumeLot[]; loues: number; vacants: number; encaisse: number; resteDu: number; enRetard: number };

/** Indicateurs de l'accueil : lots loués / vacants, loyers encaissés sur l'année, reste dû et part en retard. */
export function resumerPatrimoine(lots: LotProprietaire[], annee: number, auj = aujourdhui()): ResumePatrimoine {
  const lignes = lots.map((l) => resumerLot(l, annee, auj));
  return {
    lignes,
    loues: lignes.filter((x) => x.bail).length,
    vacants: lignes.filter((x) => !x.bail).length,
    encaisse: somme(lignes.map((x) => x.encaisse)),
    resteDu: somme(lignes.map((x) => x.solde.total)),
    enRetard: somme(lignes.map((x) => x.solde.enRetard)),
  };
}
