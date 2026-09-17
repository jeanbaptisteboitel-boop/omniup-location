"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { echec, type FormState } from "@/lib/forms";
import { avecMessage, estContrainteReference } from "@/lib/erreurs";
import { analyser, zBool, zCodePostal, zEntierOpt, zEnum, zIdOpt, zMontantOpt, zNombreOpt, zTexte, zTexteOpt } from "@/lib/validation";

const schemaLot = z.object({
  type: zEnum(["APPARTEMENT", "MAISON"]),
  nom: zTexte(200),
  adresse: zTexte(300),
  complementAdresse: zTexteOpt(300),
  codePostal: zCodePostal,
  ville: zTexte(120),
  etage: zTexteOpt(50),
  surface: zNombreOpt,
  nbPieces: zEntierOpt(0, 100),
  meuble: zBool,
  loyerIndicatif: zMontantOpt,
  chargesIndicatives: zMontantOpt,
  bailleurId: zIdOpt,
  immeubleId: zIdOpt,
  description: zTexteOpt(5000),
});

export async function creerLot(_prev: FormState, fd: FormData): Promise<FormState> {
  const r = analyser(schemaLot, fd);
  if (!r.success) return echec(fd, r.errors);
  const lot = await prisma.lot.create({ data: r.data });
  revalidatePath("/lots");
  redirect(`/lots/${lot.id}`);
}

export async function modifierLot(id: number, _prev: FormState, fd: FormData): Promise<FormState> {
  const r = analyser(schemaLot, fd);
  if (!r.success) return echec(fd, r.errors);
  await prisma.lot.update({ where: { id }, data: r.data });
  revalidatePath("/lots");
  revalidatePath(`/lots/${id}`);
  redirect(`/lots/${id}`);
}

export async function supprimerLot(fd: FormData): Promise<void> {
  const id = Number(fd.get("id"));
  const lot = await prisma.lot.findUnique({ where: { id }, include: { _count: { select: { baux: true, depenses: true, emprunts: true } } } });
  if (!lot) redirect("/lots");
  if (lot._count.baux || lot._count.depenses || lot._count.emprunts) {
    redirect(avecMessage(`/lots/${id}`, "Impossible de supprimer ce lot : des baux, dépenses ou emprunts lui sont rattachés.", "erreur"));
  }
  try {
    await prisma.lot.delete({ where: { id } });
  } catch (e) {
    if (estContrainteReference(e)) {
      redirect(avecMessage(`/lots/${id}`, "Impossible de supprimer ce lot : des baux, dépenses ou emprunts lui sont rattachés.", "erreur"));
    }
    throw e;
  }
  revalidatePath("/lots");
  redirect(avecMessage("/lots", "Lot supprimé."));
}
