"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { echec, erreur, messageErreur, succes, type FormState } from "@/lib/forms";
import { avecMessage } from "@/lib/erreurs";
import { analyser, zDateOpt, zEnum, zEnumOpt, zMontantOpt, zTexte, zTexteOpt } from "@/lib/validation";
import { confirmerEnvoiDirect, enregistrerFichier, preparerEnvoiDirect, supprimerFichier, typeMimeDe, verifierFichier } from "@/lib/storage";
import type { FichierTeleverse, ReponsePreparation } from "@/lib/envoi-direct";
import { genererJetonAcces } from "@/lib/espace";
import { COOKIE_CANDIDAT, exigerDossier, exigerDossierModifiable, type DossierComplet } from "@/lib/candidat";
import { avancementDossier, candidatureDeposable, pieceDe, piecesProposees } from "@/lib/candidatures";

/**
 * Espace candidat : le candidat (ou sa caution) complète ses informations, dépose ses justificatifs
 * et remet son dossier au bailleur. Chaque action est limitée au dossier identifié par le cookie.
 */

const schemaInformations = z.object({
  civilite: zTexteOpt(20),
  nom: zTexte(100),
  prenom: zTexteOpt(100),
  raisonSociale: zTexteOpt(200),
  dateNaissance: zDateOpt,
  lieuNaissance: zTexteOpt(100),
  email: z.string().trim().email("Adresse email invalide").max(200),
  telephone: zTexteOpt(30),
  adresse: zTexteOpt(200),
  complementAdresse: zTexteOpt(200),
  codePostal: zTexteOpt(10),
  ville: zTexteOpt(100),
  situation: zEnumOpt(["CDI", "CDI_ESSAI", "CDD", "INTERIM", "FONCTIONNAIRE", "INDEPENDANT", "RETRAITE", "ETUDIANT", "ALTERNANT", "SANS_EMPLOI", "AUTRE"]),
  employeur: zTexteOpt(200),
  poste: zTexteOpt(200),
  depuisLe: zDateOpt,
  finContratLe: zDateOpt,
  revenuMensuel: zMontantOpt,
  autresRevenus: zMontantOpt,
  detailAutresRevenus: zTexteOpt(300),
  chargesMensuelles: zMontantOpt,
});

/** Informations d'un dossier, saisies par la personne elle-même. */
export async function enregistrerInformations(_prev: FormState, fd: FormData): Promise<FormState> {
  const d = await exigerDossierModifiable();
  const r = analyser(schemaInformations, fd);
  if (!r.success) return echec(fd, r.errors);
  if (d.personneMorale && !r.data.raisonSociale) return echec(fd, { raisonSociale: "Indiquez la dénomination de l'organisme." });
  if (!d.personneMorale && !r.data.prenom) return echec(fd, { prenom: "Champ obligatoire" });
  if (!d.personneMorale && !r.data.situation) return echec(fd, { situation: "Indiquez votre situation professionnelle." });
  await prisma.dossierCandidature.update({
    where: { id: d.id },
    data: {
      ...r.data,
      situation: d.personneMorale ? null : (r.data.situation ?? null),
      // Changer de situation peut rendre des pièces déjà déposées sans objet : le dossier repasse à compléter.
      complet: false,
    },
  });
  revalidatePath("/candidature");
  return succes("Informations enregistrées.");
}

export async function preparerEnvoiPiece(nom: string, type: string, taille: number): Promise<ReponsePreparation> {
  await exigerDossierModifiable();
  try {
    return { ok: true, preparation: await preparerEnvoiDirect("candidatures", { nom, type, taille }) };
  } catch (e) {
    return { ok: false, erreur: messageErreur(e) };
  }
}

/**
 * Dépôt d'un justificatif. Le code est vérifié contre la liste limitative du décret du 5 novembre
 * 2015 et contre les pièces effectivement proposées pour la situation déclarée : aucune autre pièce
 * ne peut être enregistrée, même en forçant le formulaire.
 */
