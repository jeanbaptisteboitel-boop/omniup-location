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

const schemaCourrier = z.object({
  type: zEnum(["REVISION_LOYER", "RELANCE", "AUTRE"]),
  objet: zTexte(200),
  contenu: zTexte(50000),
});

export async function creerCourrier(bailId: number, _prev: FormState, fd: FormData): Promise<FormState> {
  const r = analyser(schemaCourrier, fd);
  if (!r.success) return echec(fd, r.errors);
  const c = await prisma.courrier.create({ data: { bailId, ...r.data } });
  revalidatePath(`/baux/${bailId}`);
  redirect(avecMessage(`/courriers/${c.id}`, "Courrier enregistré. Vous pouvez le télécharger en PDF ou l'envoyer par email."));
}

export async function modifierCourrier(id: number, _prev: FormState, fd: FormData): Promise<FormState> {
  const r = analyser(schemaCourrier, fd);
  if (!r.success) return echec(fd, r.errors);
  const c = await prisma.courrier.update({ where: { id }, data: r.data });
  revalidatePath(`/courriers/${id}`);
  revalidatePath(`/baux/${c.bailId}`);
  return succes("Courrier enregistré.");
}

export async function supprimerCourrier(fd: FormData): Promise<void> {
  const id = Number(fd.get("id"));
  const c = await prisma.courrier.findUnique({ where: { id } });
  if (!c) redirect("/baux");
  await prisma.courrier.delete({ where: { id } });
  revalidatePath(`/baux/${c.bailId}`);
  redirect(avecMessage(`/baux/${c.bailId}`, "Courrier supprimé."));
}

export async function envoyerCourrier(id: number, _prev: FormState, fd: FormData): Promise<FormState> {
  const c = await chargerCourrier(id);
  if (!c) return erreur(fd, "Courrier introuvable.");
  const email = c.bail.locataire.email;
  if (!email) return erreur(fd, "Le locataire n'a pas d'adresse email.");
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
  return succes(`Courrier envoyé à ${email}.`);
}
