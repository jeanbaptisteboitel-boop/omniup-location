"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { echec, type FormState } from "@/lib/forms";
import { avecMessage, estContrainteReference } from "@/lib/erreurs";
import { analyser, zCodePostal, zIdOpt, zTexte, zTexteOpt } from "@/lib/validation";

const schemaImmeuble = z.object({
  nom: zTexte(200),
  adresse: zTexte(300),
  complementAdresse: zTexteOpt(300),
  codePostal: zCodePostal,
  ville: zTexte(120),
  bailleurId: zIdOpt,
  notes: zTexteOpt(5000),
});

export async function creerImmeuble(_prev: FormState, fd: FormData): Promise<FormState> {
  const r = analyser(schemaImmeuble, fd);
  if (!r.success) return echec(fd, r.errors);
  const i = await prisma.immeuble.create({ data: r.data });
  revalidatePath("/immeubles");
  redirect(`/immeubles/${i.id}`);
}

export async function modifierImmeuble(id: number, _prev: FormState, fd: FormData): Promise<FormState> {
  const r = analyser(schemaImmeuble, fd);
  if (!r.success) return echec(fd, r.errors);
  await prisma.immeuble.update({ where: { id }, data: r.data });
  revalidatePath("/immeubles");
  revalidatePath(`/immeubles/${id}`);
  redirect(`/immeubles/${id}`);
}

export async function supprimerImmeuble(fd: FormData): Promise<void> {
  const id = Number(fd.get("id"));
  const immeuble = await prisma.immeuble.findUnique({ where: { id }, include: { _count: { select: { depenses: true, emprunts: true } } } });
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