export async function deposerPiece(_prev: FormState, fd: FormData): Promise<FormState> {
  const d = await exigerDossierModifiable();
  const code = String(fd.get("code") ?? "");
  const piece = pieceDe(code);
  if (!piece) return echec(fd, { code: "Pièce inconnue." });
  if (!piecesProposees(d.situation, d.personneMorale).some((p) => p.code === code)) {
    return echec(fd, { code: "Cette pièce n'est pas demandée pour votre situation." });
  }

  let fichier: { nomFichier: string; chemin: string; mimeType: string; taille: number };
  try {
    const meta = fd.get("fichiers");
    if (typeof meta === "string" && meta.trim() !== "") {
      const t = (JSON.parse(meta) as FichierTeleverse[])[0];
      if (!t) return echec(fd, { fichier: "Sélectionnez le fichier à déposer." });
      const mimeType = typeMimeDe({ name: t.nomFichier, type: t.mimeType });
      if (!mimeType) return echec(fd, { fichier: "Format non pris en charge (PDF ou photo)." });
      fichier = { nomFichier: t.nomFichier, chemin: t.chemin, mimeType, taille: await confirmerEnvoiDirect(t.chemin, "candidatures/") };
    } else {
      const f = fd.get("fichier");
      if (!(f instanceof File) || f.size === 0) return echec(fd, { fichier: "Sélectionnez le fichier à déposer." });
      const pb = verifierFichier(f);
      if (pb) return echec(fd, { fichier: pb });
      const e = await enregistrerFichier(f, "candidatures");
      fichier = { nomFichier: e.nomFichier, chemin: e.chemin, mimeType: e.mimeType, taille: e.taille };
    }
  } catch (e) {
    return erreur(fd, messageErreur(e, "Échec de l'envoi du fichier."));
  }

  await prisma.pieceCandidature.create({ data: { dossierId: d.id, categorie: piece.categorie, code, ...fichier } });
  revalidatePath("/candidature");
  revalidatePath("/candidature/justificatifs");
  return succes(`${piece.libelle} : justificatif déposé.`);
}

/** Retrait d'un justificatif déposé par erreur (ou refusé par le bailleur). */
export async function retirerPiece(fd: FormData): Promise<void> {
  const d = await exigerDossierModifiable();
  const id = Number(fd.get("id"));
  const piece = await prisma.pieceCandidature.findFirst({ where: { id, dossierId: d.id } });
  if (!piece) redirect("/candidature/justificatifs");
  await supprimerFichier(piece.chemin);
  await prisma.pieceCandidature.delete({ where: { id } });
  revalidatePath("/candidature");
  redirect(avecMessage("/candidature/justificatifs", "Justificatif retiré."));
}

const schemaCaution = z.object({
  personneMorale: zEnum(["oui", "non"]),
  nom: zTexteOpt(100),
  prenom: zTexteOpt(100),
  raisonSociale: zTexteOpt(200),
  email: z.string().trim().email("Adresse email invalide").max(200),
  telephone: zTexteOpt(30),
});

/**
 * Le candidat déclare sa caution : celle-ci reçoit son propre lien et dépose ses justificatifs
 * elle-même. Article 22-1 : le bailleur ne peut refuser une caution au motif qu'elle n'a pas la
 * nationalité française ou qu'elle ne réside pas en France métropolitaine.
 */
export async function ajouterCaution(_prev: FormState, fd: FormData): Promise<FormState> {
  const d = await exigerDossierModifiable();
  if (d.role !== "CANDIDAT") return erreur(fd, "Seul le candidat peut déclarer une caution.");
  const r = analyser(schemaCaution, fd);
  if (!r.success) return echec(fd, r.errors);
  const morale = r.data.personneMorale === "oui";
  if (morale && !r.data.raisonSociale) return echec(fd, { raisonSociale: "Indiquez la dénomination de l'organisme." });
  if (!morale && (!r.data.nom || !r.data.prenom)) return echec(fd, { nom: !r.data.nom ? "Champ obligatoire" : "", prenom: !r.data.prenom ? "Champ obligatoire" : "" });
  await prisma.dossierCandidature.create({
    data: {
      candidatureId: d.candidatureId,
      role: "GARANT",
      garantDeId: d.id,
      personneMorale: morale,
      nom: morale ? (r.data.raisonSociale ?? "") : (r.data.nom ?? ""),
      prenom: morale ? null : r.data.prenom,
      raisonSociale: morale ? r.data.raisonSociale : null,
      email: r.data.email,
      telephone: r.data.telephone,
      accesJeton: genererJetonAcces(),
      accesCreeLe: new Date(),
    },
  });
  revalidatePath("/candidature");
  revalidatePath("/candidature/cautions");
  return succes("Caution déclarée : transmettez-lui son lien pour qu'elle dépose ses justificatifs.");
}

