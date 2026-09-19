"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { echec, erreur, succes, type FormState } from "@/lib/forms";
import { motDePassePrincipalDefini, motDePasseValide, protectionActive } from "@/lib/session";
import { DUREE_REINITIALISATION_MS, aucunUtilisateur, fermerSession, genererJetonInvitation, hacherMotDePasse, lienToutJusteEnvoye, ouvrirSession, problemeMotDePasse, verifierMotDePasse } from "@/lib/utilisateurs";
import { verifierTurnstile } from "@/lib/turnstile";
import { envoyerEmail, mailConfigure } from "@/lib/mail";
import { emailReinitialisationMotDePasse } from "@/lib/mail-modeles";
import { origineApplication } from "@/lib/espace";

const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function suiteSure(fd: FormData): string {
  const suite = String(fd.get("suite") ?? "");
  return suite.startsWith("/") && !suite.startsWith("//") ? suite : "/";
}

/** Connexion par email et mot de passe, ou par le mot de passe principal (formulaire sans email). */
export async function seConnecter(_prev: FormState, fd: FormData): Promise<FormState> {
  if (!protectionActive()) redirect("/");
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  const motDePasse = String(fd.get("motDePasse") ?? "");
  fd.delete("motDePasse");
  if (email) {
    const pb = await verifierTurnstile(fd);
    if (pb) return erreur(fd, pb);
    const u = await prisma.utilisateur.findUnique({ where: { email } });
    if (!u || !u.actif || !verifierMotDePasse(motDePasse, u.motDePasse)) {
      await pause(500);
      return erreur(fd, u && u.actif && !u.motDePasse ? "Votre mot de passe n'est pas encore défini : ouvrez le lien d'invitation reçu par email, ou demandez-en un nouveau." : "Email ou mot de passe incorrect.");
    }
    await ouvrirSession(u.id);
    await prisma.utilisateur.update({ where: { id: u.id }, data: { derniereConnexion: new Date() } });
  } else {
    if (!motDePassePrincipalDefini()) return erreur(fd, "Indiquez votre adresse email.");
    const pb = await verifierTurnstile(fd);
    if (pb) return erreur(null, pb);
    if (!(await motDePasseValide(motDePasse))) {
      await pause(500);
      return erreur(null, "Mot de passe incorrect.");
    }
    await ouvrirSession();
  }
  redirect(suiteSure(fd));
}

export async function seDeconnecter(): Promise<void> {
  await fermerSession();
  redirect("/connexion");
}

/** Premier compte (super-administrateur), protégé par le mot de passe principal s'il est défini. */
export async function creerPremierAdministrateur(_prev: FormState, fd: FormData): Promise<FormState> {
  if (!protectionActive()) redirect("/");
  const nom = String(fd.get("nom") ?? "").trim();
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  const motDePasse = String(fd.get("motDePasse") ?? "");
  const confirmation = String(fd.get("confirmation") ?? "");
  const principal = String(fd.get("motDePassePrincipal") ?? "");
  fd.delete("motDePasse");
  fd.delete("confirmation");
  fd.delete("motDePassePrincipal");
  const pb = await verifierTurnstile(fd);
  if (pb) return erreur(fd, pb);
  if (!(await aucunUtilisateur())) return erreur(fd, "Un compte existe déjà : connectez-vous.");
  const errors: Record<string, string> = {};
  if (!nom) errors.nom = "Champ obligatoire";
  if (!EMAIL.test(email)) errors.email = "Adresse email invalide";
  const pbMdp = problemeMotDePasse(motDePasse, confirmation);
  if (pbMdp) errors.motDePasse = pbMdp;
  if (motDePassePrincipalDefini() && !(await motDePasseValide(principal))) {
    await pause(500);
    errors.motDePassePrincipal = "Mot de passe principal incorrect.";
  }
  if (Object.keys(errors).length) return echec(fd, errors);
  const u = await prisma.utilisateur.create({ data: { nom, email, motDePasse: hacherMotDePasse(motDePasse), superAdmin: true, derniereConnexion: new Date() } });
  await ouvrirSession(u.id);
  redirect("/?message=" + encodeURIComponent(`Bienvenue ${nom} : votre compte administrateur est créé.`));
}

/** Mot de passe oublié : envoi d'un lien de réinitialisation (réponse identique qu'un compte existe ou non). */
export async function demanderReinitialisation(_prev: FormState, fd: FormData): Promise<FormState> {
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  if (!EMAIL.test(email)) return erreur(fd, "Indiquez une adresse email valide.");
  const pb = await verifierTurnstile(fd);
  if (pb) return erreur(fd, pb);
  if (!mailConfigure()) return erreur(fd, "L'envoi d'emails n'est pas configuré : demandez à un administrateur de vous renvoyer une invitation.");
  const u = await prisma.utilisateur.findUnique({ where: { email } });
  if (u && u.actif && !lienToutJusteEnvoye(u.jetonExpireLe)) {
    const jeton = genererJetonInvitation();
    await prisma.utilisateur.update({ where: { id: u.id }, data: { jetonInvitation: jeton, jetonExpireLe: new Date(Date.now() + DUREE_REINITIALISATION_MS) } });
    const modele = emailReinitialisationMotDePasse(u.nom, `${await origineApplication()}/connexion/definir/${jeton}`);
    try {
      await envoyerEmail({ a: u.email, objet: modele.objet, texte: modele.corps });
    } catch {
      /* réponse identique : aucune indication sur l'existence du compte */
    }
  }
  return succes(`Si un compte existe pour ${email}, un email contenant un lien de réinitialisation vient d'être envoyé (valable 2 heures).`);
}

/** Choix du mot de passe depuis un lien d'invitation ou de réinitialisation. */
export async function definirMotDePasse(_prev: FormState, fd: FormData): Promise<FormState> {
  const jeton = String(fd.get("jeton") ?? "").trim();
  const motDePasse = String(fd.get("motDePasse") ?? "");
  const confirmation = String(fd.get("confirmation") ?? "");
  fd.delete("motDePasse");
  fd.delete("confirmation");
  if (!/^[a-f0-9]{64}$/.test(jeton)) return erreur(fd, "Lien invalide.");
  const u = await prisma.utilisateur.findUnique({ where: { jetonInvitation: jeton } });
  if (!u || !u.actif || !u.jetonExpireLe || u.jetonExpireLe.getTime() < Date.now()) return erreur(fd, "Ce lien n'est plus valable : demandez un nouveau lien (mot de passe oublié) ou une nouvelle invitation.");
  const pb = problemeMotDePasse(motDePasse, confirmation);
  if (pb) return echec(fd, { motDePasse: pb });
  await prisma.utilisateur.update({ where: { id: u.id }, data: { motDePasse: hacherMotDePasse(motDePasse), jetonInvitation: null, jetonExpireLe: null, derniereConnexion: new Date() } });
  if (protectionActive()) await ouvrirSession(u.id);
  redirect("/?message=" + encodeURIComponent("Mot de passe enregistré : vous êtes connecté."));
}
