"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { ClasseEnergie } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { echec, erreur, messageErreur, succes, type FormState } from "@/lib/forms";
import { avecMessage, estContrainteReference } from "@/lib/erreurs";
import { analyser, zBool, zCodePostal, zDateOpt, zEntierOpt, zEnum, zEnumOpt, zIdOpt, zMontantOpt, zNombreOpt, zTexte, zTexteOpt } from "@/lib/validation";
import { confirmerEnvoiDirect, enregistrerFichier, preparerEnvoiDirect, supprimerFichier, typeMimeDe, verifierFichier } from "@/lib/storage";
import type { FichierTeleverse, ReponsePreparation } from "@/lib/envoi-direct";
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
  // Diagnostic de performance énergétique : facultatif à la saisie, il n'empêche jamais d'enregistrer le lot.
  dpeClasseEnergie: zEnumOpt(["A", "B", "C", "D", "E", "F", "G"]),
  dpeClasseGes: zEnumOpt(["A", "B", "C", "D", "E", "F", "G"]),
  dpeConsommation: zMontantOpt,
  dpeEmissions: zMontantOpt,
  dpeRealiseLe: zDateOpt,
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

/** Un champ vide efface l'étiquette : sans cela, Prisma conserverait l'ancienne valeur. */
function classesDpe(d: { dpeClasseEnergie?: ClasseEnergie | null; dpeClasseGes?: ClasseEnergie | null }) {
  return { dpeClasseEnergie: d.dpeClasseEnergie ?? null, dpeClasseGes: d.dpeClasseGes ?? null };
}

export async function creerLot(_prev: FormState, fd: FormData): Promise<FormState> {
  await exigerEcriture();
  const r = analyser(schemaLot, fd);
  if (!r.success) return echec(fd, r.errors);
  const entiteId = await entiteCouranteId();
  const pb = await verifierRattachements(entiteId, r.data);
  if (Object.keys(pb).length) return echec(fd, pb);
  const lot = await prisma.lot.create({ data: { ...r.data, ...classesDpe(r.data), entiteId } });
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
  await prisma.lot.update({ where: { id }, data: { ...r.data, ...classesDpe(r.data) } });
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

/**
 * Dépôt du DPE du logement (PDF ou photo). Le diagnostic est annexé au contrat de location ;
 * tant qu'il manque, l'application le signale sans empêcher la mise en location.
 */
export async function preparerEnvoiDpe(nom: string, type: string, taille: number): Promise<ReponsePreparation> {
  await exigerEcriture();
  try {
    return { ok: true, preparation: await preparerEnvoiDirect("dpe", { nom, type, taille }) };
  } catch (e) {
    return { ok: false, erreur: messageErreur(e) };
  }
}

export async function deposerDpe(id: number, _prev: FormState, fd: FormData): Promise<FormState> {
  await exigerEcriture();
  const lot = await prisma.lot.findFirst({ where: { id, entiteId: await entiteCouranteId() }, select: { id: true, dpeChemin: true } });
  if (!lot) return erreur(fd, "Lot introuvable.");

  let fichier: { nomFichier: string; chemin: string; mimeType: string; taille: number };
  try {
    const meta = fd.get("fichiers");
    if (typeof meta === "string" && meta.trim() !== "") {
      const t = (JSON.parse(meta) as FichierTeleverse[])[0];
      if (!t) return echec(fd, { fichier: "Sélectionnez le fichier du diagnostic." });
      const mimeType = typeMimeDe({ name: t.nomFichier, type: t.mimeType });
      if (!mimeType) return echec(fd, { fichier: "Format non pris en charge (PDF ou photo)." });
      fichier = { nomFichier: t.nomFichier, chemin: t.chemin, mimeType, taille: await confirmerEnvoiDirect(t.chemin, "dpe/") };
    } else {
      const f = fd.get("fichier");
      if (!(f instanceof File) || f.size === 0) return echec(fd, { fichier: "Sélectionnez le fichier du diagnostic." });
      const pb = verifierFichier(f);
      if (pb) return echec(fd, { fichier: pb });
      const e = await enregistrerFichier(f, "dpe");
      fichier = { nomFichier: e.nomFichier, chemin: e.chemin, mimeType: e.mimeType, taille: e.taille };
    }
  } catch (e) {
    return erreur(fd, messageErreur(e, "Échec de l'envoi du fichier."));
  }

  const ancien = lot.dpeChemin;
  await prisma.lot.update({
    where: { id },
    data: { dpeNomFichier: fichier.nomFichier, dpeChemin: fichier.chemin, dpeMimeType: fichier.mimeType, dpeTaille: fichier.taille },
  });
  if (ancien && ancien !== fichier.chemin) await supprimerFichier(ancien);
  revalidatePath(`/lots/${id}`);
  return succes("Diagnostic de performance énergétique joint au lot.");
}

export async function supprimerDpe(fd: FormData): Promise<void> {
  await exigerEcriture();
  const id = Number(fd.get("id"));
  const lot = await prisma.lot.findFirst({ where: { id, entiteId: await entiteCouranteId() }, select: { id: true, dpeChemin: true } });
  if (!lot) redirect("/lots");
  await supprimerFichier(lot.dpeChemin);
  await prisma.lot.update({ where: { id }, data: { dpeNomFichier: null, dpeChemin: null, dpeMimeType: null, dpeTaille: null } });
  revalidatePath(`/lots/${id}`);
  redirect(avecMessage(`/lots/${id}`, "Fichier du diagnostic retiré."));
}
