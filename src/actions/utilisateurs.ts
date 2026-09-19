"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { RoleEntite } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { echec, erreur, messageErreur, succes, type FormState } from "@/lib/forms";
import { avecMessage } from "@/lib/erreurs";
import { analyser, zBool, zEnum, zTexte, zTexteOpt } from "@/lib/validation";
import { DUREE_INVITATION_MS, ROLES, entitesAdministrees, exigerSession, genererJetonInvitation, hacherMotDePasse, problemeMotDePasse, verifierMotDePasse, type Session } from "@/lib/utilisateurs";
import { envoyerEmail, mailConfigure } from "@/lib/mail";
import { emailInvitationUtilisateur } from "@/lib/mail-modeles";
import { origineApplication } from "@/lib/espace";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Session administrant au moins une entité, sinon retour à l'accueil. */
async function exigerAdministrateur(): Promise<Session> {
  const session = await exigerSession();
  if (entitesAdministrees(session) !== "toutes" && entitesAdministrees(session).length === 0) redirect(avecMessage("/", "Page réservée aux administrateurs.", "erreur"));
  return session;
}

function administre(session: Session, entiteId: number): boolean {
  const a = entitesAdministrees(session);
  return a === "toutes" || a.includes(entiteId);
}

/** Identifiants d'entités cochés (champ répété « entiteIds »). */
function entiteIdsDe(fd: FormData): number[] {
  return Array.from(new Set(fd.getAll("entiteIds").flatMap((v) => (typeof v === "string" ? v.split(",") : [])).map((v) => Number(v.trim())).filter((n) => Number.isInteger(n) && n > 0)));
}

async function envoyerInvitation(u: { id: number; nom: string; email: string }, session: Session, entites: string[]): Promise<void> {
  const jeton = genererJetonInvitation();
  await prisma.utilisateur.update({ where: { id: u.id }, data: { jetonInvitation: jeton, jetonExpireLe: new Date(Date.now() + DUREE_INVITATION_MS) } });
  const modele = emailInvitationUtilisateur(u.nom, `${await origineApplication()}/connexion/definir/${jeton}`, session.nom, entites);
  await envoyerEmail({ a: u.email, objet: modele.objet, texte: modele.corps });
}

const schemaUtilisateur = z.object({
  nom: zTexte(120),
  email: zTexte(200),
  role: zEnum(["ADMINISTRATEUR", "GESTIONNAIRE", "LECTURE"]),
  modeAcces: zEnum(["invitation", "motDePasse"]),
  motDePasse: zTexteOpt(200),
  superAdmin: zBool,
});

