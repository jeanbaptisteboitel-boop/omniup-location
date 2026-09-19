"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { avecMessage } from "@/lib/erreurs";
import { erreur, messageErreur, succes, type FormState } from "@/lib/forms";
import { envoyerEmail, mailConfigure } from "@/lib/mail";
import { emailAccesLocataire } from "@/lib/mail-modeles";
import { entiteCourante, entiteCouranteId } from "@/lib/entite";
import { COOKIE_ESPACE, genererJetonAcces, lienAcces, origineApplication } from "@/lib/espace";
import { nomComplet } from "@/lib/libelles";
import { exigerEcriture } from "@/lib/droits";

async function locataireDeLEntite(id: number) {
  return prisma.locataire.findFirst({ where: { id, entiteId: await entiteCouranteId() } });
}

/** Crée le lien d'accès personnel du locataire (gestionnaire). */
export async function creerAccesLocataire(fd: FormData): Promise<void> {
  await exigerEcriture();
  const id = Number(fd.get("id"));
  const l = await locataireDeLEntite(id);
  if (!l) redirect("/locataires");
  if (!l.accesJeton) await prisma.locataire.update({ where: { id }, data: { accesJeton: genererJetonAcces(), accesCreeLe: new Date(), accesEnvoyeLe: null, accesDernierLe: null } });
  revalidatePath(`/locataires/${id}`);
  redirect(avecMessage(`/locataires/${id}`, "Accès à l'espace locataire créé : envoyez le lien par email ou copiez-le pour le transmettre."));
}

/** Révoque le lien (le locataire est déconnecté immédiatement). */
export async function revoquerAccesLocataire(fd: FormData): Promise<void> {
  await exigerEcriture();
  const id = Number(fd.get("id"));
  const l = await locataireDeLEntite(id);
  if (!l) redirect("/locataires");
  await prisma.locataire.update({ where: { id }, data: { accesJeton: null, accesCreeLe: null, accesEnvoyeLe: null, accesDernierLe: null } });
  revalidatePath(`/locataires/${id}`);
  redirect(avecMessage(`/locataires/${id}`, "Accès révoqué : l'ancien lien ne fonctionne plus. Vous pouvez en créer un nouveau."));
}

/** Envoie (ou renvoie) le lien d'accès par email au locataire. */
export async function envoyerAccesLocataire(fd: FormData): Promise<void> {
  await exigerEcriture();
  const id = Number(fd.get("id"));
  const l = await locataireDeLEntite(id);
  if (!l) redirect("/locataires");
  if (!l.email) redirect(avecMessage(`/locataires/${id}`, "Le locataire n'a pas d'adresse email : ajoutez-la dans sa fiche ou copiez le lien.", "erreur"));
  if (!mailConfigure()) redirect(avecMessage(`/locataires/${id}`, "L'envoi d'emails n'est pas configuré (voir Paramètres) : copiez le lien pour le transmettre.", "erreur"));
  const jeton = l.accesJeton ?? genererJetonAcces();
  if (!l.accesJeton) await prisma.locataire.update({ where: { id }, data: { accesJeton: jeton, accesCreeLe: new Date() } });
  const [origine, entite] = await Promise.all([origineApplication(), entiteCourante()]);
  const modele = emailAccesLocataire(l, lienAcces(origine, jeton), entite.nom);
  try {
    await envoyerEmail({ a: l.email, objet: modele.objet, texte: modele.corps });
  } catch (e) {
    redirect(avecMessage(`/locataires/${id}`, `Échec de l'envoi : ${messageErreur(e)}`, "erreur"));
  }
  await prisma.locataire.update({ where: { id }, data: { accesEnvoyeLe: new Date() } });
  revalidatePath(`/locataires/${id}`);
  redirect(avecMessage(`/locataires/${id}`, `Lien d'accès envoyé à ${l.email}.`));
}

// ---------------------------------------------------------------------------
// Côté locataire
// ---------------------------------------------------------------------------

export async function seDeconnecterEspace(): Promise<void> {
  (await cookies()).delete(COOKIE_ESPACE);
  redirect("/espace/connexion?message=" + encodeURIComponent("Vous êtes déconnecté."));
}

/** Lien perdu : renvoi par email si un accès existe pour cette adresse (réponse identique dans tous les cas). */
export async function demanderLienAcces(_prev: FormState, fd: FormData): Promise<FormState> {
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return erreur(fd, "Indiquez une adresse email valide.");
  if (!mailConfigure()) return erreur(fd, "L'envoi automatique n'est pas disponible : demandez votre lien d'accès à votre bailleur.");
  const locataires = await prisma.locataire.findMany({ where: { email: { equals: email, mode: "insensitive" }, accesJeton: { not: null } }, include: { entite: true } });
  const origine = await origineApplication();
  for (const l of locataires) {
    try {
      const modele = emailAccesLocataire(l, lienAcces(origine, l.accesJeton!), l.entite.nom);
      await envoyerEmail({ a: l.email!, objet: modele.objet, texte: modele.corps });
      await prisma.locataire.update({ where: { id: l.id }, data: { accesEnvoyeLe: new Date() } });
    } catch {
      /* réponse identique quoi qu'il arrive : pas d'indication sur l'existence d'un accès */
    }
  }
  return succes(`Si un accès existe pour ${email}, un email contenant votre lien vient d'être envoyé. Pensez à vérifier vos courriers indésirables.`);
}

/** Libellé pour les messages du gestionnaire. */
export async function nomLocataire(id: number): Promise<string> {
  const l = await locataireDeLEntite(id);
  return l ? nomComplet(l) : "";
}
