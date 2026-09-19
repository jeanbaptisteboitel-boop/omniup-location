"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { echec, erreur, messageErreur, succes, type FormState } from "@/lib/forms";
import { avecMessage } from "@/lib/erreurs";
import { analyser, zEnum, zTexte } from "@/lib/validation";
import { chargerCourrier } from "@/lib/pdf/donnees";
import { pdfCourrier } from "@/lib/pdf/documents";
import { envoyerEmail } from "@/lib/mail";
import { emailCourrier } from "@/lib/mail-modeles";
import { entiteCouranteId } from "@/lib/entite";
import { emailsLocataires } from "@/lib/locataires";
import { exigerEcriture } from "@/lib/droits";

const schemaCourrier = z.object({
  type: zEnum(["REVISION_LOYER", "RELANCE", "AUTRE"]),
  objet: zTexte(200),
  contenu: zTexte(50000),
});

export async function creerCourrier(bailId: number, _prev: FormState, fd: FormData): Promise<FormState> {
  await exigerEcriture();
  const r = analyser(schemaCourrier, fd);
  if (!r.success) return echec(fd, r.errors);
  const bail = await prisma.bail.findFirst({ where: { id: bailId, entiteId: await entiteCouranteId() }, select: { id: true } });
  if (!bail) return erreur(fd, "Bail introuvable.");
  const c = await prisma.courrier.create({ data: { bailId, ...r.data } });
  revalidatePath(`/baux/${bailId}`);
  redirect(avecMessage(`/courriers/${c.id}`, "Courrier enregistré. Vous pouvez le télécharger en PDF ou l'envoyer par email."));
}

export async function modifierCourrier(id: number, _prev: FormState, fd: FormData): Promise<FormState> {
  await exigerEcriture();
  const r = analyser(schemaCourrier, fd);
  if (!r.success) return echec(fd, r.errors);
  const existant = await prisma.courrier.findFirst({ where: { id, bail: { entiteId: await entiteCouranteId() } }, select: { id: true } });
  if (!existant) return erreur(fd, "Courrier introuvable.");
  const c = await prisma.courrier.update({ where: { id }, data: r.data });
  revalidatePath(`/courriers/${id}`);
  revalidatePath(`/baux/${c.bailId}`);
  return succes("Courrier enregistré.");
}

export async function supprimerCourrier(fd: FormData): Promise<void> {
  await exigerEcriture();
  const id = Number(fd.get("id"));
  const c = await prisma.courrier.findFirst({ where: { id, bail: { entiteId: await entiteCouranteId() } } });
  if (!c) redirect("/baux");
  await prisma.courrier.delete({ where: { id } });
  revalidatePath(`/baux/${c.bailId}`);
  redirect(avecMessage(`/baux/${c.bailId}`, "Courrier supprimé."));
}

/** Courrier remis en main propre ou posté : il devient visible dans l'espace locataire. */
export async function marquerCourrierRemis(fd: FormData): Promise<void> {
  await exigerEcriture();
  const id = Number(fd.get("id"));
  const c = await prisma.courrier.findFirst({ where: { id, bail: { entiteId: await entiteCouranteId() } } });
  if (!c) redirect("/baux");
  await prisma.courrier.update({ where: { id }, data: { dateEnvoi: c.dateEnvoi ? null : new Date() } });
  revalidatePath(`/courriers/${id}`);
  revalidatePath(`/baux/${c.bailId}`);
  redirect(avecMessage(`/courriers/${id}`, c.dateEnvoi ? "Courrier marqué comme non remis : il n'apparaît plus dans l'espace locataire." : "Courrier marqué comme remis : il est visible dans l'espace locataire."));
}

export async function envoyerCourrier(id: number, _prev: FormState, fd: FormData): Promise<FormState> {
  await exigerEcriture();
  const c = await chargerCourrier(id);
  if (!c || c.bail.entiteId !== (await entiteCouranteId())) return erreur(fd, "Courrier introuvable.");
  const email = emailsLocataires(c.bail.locataires);
  if (!email.length) return erreur(fd, "Aucun locataire n'a d'adresse email.");
  try {
    const modele = emailCourrier(c);
    const pdf = await pdfCourrier(c);
    await envoyerEmail({
      a: email,
      objet: String(fd.get("objet") ?? "").trim() || modele.objet,
      texte: String(fd.get("corps") ?? "").trim() || modele.corps,
      repondreA: c.bail.lot.bailleur?.email,
      piecesJointes: [{ nom: `courrier-${c.id}.pdf`, contenu: pdf, type: "application/pdf" }],
    });
  } catch (e) {
    return erreur(fd, messageErreur(e));
  }
  await prisma.courrier.update({ where: { id }, data: { dateEnvoi: new Date() } });
  revalidatePath(`/courriers/${id}`);
  revalidatePath(`/baux/${c.bailId}`);
  return succes(`Courrier envoyé à ${email.join(", ")}.`);
}
