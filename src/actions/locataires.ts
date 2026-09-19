"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { echec, erreur, type FormState } from "@/lib/forms";
import { avecMessage, estContrainteReference } from "@/lib/erreurs";
import { supprimerFichier } from "@/lib/storage";
import { analyser, zCodePostalOpt, zDateOpt, zEmailOpt, zTexte, zTexteOpt } from "@/lib/validation";
import { entiteCouranteId } from "@/lib/entite";
import { exigerEcriture } from "@/lib/droits";

const schemaLocataire = z.object({
  civilite: zTexteOpt(10),
  nom: zTexte(120),
  prenom: zTexte(120),
  dateNaissance: zDateOpt,
  adresse: zTexteOpt(300),
  complementAdresse: zTexteOpt(300),
  codePostal: zCodePostalOpt,
  ville: zTexteOpt(120),
  telephone: zTexteOpt(40),
  email: zEmailOpt,
  notes: zTexteOpt(5000),
});

export async function creerLocataire(_prev: FormState, fd: FormData): Promise<FormState> {
  await exigerEcriture();
  const r = analyser(schemaLocataire, fd);
  if (!r.success) return echec(fd, r.errors);
  const l = await prisma.locataire.create({ data: { ...r.data, entiteId: await entiteCouranteId() } });
  revalidatePath("/locataires");
  redirect(`/locataires/${l.id}`);
}

export async function modifierLocataire(id: number, _prev: FormState, fd: FormData): Promise<FormState> {
  await exigerEcriture();
  const r = analyser(schemaLocataire, fd);
  if (!r.success) return echec(fd, r.errors);
  const existant = await prisma.locataire.findFirst({ where: { id, entiteId: await entiteCouranteId() }, select: { id: true } });
  if (!existant) return erreur(fd, "Locataire introuvable.");
  await prisma.locataire.update({ where: { id }, data: r.data });
  revalidatePath("/locataires");
  revalidatePath(`/locataires/${id}`);
  redirect(`/locataires/${id}`);
}

export async function supprimerLocataire(fd: FormData): Promise<void> {
  await exigerEcriture();
  const id = Number(fd.get("id"));
  const existant = await prisma.locataire.findFirst({ where: { id, entiteId: await entiteCouranteId() }, select: { id: true } });
  if (!existant) redirect("/locataires");
  const nbBaux = await prisma.bail.count({ where: { locataires: { some: { id } } } });
  if (nbBaux) redirect(avecMessage(`/locataires/${id}`, "Impossible de supprimer ce locataire : des baux lui sont rattachés. Supprimez d'abord les baux.", "erreur"));
  const documents = await prisma.document.findMany({ where: { locataireId: id }, select: { chemin: true } });
  try {
    await prisma.locataire.delete({ where: { id } });
  } catch (e) {
    if (estContrainteReference(e)) {
      redirect(avecMessage(`/locataires/${id}`, "Impossible de supprimer ce locataire : des baux lui sont rattachés. Supprimez d'abord les baux.", "erreur"));
    }
    throw e;
  }
  await Promise.all(documents.map((d) => supprimerFichier(d.chemin)));
  revalidatePath("/locataires");
  redirect(avecMessage("/locataires", "Locataire supprimé, ainsi que ses documents."));
}
