"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { echec, erreur, succes, type FormState } from "@/lib/forms";
import { avecMessage } from "@/lib/erreurs";
import { analyser, zDate, zMontant, zTexteOpt } from "@/lib/validation";
import { formatDate, periodeDe } from "@/lib/dates";
import { formatEuros } from "@/lib/montants";
import { recalculerAppelsNonRegles } from "@/lib/loyers-sync";
import { entiteCouranteId } from "@/lib/entite";
import { exigerEcriture } from "@/lib/droits";

/**
 * Révision du loyer : le bailleur peut la bloquer (aucune révision annuelle n'est alors proposée),
 * et le gestionnaire peut toujours saisir une révision manuelle avec sa date d'effet.
 */

async function bailDeLEntite(id: number) {
  return prisma.bail.findFirst({ where: { id, entiteId: await entiteCouranteId() } });
}

export async function bloquerRevision(fd: FormData): Promise<void> {
  await exigerEcriture();
  const id = Number(fd.get("id"));
  const motif = String(fd.get("motif") ?? "").trim() || null;
  const bail = await bailDeLEntite(id);
  if (!bail) redirect("/baux");
  await prisma.bail.update({ where: { id }, data: { revisionBloquee: true, revisionBlocageLe: new Date(), revisionBlocageMotif: motif } });
  revalidatePath(`/baux/${id}`);
  revalidatePath("/");
  redirect(avecMessage(`/baux/${id}?onglet=revisions`, "Révision du loyer bloquée : elle ne sera plus proposée. Une révision manuelle reste possible."));
}

export async function debloquerRevision(fd: FormData): Promise<void> {
  await exigerEcriture();
  const id = Number(fd.get("id"));
  const bail = await bailDeLEntite(id);
  if (!bail) redirect("/baux");
  await prisma.bail.update({ where: { id }, data: { revisionBloquee: false, revisionBlocageLe: null, revisionBlocageMotif: null } });
  revalidatePath(`/baux/${id}`);
  revalidatePath("/");
  redirect(avecMessage(`/baux/${id}?onglet=revisions`, "Révision du loyer débloquée : elle sera de nouveau proposée à la date anniversaire."));
}

const schemaManuelle = z.object({
  nouveauLoyer: zMontant,
  dateEffet: zDate,
  motif: zTexteOpt(300),
});

/** Révision saisie à la main (accord amiable, loyer négocié, régularisation) : elle s'applique à la date d'effet indiquée. */
export async function reviserManuellement(id: number, _prev: FormState, fd: FormData): Promise<FormState> {
  await exigerEcriture();
  const r = analyser(schemaManuelle, fd);
  if (!r.success) return echec(fd, r.errors);
  const bail = await bailDeLEntite(id);
  if (!bail) return erreur(fd, "Bail introuvable.");
  if (bail.statut === "BROUILLON" || bail.statut === "EN_SIGNATURE") return erreur(fd, "Modifiez directement le loyer tant que le bail n'est pas signé.");
  const { nouveauLoyer, dateEffet, motif } = r.data;
  if (nouveauLoyer <= 0) return echec(fd, { nouveauLoyer: "Indiquez un loyer supérieur à zéro." });
  if (Math.abs(nouveauLoyer - bail.loyerHC) < 0.005) return echec(fd, { nouveauLoyer: `Le loyer est déjà de ${formatEuros(bail.loyerHC)} hors charges.` });
  if (dateEffet.getTime() < bail.dateDebut.getTime()) return echec(fd, { dateEffet: "La révision ne peut pas prendre effet avant le début du bail." });
  const derniere = await prisma.revisionLoyer.findFirst({ where: { bailId: id }, orderBy: { dateEffet: "desc" } });
  if (derniere && dateEffet.getTime() <= derniere.dateEffet.getTime()) {
    return echec(fd, { dateEffet: `La dernière révision a pris effet le ${formatDate(derniere.dateEffet)} : choisissez une date postérieure.` });
  }

  await prisma.$transaction([
    prisma.revisionLoyer.create({
      data: { bailId: id, dateEffet, ancienLoyer: bail.loyerHC, nouveauLoyer, manuelle: true, motif },
    }),
    prisma.bail.update({ where: { id }, data: { loyerHC: nouveauLoyer } }),
  ]);
  await recalculerAppelsNonRegles(id, periodeDe(dateEffet));
  revalidatePath(`/baux/${id}`);
  revalidatePath("/loyers");
  const sens = nouveauLoyer > bail.loyerHC ? "augmenté" : "diminué";
  redirect(
    avecMessage(
      `/baux/${id}?onglet=revisions`,
      `Loyer ${sens} manuellement : ${formatEuros(bail.loyerHC)} → ${formatEuros(nouveauLoyer)} hors charges à compter du ${formatDate(dateEffet)}. Les appels de loyer non réglés à partir de cette date ont été recalculés.`,
    ),
  );
}

/** Suppression d'une révision (erreur de saisie) : le loyer du bail revient à la valeur antérieure. */
export async function annulerRevision(fd: FormData): Promise<void> {
  await exigerEcriture();
  const id = Number(fd.get("id"));
  const revision = await prisma.revisionLoyer.findFirst({ where: { id, bail: { entiteId: await entiteCouranteId() } }, include: { bail: true } });
  if (!revision) redirect("/baux");
  const derniere = await prisma.revisionLoyer.findFirst({ where: { bailId: revision.bailId }, orderBy: { dateEffet: "desc" } });
  if (derniere?.id !== revision.id) {
    redirect(avecMessage(`/baux/${revision.bailId}?onglet=revisions`, "Seule la dernière révision peut être annulée.", "erreur"));
  }
  await prisma.$transaction([
    prisma.revisionLoyer.delete({ where: { id } }),
    prisma.bail.update({ where: { id: revision.bailId }, data: { loyerHC: revision.ancienLoyer } }),
  ]);
  await recalculerAppelsNonRegles(revision.bailId, periodeDe(revision.dateEffet));
  revalidatePath(`/baux/${revision.bailId}`);
  revalidatePath("/loyers");
  redirect(avecMessage(`/baux/${revision.bailId}?onglet=revisions`, `Révision annulée : le loyer revient à ${formatEuros(revision.ancienLoyer)} hors charges.`));
}
