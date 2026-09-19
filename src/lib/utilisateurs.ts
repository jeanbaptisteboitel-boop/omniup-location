import "server-only";
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { RoleEntite } from "@prisma/client";
import { prisma } from "./prisma";
import { COOKIE_SESSION, analyserJeton, protectionActive } from "./session";

/**
 * Comptes des gestionnaires : le super-administrateur (cabinet) accède à toutes les entités ;
 * les autres utilisateurs ont un rôle par entité (administrateur, gestionnaire ou lecture seule).
 * Sans APP_PASSWORD ni APP_SECRET (protection inactive), l'application se comporte comme le compte principal.
 */

export type AccesSession = { entiteId: number; role: RoleEntite };
export type Session = {
  type: "principal" | "utilisateur";
  utilisateurId: number | null;
  nom: string;
  email: string | null;
  superAdmin: boolean;
  acces: AccesSession[];
};

export const MOT_DE_PASSE_MIN = 8;
/** Validité d'un lien d'invitation (7 jours) et d'un lien de réinitialisation (2 heures). */
export const DUREE_INVITATION_MS = 7 * 24 * 3600_000;
export const DUREE_REINITIALISATION_MS = 2 * 3600_000;

/** Vrai si un lien (invitation ou réinitialisation) a été émis il y a moins de deux minutes : évite les envois en rafale. */
export function lienToutJusteEnvoye(expireLe: Date | null | undefined, maintenant = Date.now()): boolean {
  if (!expireLe) return false;
  const restant = expireLe.getTime() - maintenant;
  return [DUREE_INVITATION_MS, DUREE_REINITIALISATION_MS].some((duree) => restant > duree - 2 * 60_000 && restant <= duree);
}
export const ROLES: Record<RoleEntite, string> = { ADMINISTRATEUR: "Administrateur", GESTIONNAIRE: "Gestionnaire", LECTURE: "Lecture seule" };
export const DESCRIPTIONS_ROLES: Record<RoleEntite, string> = {
  ADMINISTRATEUR: "Toutes les opérations, les paramètres de l'entité et la gestion de ses utilisateurs.",
  GESTIONNAIRE: "Toutes les opérations courantes (patrimoine, locataires, baux, loyers, dépenses, documents), sans gérer les utilisateurs.",
  LECTURE: "Consultation uniquement : aucune création, modification ni envoi.",
};

const PRINCIPAL: Session = { type: "principal", utilisateurId: null, nom: "Compte principal", email: null, superAdmin: true, acces: [] };

export function hacherMotDePasse(motDePasse: string): string {
  const sel = randomBytes(16).toString("hex");
  return `scrypt$${sel}$${scryptSync(motDePasse, sel, 64).toString("hex")}`;
}

export function verifierMotDePasse(motDePasse: string, stocke: string | null | undefined): boolean {
  if (!stocke) return false;
  const [algo, sel, empreinte] = stocke.split("$");
  if (algo !== "scrypt" || !sel || !empreinte) return false;
  const calcule = scryptSync(motDePasse, sel, 64);
  const attendu = Buffer.from(empreinte, "hex");
  return calcule.length === attendu.length && timingSafeEqual(calcule, attendu);
}

export function genererJetonInvitation(): string {
  return randomBytes(32).toString("hex");
}

/** Problème de robustesse d'un mot de passe, sinon null. */
export function problemeMotDePasse(motDePasse: string, confirmation?: string): string | null {
  if (motDePasse.length < MOT_DE_PASSE_MIN) return `Le mot de passe doit comporter au moins ${MOT_DE_PASSE_MIN} caractères.`;
  if (confirmation !== undefined && motDePasse !== confirmation) return "Les deux saisies du mot de passe ne correspondent pas.";
  return null;
}

/** Session du gestionnaire connecté : compte principal, utilisateur, ou null (non connecté ou compte désactivé). */
export async function sessionCourante(): Promise<Session | null> {
  if (!protectionActive()) return PRINCIPAL;
  const jeton = await analyserJeton((await cookies()).get(COOKIE_SESSION)?.value);
  if (!jeton) return null;
  if (jeton.utilisateurId === null) return PRINCIPAL;
  const u = await prisma.utilisateur.findUnique({ where: { id: jeton.utilisateurId }, include: { acces: true } });
  if (!u || !u.actif) return null;
  return { type: "utilisateur", utilisateurId: u.id, nom: u.nom, email: u.email, superAdmin: u.superAdmin, acces: u.acces.map((a) => ({ entiteId: a.entiteId, role: a.role })) };
}

export async function exigerSession(): Promise<Session> {
  const s = await sessionCourante();
  if (!s) redirect("/connexion");
  return s;
}

/** Rôle effectif sur une entité (le super-administrateur est administrateur partout). */
export function roleSur(session: Session, entiteId: number): RoleEntite | null {
  if (session.superAdmin) return "ADMINISTRATEUR";
  return session.acces.find((a) => a.entiteId === entiteId)?.role ?? null;
}

export function peutEcrire(session: Session, entiteId: number): boolean {
  const r = roleSur(session, entiteId);
  return r === "ADMINISTRATEUR" || r === "GESTIONNAIRE";
}

export function estAdministrateur(session: Session, entiteId: number): boolean {
  return roleSur(session, entiteId) === "ADMINISTRATEUR";
}

/** Administre au moins une entité : accès à la page Utilisateurs. */
export function administreUneEntite(session: Session): boolean {
  return session.superAdmin || session.acces.some((a) => a.role === "ADMINISTRATEUR");
}

/** Entités administrées : « toutes » pour le super-administrateur, sinon la liste des identifiants. */
export function entitesAdministrees(session: Session): number[] | "toutes" {
  return session.superAdmin ? "toutes" : session.acces.filter((a) => a.role === "ADMINISTRATEUR").map((a) => a.entiteId);
}

/** Entités accessibles (lecture au moins). */
export function entitesAccessibles(session: Session): number[] | "toutes" {
  return session.superAdmin ? "toutes" : session.acces.map((a) => a.entiteId);
}

export async function ouvrirSession(utilisateurId?: number): Promise<void> {
  const { creerJeton } = await import("./session");
  const jeton = await creerJeton(utilisateurId);
  (await cookies()).set(COOKIE_SESSION, jeton.valeur, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: jeton.maxAge });
}

export async function fermerSession(): Promise<void> {
  (await cookies()).delete(COOKIE_SESSION);
}

export async function aucunUtilisateur(): Promise<boolean> {
  return (await prisma.utilisateur.count()) === 0;
}
