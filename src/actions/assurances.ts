"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { echec, erreur, messageErreur, succes, type FormState } from "@/lib/forms";
import { avecMessage } from "@/lib/erreurs";
import { analyser, zDate, zDateOpt, zTexteOpt } from "@/lib/validation";
import { aujourdhui, formatDate } from "@/lib/dates";
import { confirmerEnvoiDirect, enregistrerFichier, preparerEnvoiDirect, supprimerFichier, typeMimeDe, verifierFichier } from "@/lib/storage";
import type { FichierTeleverse, ReponsePreparation } from "@/lib/envoi-direct";
import { envoyerEmail, mailConfigure } from "@/lib/mail";
import { emailDemandeAssurance } from "@/lib/mail-modeles";
import { etatAssurance } from "@/lib/assurances";
import { emailsLocataires, includeLocataires } from "@/lib/locataires";
import { entiteCouranteId } from "@/lib/entite";
import { exigerLocataire, lienAcces, origineApplication } from "@/lib/espace";
import { exigerEcriture } from "@/lib/droits";

/** Attestations d'assurance habitation : saisie par le gestionnaire, dépôt par le locataire depuis son espace, relances. */

const schemaAttestation = z.object({
  compagnie: zTexteOpt(200),
  numeroPolice: zTexteOpt(100),
  dateDebut: zDateOpt,
  dateEcheance: zDate,
});

type Piece = { nomFichier: string; chemin: string; mimeType: string; taille: number } | null;

/** Lit la pièce jointe du formulaire : envoi direct vers le stockage objet, ou fichier transmis au serveur. */
async function lirePiece(fd: FormData, sousDossier: string, obligatoire: boolean): Promise<{ piece: Piece } | { erreur: string }> {
  const meta = fd.get("fichiers");
  if (typeof meta === "string" && meta.trim() !== "") {
    let televerses: FichierTeleverse[] = [];
    try {
      televerses = JSON.parse(meta) as FichierTeleverse[];
    } catch {
      return { erreur: "Données d'envoi illisibles : recommencez l'import." };
    }
    const t = Array.isArray(televerses) ? televerses[0] : null;
    if (!t) return obligatoire ? { erreur: "Sélectionnez le fichier de l'attestation." } : { piece: null };
    const mimeType = typeMimeDe({ name: t.nomFichier, type: t.mimeType });
    if (!mimeType) return { erreur: "Format non pris en charge (PDF ou image)." };
    const taille = await confirmerEnvoiDirect(t.chemin, `${sousDossier}/`);
    return { piece: { nomFichier: t.nomFichier, chemin: t.chemin, mimeType, taille } };
  }
  const f = fd.get("fichier");
  if (!(f instanceof File) || f.size === 0) return obligatoire ? { erreur: "Sélectionnez le fichier de l'attestation." } : { piece: null };
  const pb = verifierFichier(f);
  if (pb) return { erreur: pb };
  const e = await enregistrerFichier(f, sousDossier);
  return { piece: { nomFichier: e.nomFichier, chemin: e.chemin, mimeType: e.mimeType, taille: e.taille } };
}

// ---------------------------------------------------------------------------
// Gestionnaire
// ---------------------------------------------------------------------------

export async function preparerEnvoiAttestation(bailId: number, nom: string, type: string, taille: number): Promise<ReponsePreparation> {
  await exigerEcriture();
  try {
    const b = await prisma.bail.findFirst({ where: { id: bailId, entiteId: await entiteCouranteId() }, select: { id: true } });
    if (!b) return { ok: false, erreur: "Bail introuvable." };
    return { ok: true, preparation: await preparerEnvoiDirect(`baux/${bailId}/assurances`, { nom, type, taille }) };
  } catch (e) {
    return { ok: false, erreur: messageErreur(e) };
  }
}

export async function enregistrerAttestation(bailId: number, _prev: FormState, fd: FormData): Promise<FormState> {
  await exigerEcriture();
  const bail = await prisma.bail.findFirst({ where: { id: bailId, entiteId: await entiteCouranteId() }, select: { id: true } });
  if (!bail) return erreur(fd, "Bail introuvable.");
  const r = analyser(schemaAttestation, fd);
  if (!r.success) return echec(fd, r.errors);
  if (r.data.dateDebut && r.data.dateDebut.getTime() > r.data.dateEcheance.getTime()) return echec(fd, { dateEcheance: "L'échéance doit suivre la date de début." });
  let piece: Piece = null;
  try {
    const lu = await lirePiece(fd, `baux/${bailId}/assurances`, false);
    if ("erreur" in lu) return echec(fd, { fichier: lu.erreur });
    piece = lu.piece;
  } catch (e) {
    return erreur(fd, messageErreur(e, "Échec de l'enregistrement du fichier."));
  }
  await prisma.attestationAssurance.create({ data: { bailId, ...r.data, ...(piece ?? {}) } });
  await prisma.bail.update({ where: { id: bailId }, data: { assuranceRelanceLe: null } });
  revalidatePath(`/baux/${bailId}`);
  return succes(`Attestation enregistrée : couverture jusqu'au ${formatDate(r.data.dateEcheance)}.`);
}

