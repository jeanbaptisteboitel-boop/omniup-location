"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { echec, erreur, messageErreur, succes, type FormState } from "@/lib/forms";
import { avecMessage } from "@/lib/erreurs";
import { analyser, zBool, zDate, zEnum, zMontant, zTexteOpt } from "@/lib/validation";
import { aujourdhui, formatPeriode } from "@/lib/dates";
import { etatAppel, numeroAppel, numeroQuittance } from "@/lib/loyers";
import { synchroniserAppelsLoyer } from "@/lib/loyers-sync";
import { chargerAppel, includeAppel, type AppelComplet } from "@/lib/pdf/donnees";
import { pdfAvisEcheance, pdfQuittance } from "@/lib/pdf/loyers";
import { envoyerEmail, mailConfigure } from "@/lib/mail";
import { emailAvis, emailQuittance } from "@/lib/mail-modeles";
import { entiteCouranteId } from "@/lib/entite";

/** Appel de loyer de l'entité de travail, sinon null. */
async function appelDeLEntite(id: number): Promise<AppelComplet | null> {
  const a = await chargerAppel(id);
  if (!a || a.bail.entiteId !== (await entiteCouranteId())) return null;
  return a;
}

function revalider(appel: AppelComplet) {
  revalidatePath("/loyers");
  revalidatePath(`/loyers/${appel.id}`);
  revalidatePath(`/baux/${appel.bailId}`);
  revalidatePath("/");
}

// ---------------------------------------------------------------------------
// Génération
// ---------------------------------------------------------------------------

export async function genererAppelsMaintenant(): Promise<void> {
  const crees = await synchroniserAppelsLoyer();
  revalidatePath("/loyers");
  revalidatePath("/");
  redirect(avecMessage("/loyers", crees.length ? `${crees.length} appel${crees.length > 1 ? "s" : ""} de loyer émis.` : "Aucun nouvel appel à émettre : tous les appels sont à jour."));
}

// ---------------------------------------------------------------------------
// Paiements
// ---------------------------------------------------------------------------

const schemaPaiement = z.object({
  date: zDate,
  montant: zMontant,
  mode: zEnum(["VIREMENT", "PRELEVEMENT", "CHEQUE", "ESPECES", "AUTRE"]),
  reference: zTexteOpt(100),
  envoyerQuittance: zBool,
});

export async function enregistrerPaiement(appelId: number, _prev: FormState, fd: FormData): Promise<FormState> {
  const r = analyser(schemaPaiement, fd);
  if (!r.success) return echec(fd, r.errors);
  if (r.data.montant <= 0) return echec(fd, { montant: "Le montant doit être supérieur à zéro." });
  const avant = await appelDeLEntite(appelId);
  if (!avant) return erreur(fd, "Appel de loyer introuvable.");
  const resteAvant = etatAppel(avant, aujourdhui()).reste;
  if (r.data.montant > resteAvant + 0.005) {
    return echec(fd, { montant: `Le paiement dépasse le reste dû (${resteAvant.toFixed(2).replace(".", ",")} €). Enregistrez le surplus sur l'échéance suivante.` });
  }
  await prisma.paiement.create({ data: { appelId, date: r.data.date, montant: r.data.montant, mode: r.data.mode, reference: r.data.reference } });
  const appel = (await chargerAppel(appelId))!;
  const etat = etatAppel(appel, aujourdhui());
  revalider(appel);

  if (etat.statut !== "PAYE") return succes(`Paiement enregistré. Reste dû : ${etat.reste.toFixed(2).replace(".", ",")} €.`);

  let message = `Paiement enregistré : l'échéance est soldée, la quittance ${numeroQuittance(appel.id)} est disponible.`;
  if (r.data.envoyerQuittance) {
    try {
      await envoyerQuittanceInterne(appel);
      message += " Quittance envoyée par email.";
    } catch (e) {
      message += ` Envoi de la quittance impossible : ${messageErreur(e)}`;
    }
  }
  // Le formulaire de paiement disparaît une fois l'échéance soldée : on affiche le message via l'URL.
  redirect(avecMessage(`/loyers/${appelId}`, message));
}

export async function supprimerPaiement(fd: FormData): Promise<void> {
  const id = Number(fd.get("id"));
  const p = await prisma.paiement.findUnique({ where: { id }, include: { appel: { select: { bail: { select: { entiteId: true } } } } } });
  if (!p || p.appel.bail.entiteId !== (await entiteCouranteId())) redirect("/loyers");
  await prisma.paiement.delete({ where: { id } });
  const appel = await chargerAppel(p.appelId);
  if (appel) revalider(appel);
  redirect(avecMessage(`/loyers/${p.appelId}`, "Paiement supprimé."));
}

// ---------------------------------------------------------------------------
// Envois par email
// ---------------------------------------------------------------------------

async function envoyerAvisInterne(appel: AppelComplet, objet?: string, corps?: string): Promise<void> {
  const email = appel.bail.locataire.email;
  if (!email) throw new Error("Le locataire n'a pas d'adresse email.");
  const modele = emailAvis(appel);
  const pdf = await pdfAvisEcheance(appel);
  await envoyerEmail({
    a: email,
    objet: objet?.trim() || modele.objet,
    texte: corps?.trim() || modele.corps,
    repondreA: appel.bail.lot.bailleur?.email,
    piecesJointes: [{ nom: `avis-echeance-${numeroAppel(appel.id)}.pdf`, contenu: pdf, type: "application/pdf" }],
  });
  await prisma.appelLoyer.update({ where: { id: appel.id }, data: { dateEnvoiAvis: new Date() } });
}

