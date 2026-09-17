"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { echec, erreur, succes, type FormState } from "@/lib/forms";
import { avecMessage } from "@/lib/erreurs";
import { analyser, zEnum, zIdOpt, zTexte, zTexteOpt } from "@/lib/validation";
import { entiteCouranteId } from "@/lib/entite";
import { remplirModele } from "@/lib/modeles";
import { modeleDefautParCode } from "@/lib/modeles-defaut";
import { contexteBase, contexteDepuisBail, includeBailPourModele } from "@/lib/modeles-data";

const CATEGORIES = ["BAIL", "AVENANT", "RENOUVELLEMENT", "RESILIATION", "CAUTION", "CONVENTION", "AUTRE"] as const;

const schemaModele = z.object({
  nom: zTexte(200),
  categorie: zEnum(CATEGORIES),
  description: zTexteOpt(500),
  contenu: zTexte(100000),
});

export async function creerModele(_prev: FormState, fd: FormData): Promise<FormState> {
  const r = analyser(schemaModele, fd);
  if (!r.success) return echec(fd, r.errors);
  const m = await prisma.modeleDocument.create({ data: { ...r.data, parDefaut: false } });
  revalidatePath("/modeles");
  redirect(avecMessage(`/modeles/${m.id}`, "Modèle créé."));
}

export async function modifierModele(id: number, _prev: FormState, fd: FormData): Promise<FormState> {
  const r = analyser(schemaModele, fd);
  if (!r.success) return echec(fd, r.errors);
  await prisma.modeleDocument.update({ where: { id }, data: r.data });
  revalidatePath("/modeles");
  revalidatePath(`/modeles/${id}`);
  return succes("Modèle enregistré.");
}

export async function dupliquerModele(fd: FormData): Promise<void> {
  const id = Number(fd.get("id"));
  const m = await prisma.modeleDocument.findUnique({ where: { id } });
  if (!m) redirect("/modeles");
  const copie = await prisma.modeleDocument.create({ data: { nom: `${m.nom} (copie)`, categorie: m.categorie, description: m.description, contenu: m.contenu, parDefaut: false } });
  revalidatePath("/modeles");
  redirect(avecMessage(`/modeles/${copie.id}`, "Modèle dupliqué : vous pouvez l'adapter librement."));
}

export async function reinitialiserModele(fd: FormData): Promise<void> {
  const id = Number(fd.get("id"));
  const m = await prisma.modeleDocument.findUnique({ where: { id } });
  if (!m) redirect("/modeles");
  const defaut = m.code ? modeleDefautParCode(m.code) : undefined;
  if (!defaut) redirect(avecMessage(`/modeles/${id}`, "Ce modèle n'est pas un modèle fourni par défaut.", "erreur"));
  await prisma.modeleDocument.update({ where: { id }, data: { nom: defaut.nom, categorie: defaut.categorie, description: defaut.description, contenu: defaut.contenu } });
  revalidatePath(`/modeles/${id}`);
  redirect(avecMessage(`/modeles/${id}`, "Modèle réinitialisé à sa version d'origine."));
}

export async function supprimerModele(fd: FormData): Promise<void> {
  const id = Number(fd.get("id"));
  const m = await prisma.modeleDocument.findUnique({ where: { id } });
  if (!m) redirect("/modeles");
  if (m.parDefaut) redirect(avecMessage(`/modeles/${id}`, "Les modèles fournis par défaut ne peuvent pas être supprimés (vous pouvez les modifier ou les réinitialiser).", "erreur"));
  await prisma.modeleDocument.delete({ where: { id } });
  revalidatePath("/modeles");
  redirect(avecMessage("/modeles", "Modèle supprimé."));
}

const schemaGeneration = z.object({ bailId: zIdOpt, titre: zTexteOpt(200) });

/** Génère un document à partir d'un modèle, rempli avec les données du bail choisi (facultatif). */
export async function genererDocument(modeleId: number, _prev: FormState, fd: FormData): Promise<FormState> {
  const r = analyser(schemaGeneration, fd);
  if (!r.success) return echec(fd, r.errors);
  const modele = await prisma.modeleDocument.findUnique({ where: { id: modeleId } });
  if (!modele) return erreur(fd, "Modèle introuvable.");
  const entiteId = await entiteCouranteId();
  let ctx = await contexteBase();
  let bailId: number | null = null;
  if (r.data.bailId) {
    const bail = await prisma.bail.findFirst({ where: { id: r.data.bailId, entiteId }, include: includeBailPourModele });
    if (!bail) return echec(fd, { bailId: "Bail introuvable." });
    ctx = await contexteDepuisBail(bail);
    bailId = bail.id;
  }
  const contenu = remplirModele(modele.contenu, ctx);
  const d = await prisma.documentGenere.create({ data: { entiteId, bailId, modeleId, titre: r.data.titre ?? modele.nom, categorie: modele.categorie, contenu } });
  revalidatePath("/documents");
  if (bailId) revalidatePath(`/baux/${bailId}`);
  redirect(avecMessage(`/documents/${d.id}`, `Document généré à partir du modèle « ${modele.nom} » : complétez les champs entre crochets, puis enregistrez.`));
}

/** Remplit le texte du contrat d'un bail à partir d'un modèle de la catégorie « Baux ». */
export async function genererContratDepuisModele(bailId: number, fd: FormData): Promise<void> {
  const modeleId = Number(fd.get("modeleId"));
  const entiteId = await entiteCouranteId();
  const [bail, modele] = await Promise.all([
    prisma.bail.findFirst({ where: { id: bailId, entiteId }, include: includeBailPourModele }),
    prisma.modeleDocument.findUnique({ where: { id: modeleId } }),
  ]);
  if (!bail) redirect("/baux");
  if (!modele) redirect(avecMessage(`/baux/${bailId}/contrat`, "Modèle introuvable.", "erreur"));
  const contenu = remplirModele(modele.contenu, await contexteDepuisBail(bail));
  await prisma.bail.update({ where: { id: bailId }, data: { texteContrat: contenu } });
  revalidatePath(`/baux/${bailId}/contrat`);
  redirect(avecMessage(`/baux/${bailId}/contrat`, `Contrat généré à partir du modèle « ${modele.nom} » : relisez-le et complétez les champs entre crochets.`));
}