/** Création d'un utilisateur (ou ajout d'accès à un utilisateur existant, reconnu par son email). */
export async function creerUtilisateur(_prev: FormState, fd: FormData): Promise<FormState> {
  const session = await exigerAdministrateur();
  const r = analyser(schemaUtilisateur, fd);
  const motDePasse = String(fd.get("motDePasse") ?? "");
  fd.delete("motDePasse");
  if (!r.success) return echec(fd, r.errors);
  const email = r.data.email.trim().toLowerCase();
  if (!EMAIL.test(email)) return echec(fd, { email: "Adresse email invalide" });
  const entiteIds = entiteIdsDe(fd);
  const superAdmin = session.superAdmin && r.data.superAdmin;
  if (!superAdmin && entiteIds.length === 0) return echec(fd, { entiteIds: "Cochez au moins une entité." });
  if (entiteIds.some((id) => !administre(session, id))) return echec(fd, { entiteIds: "Vous n'administrez pas toutes les entités cochées." });
  if (r.data.modeAcces === "motDePasse") {
    const pb = problemeMotDePasse(motDePasse);
    if (pb) return echec(fd, { motDePasse: pb });
  } else if (!mailConfigure()) {
    return echec(fd, { modeAcces: "L'envoi d'emails n'est pas configuré : définissez un mot de passe initial et communiquez-le à l'utilisateur." });
  }
  const entites = await prisma.entite.findMany({ where: { id: { in: entiteIds } }, select: { id: true, nom: true } });
  const existant = await prisma.utilisateur.findUnique({ where: { email }, include: { acces: true } });
  let utilisateur: { id: number; nom: string; email: string };
  if (existant) {
    // Utilisateur déjà connu : on lui ajoute les accès, sans toucher à son mot de passe ni à son statut de super-administrateur.
    await prisma.$transaction(entiteIds.map((entiteId) => prisma.accesEntite.upsert({ where: { utilisateurId_entiteId: { utilisateurId: existant.id, entiteId } }, update: { role: r.data.role }, create: { utilisateurId: existant.id, entiteId, role: r.data.role } })));
    utilisateur = existant;
    revalidatePath("/utilisateurs");
    return succes(`${existant.nom} (${email}) avait déjà un compte : ${entites.length ? `accès ${ROLES[r.data.role].toLowerCase()} accordé sur ${entites.map((e) => e.nom).join(", ")}.` : "aucune entité ajoutée."}`);
  }
  utilisateur = await prisma.utilisateur.create({
    data: {
      nom: r.data.nom,
      email,
      superAdmin,
      motDePasse: r.data.modeAcces === "motDePasse" ? hacherMotDePasse(motDePasse) : null,
      acces: { create: entiteIds.map((entiteId) => ({ entiteId, role: r.data.role })) },
    },
  });
  let complement = "";
  if (r.data.modeAcces === "invitation") {
    try {
      await envoyerInvitation(utilisateur, session, entites.map((e) => e.nom));
      complement = ` Invitation envoyée à ${email} (lien valable 7 jours).`;
    } catch (e) {
      complement = ` L'invitation n'a pas pu être envoyée (${messageErreur(e)}) : utilisez « Renvoyer l'invitation » plus tard.`;
    }
  } else {
    complement = " Communiquez-lui son mot de passe initial ; il pourra le changer depuis « Mon compte ».";
  }
  revalidatePath("/utilisateurs");
  return succes(`Utilisateur ${r.data.nom} créé${superAdmin ? " (super-administrateur)" : ` avec le rôle ${ROLES[r.data.role].toLowerCase()} sur ${entites.map((e) => e.nom).join(", ")}`}.${complement}`);
}

/** Change (ou ajoute) le rôle d'un utilisateur sur une entité. */
export async function modifierRole(fd: FormData): Promise<void> {
  const session = await exigerAdministrateur();
  const utilisateurId = Number(fd.get("utilisateurId"));
  const entiteId = Number(fd.get("entiteId"));
  const role = String(fd.get("role")) as RoleEntite;
  if (!(role in ROLES) || !administre(session, entiteId)) redirect(avecMessage("/utilisateurs", "Modification refusée.", "erreur"));
  const u = await prisma.utilisateur.findUnique({ where: { id: utilisateurId } });
  if (!u) redirect("/utilisateurs");
  if (u.id === session.utilisateurId && role !== "ADMINISTRATEUR" && !session.superAdmin) redirect(avecMessage("/utilisateurs", "Vous ne pouvez pas retirer votre propre rôle d'administrateur.", "erreur"));
  await prisma.accesEntite.upsert({ where: { utilisateurId_entiteId: { utilisateurId, entiteId } }, update: { role }, create: { utilisateurId, entiteId, role } });
  revalidatePath("/utilisateurs");
  redirect(avecMessage("/utilisateurs", `Rôle de ${u.nom} mis à jour : ${ROLES[role].toLowerCase()}.`));
}

export async function retirerAcces(fd: FormData): Promise<void> {
  const session = await exigerAdministrateur();
  const utilisateurId = Number(fd.get("utilisateurId"));
  const entiteId = Number(fd.get("entiteId"));
  if (!administre(session, entiteId)) redirect(avecMessage("/utilisateurs", "Modification refusée.", "erreur"));
  if (utilisateurId === session.utilisateurId && !session.superAdmin) redirect(avecMessage("/utilisateurs", "Vous ne pouvez pas retirer votre propre accès.", "erreur"));
  await prisma.accesEntite.deleteMany({ where: { utilisateurId, entiteId } });
  revalidatePath("/utilisateurs");
  redirect(avecMessage("/utilisateurs", "Accès retiré."));
}