async function envoyerQuittanceInterne(appel: AppelComplet, objet?: string, corps?: string): Promise<void> {
  const email = appel.bail.locataire.email;
  if (!email) throw new Error("Le locataire n'a pas d'adresse email.");
  const integral = etatAppel(appel, aujourdhui()).statut === "PAYE";
  const modele = emailQuittance(appel, integral);
  const pdf = await pdfQuittance(appel);
  await envoyerEmail({
    a: email,
    objet: objet?.trim() || modele.objet,
    texte: corps?.trim() || modele.corps,
    repondreA: appel.bail.lot.bailleur?.email,
    piecesJointes: [{ nom: `${integral ? "quittance" : "recu"}-${numeroQuittance(appel.id)}.pdf`, contenu: pdf, type: "application/pdf" }],
  });
  if (integral) await prisma.appelLoyer.update({ where: { id: appel.id }, data: { dateEnvoiQuittance: new Date() } });
}

export async function envoyerAvis(appelId: number, _prev: FormState, fd: FormData): Promise<FormState> {
  const appel = await appelDeLEntite(appelId);
  if (!appel) return erreur(fd, "Appel de loyer introuvable.");
  try {
    await envoyerAvisInterne(appel, String(fd.get("objet") ?? ""), String(fd.get("corps") ?? ""));
  } catch (e) {
    return erreur(fd, messageErreur(e));
  }
  revalider(appel);
  return succes(`Avis d'échéance envoyé à ${appel.bail.locataire.email}.`);
}

export async function envoyerQuittance(appelId: number, _prev: FormState, fd: FormData): Promise<FormState> {
  const appel = await appelDeLEntite(appelId);
  if (!appel) return erreur(fd, "Appel de loyer introuvable.");
  if (appel.paiements.length === 0) return erreur(fd, "Aucun paiement enregistré : enregistrez d'abord le paiement.");
  try {
    await envoyerQuittanceInterne(appel, String(fd.get("objet") ?? ""), String(fd.get("corps") ?? ""));
  } catch (e) {
    return erreur(fd, messageErreur(e));
  }
  revalider(appel);
  return succes(`Quittance envoyée à ${appel.bail.locataire.email}.`);
}

export async function marquerAvisEnvoye(fd: FormData): Promise<void> {
  const id = Number(fd.get("id"));
  const appel = await appelDeLEntite(id);
  if (!appel) redirect("/loyers");
  await prisma.appelLoyer.update({ where: { id }, data: { dateEnvoiAvis: appel.dateEnvoiAvis ? null : new Date() } });
  revalider(appel);
  redirect(avecMessage(`/loyers/${id}`, appel.dateEnvoiAvis ? "Avis marqué comme non envoyé." : "Avis marqué comme envoyé (remis en main propre ou par courrier)."));
}

export async function marquerQuittanceEnvoyee(fd: FormData): Promise<void> {
  const id = Number(fd.get("id"));
  const appel = await appelDeLEntite(id);
  if (!appel) redirect("/loyers");
  await prisma.appelLoyer.update({ where: { id }, data: { dateEnvoiQuittance: appel.dateEnvoiQuittance ? null : new Date() } });
  revalider(appel);
  redirect(avecMessage(`/loyers/${id}`, appel.dateEnvoiQuittance ? "Quittance marquée comme non envoyée." : "Quittance marquée comme remise."));
}

/** Envoi groupé de tous les avis non encore envoyés (locataires avec email). */
export async function envoyerAvisEnAttente(): Promise<void> {
  if (!mailConfigure()) redirect(avecMessage("/loyers", "L'envoi d'emails n'est pas configuré (voir Paramètres).", "erreur"));
  const appels = await prisma.appelLoyer.findMany({ where: { dateEnvoiAvis: null, bail: { entiteId: await entiteCouranteId(), locataire: { email: { not: null } } } }, include: includeAppel, orderBy: { periode: "asc" } });
  let envoyes = 0;
  const erreurs: string[] = [];
  for (const a of appels) {
    try {
      await envoyerAvisInterne(a);
      envoyes++;
    } catch (e) {
      erreurs.push(`${formatPeriode(a.periode)} ${a.bail.lot.nom} : ${messageErreur(e)}`);
    }
  }
  revalidatePath("/loyers");
  const msg = `${envoyes} avis envoyé${envoyes > 1 ? "s" : ""}.${erreurs.length ? ` Échecs : ${erreurs.join(" ; ")}` : ""}`;
  redirect(avecMessage("/loyers", msg, erreurs.length && !envoyes ? "erreur" : "message"));
}

/** Utilisé par la génération planifiée (cron). */
export async function envoyerAvisNonEnvoyesSilencieux(): Promise<{ envoyes: number; erreurs: string[] }> {
  const appels = await prisma.appelLoyer.findMany({ where: { dateEnvoiAvis: null, bail: { locataire: { email: { not: null } } } }, include: includeAppel, orderBy: { periode: "asc" } });
  let envoyes = 0;
  const erreurs: string[] = [];
  for (const a of appels) {
    try {
      await envoyerAvisInterne(a);
      envoyes++;
    } catch (e) {
      erreurs.push(`${a.periode} bail ${a.bailId} : ${messageErreur(e)}`);
    }
  }
  return { envoyes, erreurs };
}