export async function supprimerAttestation(fd: FormData): Promise<void> {
  await exigerEcriture();
  const id = Number(fd.get("id"));
  const a = await prisma.attestationAssurance.findFirst({ where: { id, bail: { entiteId: await entiteCouranteId() } } });
  if (!a) redirect("/baux");
  await supprimerFichier(a.chemin);
  await prisma.attestationAssurance.delete({ where: { id } });
  revalidatePath(`/baux/${a.bailId}`);
  redirect(avecMessage(`/baux/${a.bailId}?onglet=assurance`, "Attestation supprimée."));
}

/** Demande (ou relance) l'attestation par email, avec le lien d'accès à l'espace locataire lorsqu'il existe. */
export async function demanderAssurance(fd: FormData): Promise<void> {
  await exigerEcriture();
  const id = Number(fd.get("id"));
  const bail = await prisma.bail.findFirst({
    where: { id, entiteId: await entiteCouranteId() },
    include: { locataires: includeLocataires, lot: { include: { bailleur: true } }, assurances: true },
  });
  if (!bail) redirect("/baux");
  const cible = `/baux/${id}?onglet=assurance`;
  const destinataires = emailsLocataires(bail.locataires);
  if (!destinataires.length) redirect(avecMessage(cible, "Aucun locataire n'a d'adresse email : ajoutez-la dans sa fiche.", "erreur"));
  if (!mailConfigure()) redirect(avecMessage(cible, "L'envoi d'emails n'est pas configuré (voir Paramètres).", "erreur"));
  const avecJeton = bail.locataires.find((l) => l.accesJeton);
  const lien = avecJeton?.accesJeton ? lienAcces(await origineApplication(), avecJeton.accesJeton) : null;
  const modele = emailDemandeAssurance(bail.locataires, bail.lot, etatAssurance(bail.assurances, aujourdhui()), lien, bail.lot.bailleur);
  try {
    await envoyerEmail({ a: destinataires.join(", "), objet: modele.objet, texte: modele.corps });
  } catch (e) {
    redirect(avecMessage(cible, `Échec de l'envoi : ${messageErreur(e)}`, "erreur"));
  }
  const maintenant = new Date();
  await prisma.bail.update({ where: { id }, data: { assuranceRelanceLe: maintenant, assuranceDemandeeLe: bail.assuranceDemandeeLe ?? maintenant } });
  revalidatePath(`/baux/${id}`);
  redirect(avecMessage(cible, `Demande d'attestation envoyée à ${destinataires.join(", ")}.`));
}

// ---------------------------------------------------------------------------
// Locataire (espace)
// ---------------------------------------------------------------------------

export async function preparerEnvoiAttestationLocataire(bailId: number, nom: string, type: string, taille: number): Promise<ReponsePreparation> {
  const l = await exigerLocataire();
  try {
    const b = await prisma.bail.findFirst({ where: { id: bailId, locataires: { some: { id: l.id } } }, select: { id: true } });
    if (!b) return { ok: false, erreur: "Bail introuvable." };
    return { ok: true, preparation: await preparerEnvoiDirect(`baux/${bailId}/assurances`, { nom, type, taille }) };
  } catch (e) {
    return { ok: false, erreur: messageErreur(e) };
  }
}

/** Dépôt de l'attestation par le locataire depuis son espace : le fichier est obligatoire. */
export async function deposerAttestation(bailId: number, _prev: FormState, fd: FormData): Promise<FormState> {
  const l = await exigerLocataire();
  const bail = await prisma.bail.findFirst({ where: { id: bailId, locataires: { some: { id: l.id } }, statut: { in: ["SIGNE", "EN_SIGNATURE"] } }, select: { id: true } });
  if (!bail) return erreur(fd, "Bail introuvable ou terminé.");
  const r = analyser(schemaAttestation, fd);
  if (!r.success) return echec(fd, r.errors);
  if (r.data.dateEcheance.getTime() < aujourdhui().getTime()) return echec(fd, { dateEcheance: "Cette attestation est déjà expirée : transmettez celle en cours de validité." });
  let piece: Piece = null;
  try {
    const lu = await lirePiece(fd, `baux/${bailId}/assurances`, true);
    if ("erreur" in lu) return echec(fd, { fichier: lu.erreur });
    piece = lu.piece;
  } catch (e) {
    return erreur(fd, messageErreur(e, "Échec de l'envoi du fichier."));
  }
  await prisma.attestationAssurance.create({ data: { bailId, locataireId: l.id, ...r.data, ...(piece ?? {}), deposeParLocataire: true } });
  await prisma.bail.update({ where: { id: bailId }, data: { assuranceRelanceLe: null } });
  revalidatePath(`/espace/baux/${bailId}`);
  revalidatePath(`/baux/${bailId}`);
  return succes(`Merci : votre attestation est enregistrée, elle couvre votre logement jusqu'au ${formatDate(r.data.dateEcheance)}.`);
}