export async function retirerCaution(fd: FormData): Promise<void> {
  const d = await exigerDossierModifiable();
  const id = Number(fd.get("id"));
  const caution = await prisma.dossierCandidature.findFirst({ where: { id, garantDeId: d.id, role: "GARANT" }, include: { pieces: true } });
  if (!caution) redirect("/candidature/cautions");
  for (const p of caution.pieces) await supprimerFichier(p.chemin);
  await prisma.dossierCandidature.delete({ where: { id } });
  revalidatePath("/candidature");
  redirect(avecMessage("/candidature/cautions", "Caution retirée du dossier."));
}

function dossierAvancement(d: DossierComplet) {
  return avancementDossier(d, d.pieces);
}

/** La personne déclare son dossier terminé. */
export async function declarerDossierComplet(fd: FormData): Promise<void> {
  const d = await exigerDossierModifiable();
  const a = dossierAvancement(d);
  if (!a.complet) redirect(avecMessage("/candidature", "Complétez vos informations et vos justificatifs avant de valider votre dossier.", "erreur"));
  await prisma.dossierCandidature.update({ where: { id: d.id }, data: { complet: true } });
  revalidatePath("/candidature");
  redirect(avecMessage("/candidature", d.role === "GARANT" ? "Votre dossier de caution est validé : le candidat peut remettre sa candidature." : "Votre dossier est validé."));
}

export async function rouvrirDossier(): Promise<void> {
  const d = await exigerDossierModifiable();
  await prisma.dossierCandidature.update({ where: { id: d.id }, data: { complet: false } });
  revalidatePath("/candidature");
  redirect(avecMessage("/candidature", "Vous pouvez de nouveau modifier votre dossier."));
}

/** Remise de la candidature au bailleur : tous les dossiers (candidats et cautions) doivent être complets. */
export async function deposerCandidature(): Promise<void> {
  const d = await exigerDossierModifiable();
  if (d.role !== "CANDIDAT") redirect(avecMessage("/candidature", "Seul le candidat remet la candidature au bailleur.", "erreur"));
  const dossiers = await prisma.dossierCandidature.findMany({ where: { candidatureId: d.candidatureId }, include: { pieces: true } });
  const etats = dossiers.map((x) => ({ role: x.role, complet: avancementDossier(x, x.pieces).complet && x.complet }));
  if (!candidatureDeposable(etats)) {
    redirect(avecMessage("/candidature", "Tous les dossiers, y compris ceux des cautions, doivent être validés avant la remise.", "erreur"));
  }
  await prisma.candidature.update({ where: { id: d.candidatureId }, data: { statut: "DEPOSEE", deposeLe: new Date() } });
  revalidatePath("/candidature");
  revalidatePath("/candidatures");
  redirect(avecMessage("/candidature", "Candidature remise au bailleur. Vous serez informé de sa décision."));
}

/** Le candidat retire sa candidature (logement trouvé ailleurs). */
export async function retirerCandidature(): Promise<void> {
  const d = await exigerDossier();
  if (d.role !== "CANDIDAT") redirect("/candidature");
  if (d.candidature.statut === "ACCEPTEE" || d.candidature.statut === "REFUSEE") redirect("/candidature");
  await prisma.candidature.update({ where: { id: d.candidatureId }, data: { statut: "RETIREE", decisionLe: new Date() } });
  revalidatePath("/candidature");
  revalidatePath("/candidatures");
  redirect(avecMessage("/candidature", "Candidature retirée. Le bailleur en est informé."));
}

export async function seDeconnecterCandidat(): Promise<void> {
  (await cookies()).delete(COOKIE_CANDIDAT);
  redirect("/candidature/connexion");
}