/** Désactive ou réactive un compte (un compte désactivé ne peut plus se connecter). */
export async function basculerActif(fd: FormData): Promise<void> {
  const session = await exigerAdministrateur();
  const id = Number(fd.get("id"));
  const u = await prisma.utilisateur.findUnique({ where: { id }, include: { acces: true } });
  if (!u) redirect("/utilisateurs");
  if (u.id === session.utilisateurId) redirect(avecMessage("/utilisateurs", "Vous ne pouvez pas désactiver votre propre compte.", "erreur"));
  if (!session.superAdmin && (u.superAdmin || !u.acces.every((a) => administre(session, a.entiteId)))) redirect(avecMessage("/utilisateurs", "Vous n'administrez pas toutes les entités de cet utilisateur.", "erreur"));
  await prisma.utilisateur.update({ where: { id }, data: { actif: !u.actif } });
  revalidatePath("/utilisateurs");
  redirect(avecMessage("/utilisateurs", u.actif ? `Compte de ${u.nom} désactivé.` : `Compte de ${u.nom} réactivé.`));
}

export async function basculerSuperAdmin(fd: FormData): Promise<void> {
  const session = await exigerSession();
  if (!session.superAdmin) redirect(avecMessage("/utilisateurs", "Réservé au super-administrateur.", "erreur"));
  const id = Number(fd.get("id"));
  const u = await prisma.utilisateur.findUnique({ where: { id } });
  if (!u) redirect("/utilisateurs");
  if (u.id === session.utilisateurId) redirect(avecMessage("/utilisateurs", "Vous ne pouvez pas modifier votre propre statut.", "erreur"));
  await prisma.utilisateur.update({ where: { id }, data: { superAdmin: !u.superAdmin } });
  revalidatePath("/utilisateurs");
  redirect(avecMessage("/utilisateurs", u.superAdmin ? `${u.nom} n'est plus super-administrateur.` : `${u.nom} est désormais super-administrateur (accès à toutes les entités).`));
}

export async function renvoyerInvitation(fd: FormData): Promise<void> {
  const session = await exigerAdministrateur();
  const id = Number(fd.get("id"));
  const u = await prisma.utilisateur.findUnique({ where: { id }, include: { acces: { include: { entite: true } } } });
  if (!u) redirect("/utilisateurs");
  if (!session.superAdmin && !u.acces.every((a) => administre(session, a.entiteId))) redirect(avecMessage("/utilisateurs", "Vous n'administrez pas toutes les entités de cet utilisateur.", "erreur"));
  if (!mailConfigure()) redirect(avecMessage("/utilisateurs", "L'envoi d'emails n'est pas configuré.", "erreur"));
  try {
    await envoyerInvitation(u, session, u.acces.map((a) => a.entite.nom));
  } catch (e) {
    redirect(avecMessage("/utilisateurs", `Échec de l'envoi : ${messageErreur(e)}`, "erreur"));
  }
  revalidatePath("/utilisateurs");
  redirect(avecMessage("/utilisateurs", `Lien envoyé à ${u.email} (valable 7 jours) : il permet de choisir ou de réinitialiser le mot de passe.`));
}

/** Changement de son propre mot de passe (page Mon compte). */
export async function changerMotDePasse(_prev: FormState, fd: FormData): Promise<FormState> {
  const session = await exigerSession();
  if (session.utilisateurId === null) return erreur(null, "Le mot de passe du compte principal se modifie dans la variable APP_PASSWORD du serveur.");
  const ancien = String(fd.get("ancien") ?? "");
  const nouveau = String(fd.get("nouveau") ?? "");
  const confirmation = String(fd.get("confirmation") ?? "");
  const u = await prisma.utilisateur.findUnique({ where: { id: session.utilisateurId } });
  if (!u) return erreur(null, "Compte introuvable.");
  if (u.motDePasse && !verifierMotDePasse(ancien, u.motDePasse)) return echec(new FormData(), { ancien: "Mot de passe actuel incorrect." });
  const pb = problemeMotDePasse(nouveau, confirmation);
  if (pb) return echec(new FormData(), { nouveau: pb });
  await prisma.utilisateur.update({ where: { id: u.id }, data: { motDePasse: hacherMotDePasse(nouveau), jetonInvitation: null, jetonExpireLe: null } });
  return succes("Mot de passe modifié.");
}
