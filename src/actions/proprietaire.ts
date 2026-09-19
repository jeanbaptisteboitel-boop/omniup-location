"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { avecMessage } from "@/lib/erreurs";
import { exigerEcriture } from "@/lib/droits";
import { erreur, messageErreur, succes, type FormState } from "@/lib/forms";
import { envoyerEmail, mailConfigure } from "@/lib/mail";
import { emailAccesBailleur } from "@/lib/mail-modeles";
import { entiteCourante, entiteCouranteId } from "@/lib/entite";
import { verifierTurnstile } from "@/lib/turnstile";
import { COOKIE_PROPRIETAIRE, genererJetonAccesProprietaire, lienAccesProprietaire, origineApplication } from "@/lib/proprietaire";

/** Délai minimal entre deux renvois du lien depuis le formulaire public « lien perdu ». */
const DELAI_RENVOI_MS = 2 * 60_000;

async function bailleurDeLEntite(id: number) {
  return prisma.bailleur.findFirst({ where: { id, entiteId: await entiteCouranteId() } });
}

/** Crée le lien d'accès personnel du bailleur à l'espace propriétaire (gestionnaire). */
export async function creerAccesBailleur(fd: FormData): Promise<void> {
  await exigerEcriture();
  const id = Number(fd.get("id"));
  const b = await bailleurDeLEntite(id);
  if (!b) redirect("/bailleurs");
  if (!b.accesJeton) await prisma.bailleur.update({ where: { id }, data: { accesJeton: genererJetonAccesProprietaire(), accesCreeLe: new Date(), accesEnvoyeLe: null, accesDernierLe: null } });
  revalidatePath(`/bailleurs/${id}`);
  redirect(avecMessage(`/bailleurs/${id}`, "Accès à l'espace propriétaire créé : envoyez le lien par email ou copiez-le pour le transmettre."));
}

/** Révoque le lien (le bailleur est déconnecté immédiatement). */
export async function revoquerAccesBailleur(fd: FormData): Promise<void> {
  await exigerEcriture();
  const id = Number(fd.get("id"));
  const b = await bailleurDeLEntite(id);
  if (!b) redirect("/bailleurs");
  await prisma.bailleur.update({ where: { id }, data: { accesJeton: null, accesCreeLe: null, accesEnvoyeLe: null, accesDernierLe: null } });
  revalidatePath(`/bailleurs/${id}`);
  redirect(avecMessage(`/bailleurs/${id}`, "Accès révoqué : l'ancien lien ne fonctionne plus. Vous pouvez en créer un nouveau."));
}

/** Envoie (ou renvoie) le lien d'accès par email au bailleur, au nom de l'entité courante. */
export async function envoyerAccesBailleur(fd: FormData): Promise<void> {
  await exigerEcriture();
  const id = Number(fd.get("id"));
  const b = await bailleurDeLEntite(id);
  if (!b) redirect("/bailleurs");
  if (!b.email) redirect(avecMessage(`/bailleurs/${id}`, "Le bailleur n'a pas d'adresse email : ajoutez-la dans sa fiche ou copiez le lien.", "erreur"));
  if (!mailConfigure()) redirect(avecMessage(`/bailleurs/${id}`, "L'envoi d'emails n'est pas configuré (voir Paramètres) : copiez le lien pour le transmettre.", "erreur"));
  const jeton = b.accesJeton ?? genererJetonAccesProprietaire();
  if (!b.accesJeton) await prisma.bailleur.update({ where: { id }, data: { accesJeton: jeton, accesCreeLe: new Date() } });
  const [origine, entite] = await Promise.all([origineApplication(), entiteCourante()]);
  const modele = emailAccesBailleur(b, lienAccesProprietaire(origine, jeton), entite.nom);
  try {
    await envoyerEmail({ a: b.email, objet: modele.objet, texte: modele.corps });
  } catch (e) {
    redirect(avecMessage(`/bailleurs/${id}`, `Échec de l'envoi : ${messageErreur(e)}`, "erreur"));
  }
  await prisma.bailleur.update({ where: { id }, data: { accesEnvoyeLe: new Date() } });
  revalidatePath(`/bailleurs/${id}`);
  redirect(avecMessage(`/bailleurs/${id}`, `Lien d'accès envoyé à ${b.email}.`));
}

// ---------------------------------------------------------------------------
// Côté propriétaire
// ---------------------------------------------------------------------------

export async function seDeconnecterProprietaire(): Promise<void> {
  (await cookies()).delete(COOKIE_PROPRIETAIRE);
  redirect("/proprietaire/connexion?message=" + encodeURIComponent("Vous êtes déconnecté."));
}

/**
 * Lien perdu : renvoi par email si un accès existe pour cette adresse.
 * La réponse est identique qu'un accès existe ou non ; un lien déjà envoyé depuis moins de deux minutes n'est pas renvoyé.
 */
export async function demanderLienAccesProprietaire(_prev: FormState, fd: FormData): Promise<FormState> {
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return erreur(fd, "Indiquez une adresse email valide.");
  const controle = await verifierTurnstile(fd);
  if (controle) return erreur(fd, controle);
  if (!mailConfigure()) return erreur(fd, "L'envoi automatique n'est pas disponible : demandez votre lien d'accès à votre gestionnaire.");
  const bailleurs = await prisma.bailleur.findMany({ where: { email: { equals: email, mode: "insensitive" }, accesJeton: { not: null } }, include: { entite: true } });
  const origine = await origineApplication();
  const maintenant = Date.now();
  for (const b of bailleurs) {
    if (b.accesEnvoyeLe && maintenant - b.accesEnvoyeLe.getTime() < DELAI_RENVOI_MS) continue;
    try {
      const modele = emailAccesBailleur(b, lienAccesProprietaire(origine, b.accesJeton!), b.entite.nom);
      await envoyerEmail({ a: b.email!, objet: modele.objet, texte: modele.corps });
      await prisma.bailleur.update({ where: { id: b.id }, data: { accesEnvoyeLe: new Date() } });
    } catch {
      /* réponse identique quoi qu'il arrive : pas d'indication sur l'existence d'un accès */
    }
  }
  return succes(`Si un accès existe pour ${email}, un email contenant votre lien vient d'être envoyé. Pensez à vérifier vos courriers indésirables.`);
}
