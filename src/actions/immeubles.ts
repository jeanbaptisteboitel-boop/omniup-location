"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { echec, erreur, type FormState } from "@/lib/forms";
import { avecMessage, estContrainteReference } from "@/lib/erreurs";
import { analyser, zBool, zCodePostal, zDateOpt, zIdOpt, zTexte, zTexteOpt } from "@/lib/validation";
import { entiteCouranteId } from "@/lib/entite";
import { exigerEcriture } from "@/lib/droits";

const schemaImmeuble = z.object({
  nom: zTexte(200),
  adresse: zTexte(300),
  complementAdresse: zTexteOpt(300),
  codePostal: zCodePostal,
  ville: zTexte(120),
  bailleurId: zIdOpt,
  optionTva: zBool,
  optionTvaDate: zDateOpt,
  notes: zTexteOpt(5000),
});

async function verifierBailleur(entiteId: number, bailleurId: number | null): Promise<Record<string, string>> {
  if (!bailleurId) return {};
  const b = await prisma.bailleur.findFirst({ where: { id: bailleurId, entiteId }, select: { id: true } });
  return b ? {} : { bailleurId: "Bailleur introuvable." };
}

export async function creerImmeuble(_prev: FormState, fd: FormData): Promise<FormState> {
  await exigerEcriture();
  const r = analyser(schemaImmeuble, fd);
  if (!r.success) return echec(fd, r.errors);
  const entiteId = await entiteCouranteId();
  const pb = await verifierBailleur(entiteId, r.data.bailleurId);
  if (Object.keys(pb).length) return echec(fd, pb);
  const i = await prisma.immeuble.create({ data: { ...r.data, entiteId } });
  revalidatePath("/immeubles");
  redirect(`/immeubles/${i.id}`);
}

export async function modifierImmeuble(id: number, _prev: FormState, fd: FormData): Promise<FormState> {
  await exigerEcriture();
  const r = analyser(schemaImmeuble, fd);
  if (!r.success) return echec(fd, r.errors);
  const entiteId = await entiteCouranteId();
  const existant = await prisma.immeuble.findFirst({ where: { id, entiteId }, select: { id: true } });
  if (!existant) return erreur(fd, "Immeuble introuvable.");
  const pb = await verifierBailleur(entiteId, r.data.bailleurId);
  if (Object.keys(pb).length) return echec(fd, pb);
  await prisma.immeuble.update({ where: { id }, data: r.data });
  revalidatePath("/immeubles");
  revalidatePath(`/immeubles/${id}`);
  redirect(`/immeubles/${id}`);
}

export async function supprimerImmeuble(fd: FormData): Promise<void> {
  await exigerEcriture();
  const id = Number(fd.get("id"));
  const immeuble = await prisma.immeuble.findFirst({ where: { id, entiteId: await entiteCouranteId() }, include: { _count: { select: { depenses: true, emprunts: true } } } });
  if (!immeuble) redirect("/immeubles");
  if (immeuble._count.depenses || immeuble._count.emprunts) {
    redirect(avecMessage(`/immeubles/${id}`, "Impossible de supprimer cet immeuble : des dépenses ou des emprunts lui sont rattachés.", "erreur"));
  }
  try {
    await prisma.immeuble.delete({ where: { id } });
  } catch (e) {
    if (estContrainteReference(e)) {
      redirect(avecMessage(`/immeubles/${id}`, "Impossible de supprimer cet immeuble : des dépenses ou des emprunts lui sont rattachés.", "erreur"));
    }
    throw e;
  }
  revalidatePath("/immeubles");
  redirect(avecMessage("/immeubles", "Immeuble supprimé."));
}
