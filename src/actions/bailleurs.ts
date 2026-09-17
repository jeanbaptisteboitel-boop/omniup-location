"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { echec, erreur, type FormState } from "@/lib/forms";
import { analyser, zCodePostal, zEmailOpt, zEnum, zTexte, zTexteOpt } from "@/lib/validation";
import { entiteCouranteId } from "@/lib/entite";

const schemaBailleur = z.object({
  typePersonne: zEnum(["PHYSIQUE", "MORALE"]),
  nom: zTexte(200),
  representant: zTexteOpt(200),
  adresse: zTexte(300),
  complementAdresse: zTexteOpt(300),
  codePostal: zCodePostal,
  ville: zTexte(120),
  email: zEmailOpt,
  telephone: zTexteOpt(40),
  siren: zTexteOpt(20),
  iban: zTexteOpt(50),
  bic: zTexteOpt(20),
  notes: zTexteOpt(5000),
});

export async function creerBailleur(_prev: FormState, fd: FormData): Promise<FormState> {
  const r = analyser(schemaBailleur, fd);
  if (!r.success) return echec(fd, r.errors);
  const b = await prisma.bailleur.create({ data: { ...r.data, entiteId: await entiteCouranteId() } });
  revalidatePath("/bailleurs");
  redirect(`/bailleurs/${b.id}`);
}

export async function modifierBailleur(id: number, _prev: FormState, fd: FormData): Promise<FormState> {
  const r = analyser(schemaBailleur, fd);
  if (!r.success) return echec(fd, r.errors);
  const existant = await prisma.bailleur.findFirst({ where: { id, entiteId: await entiteCouranteId() }, select: { id: true } });
  if (!existant) return erreur(fd, "Bailleur introuvable.");
  await prisma.bailleur.update({ where: { id }, data: r.data });
  revalidatePath("/bailleurs");
  revalidatePath(`/bailleurs/${id}`);
  redirect(`/bailleurs/${id}`);
}

export async function supprimerBailleur(fd: FormData): Promise<void> {
  const id = Number(fd.get("id"));
  const existant = await prisma.bailleur.findFirst({ where: { id, entiteId: await entiteCouranteId() }, select: { id: true } });
  if (!existant) redirect("/bailleurs");
  await prisma.bailleur.delete({ where: { id } });
  revalidatePath("/bailleurs");
  redirect("/bailleurs?message=" + encodeURIComponent("Bailleur supprimé."));
}
