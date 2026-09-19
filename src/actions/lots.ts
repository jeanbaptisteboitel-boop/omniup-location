"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { echec, erreur, type FormState } from "@/lib/forms";
import { avecMessage, estContrainteReference } from "@/lib/erreurs";
import { analyser, zBool, zCodePostal, zDateOpt, zEntierOpt, zEnum, zIdOpt, zMontantOpt, zNombreOpt, zTexte, zTexteOpt } from "@/lib/validation";
import { entiteCouranteId } from "@/lib/entite";
import { exigerEcriture } from "@/lib/droits";

const schemaLot = z.object({
  type: zEnum(["APPARTEMENT", "MAISON", "LOCAL_COMMERCIAL", "LOCAL_PROFESSIONNEL"]),
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
  optionTva: zBool,
  optionTvaDate: zDateOpt,
  description: zTexteOpt(5000),
});

async function verifierRattachements(entiteId: number, d: { bailleurId: number | null; immeubleId: number | null; optionTva: boolean }): Promise<Record<string, string>> {
  const errors: Record<string, string> = {};
  if (d.bailleurId && !(await prisma.bailleur.findFirst({ where: { id: d.bailleurId, entiteId }, select: { id: true } }))) errors.bailleurId = "Bailleur introuvable.";
  if (d.immeubleId) {
    const immeuble = await prisma.immeuble.findFirst({ where: { id: d.immeubleId, entiteId }, select: { id: true, optionTva: true } });
    if (!immeuble) errors.immeubleId = "Immeuble introuvable.";
    else if (d.optionTva && !immeuble.optionTva) errors.optionTva = "L'immeuble n'a pas opté pour la TVA : activez d'abord l'option sur la fiche de l'immeuble.";
  }
  return errors;
}

export async function creerLot(_prev: FormState, fd: FormData): Promise<FormState> {
  await exigerEcriture();
  const r = analyser(schemaLot, fd);
  if (!r.success) return echec(fd, r.errors);
  const entiteId = await entiteCouranteId();
  const pb = await verifierRattachements(entiteId, r.data);
  if (Object.keys(pb).length) return echec(fd, pb);
  const lot = await prisma.lot.create({ data: { ...r.data, entiteId } });
  revalidatePath("/lots");
  redirect(`/lots/${lot.id}`);
}

export async function modifierLot(id: number, _prev: FormState, fd: FormData): Promise<FormState> {
  await exigerEcriture();
  const r = analyser(schemaLot, fd);
  if (!r.success) return echec(fd, r.errors);
  const entiteId = await entiteCouranteId();
  const existant = await prisma.lot.findFirst({ where: { id, entiteId }, select: { id: true } });
  if (!existant) return erreur(fd, "Lot introuvable.");
  const pb = await verifierRattachements(entiteId, r.data);
  if (Object.keys(pb).length) return echec(fd, pb);
  await prisma.lot.update({ where: { id }, data: r.data });
  revalidatePath("/lots");
  revalidatePath(`/lots/${id}`);
  redirect(`/lots/${id}`);
}

export async function supprimerLot(fd: FormData): Promise<void> {
  await exigerEcriture();
  const id = Number(fd.get("id"));
  const lot = await prisma.lot.findFirst({ where: { id, entiteId: await entiteCouranteId() }, include: { _count: { select: { baux: true, depenses: true, emprunts: true } } } });
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
