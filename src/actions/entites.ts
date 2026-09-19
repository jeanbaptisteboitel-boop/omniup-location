"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { echec, erreur, type FormState } from "@/lib/forms";
import { avecMessage } from "@/lib/erreurs";
import { analyser, zEnum, zTexte, zTexteOpt } from "@/lib/validation";
import { COOKIE_ENTITE, multiEntitesActif, volumeEntite } from "@/lib/entite";
import { exigerAdministration, exigerSuperAdmin } from "@/lib/droits";

const schemaEntite = z.object({
  nom: zTexte(200),
  type: zEnum(["PERSONNE", "SOCIETE", "AUTRE"]),
  notes: zTexteOpt(2000),
});

function toutRevalider() {
  revalidatePath("/", "layout");
}

export async function creerEntite(_prev: FormState, fd: FormData): Promise<FormState> {
  await exigerSuperAdmin();
  if (!(await multiEntitesActif())) return erreur(fd, "Activez d'abord la gestion multi-entités dans les paramètres.");
  const r = analyser(schemaEntite, fd);
  if (!r.success) return echec(fd, r.errors);
  const e = await prisma.entite.create({ data: r.data });
  toutRevalider();
  redirect(avecMessage("/entites", `Entité « ${e.nom} » créée. Sélectionnez-la pour y saisir ses bailleurs, lots et locataires.`));
}

export async function modifierEntite(id: number, _prev: FormState, fd: FormData): Promise<FormState> {
  await exigerAdministration();
  const r = analyser(schemaEntite, fd);
  if (!r.success) return echec(fd, r.errors);
  const e = await prisma.entite.update({ where: { id }, data: r.data });
  toutRevalider();
  const retour = String(fd.get("retour") ?? "") || "/entites";
  redirect(avecMessage(retour, `Entité « ${e.nom} » enregistrée.`));
}

export async function supprimerEntite(fd: FormData): Promise<void> {
  await exigerSuperAdmin();
  const id = Number(fd.get("id"));
  const nb = await prisma.entite.count();
  if (nb <= 1) redirect(avecMessage("/entites", "Impossible de supprimer la dernière entité.", "erreur"));
  if ((await volumeEntite(id)) > 0) redirect(avecMessage("/entites", "Cette entité contient encore des données (bailleurs, lots, locataires, baux, dépenses…) : supprimez-les d'abord.", "erreur"));
  await prisma.entite.delete({ where: { id } });
  const magasin = await cookies();
  if (Number(magasin.get(COOKIE_ENTITE)?.value) === id) magasin.delete(COOKIE_ENTITE);
  toutRevalider();
  redirect(avecMessage("/entites", "Entité supprimée."));
}

export async function changerEntite(fd: FormData): Promise<void> {
  const id = Number(fd.get("entiteId"));
  const retour = String(fd.get("retour") ?? "");
  const e = Number.isInteger(id) && id > 0 ? await prisma.entite.findUnique({ where: { id } }) : null;
  if (!e) redirect("/");
  const magasin = await cookies();
  magasin.set(COOKIE_ENTITE, String(e.id), { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 365 * 24 * 3600 });
  toutRevalider();
  // Retour sur une page de liste (les pages de détail appartiennent à l'ancienne entité).
  const cibles = ["/bailleurs", "/immeubles", "/lots", "/locataires", "/baux", "/loyers", "/depenses", "/emprunts", "/synthese", "/documents", "/modeles", "/outils", "/assistant", "/parametres", "/entites"];
  const cible = cibles.find((c) => retour === c || retour.startsWith(c + "?")) ?? "/";
  redirect(cible);
}

export async function activerMultiEntites(): Promise<void> {
  await exigerSuperAdmin();
  await prisma.reglages.upsert({ where: { id: 1 }, update: { multiEntites: true }, create: { id: 1, multiEntites: true } });
  toutRevalider();
  redirect(avecMessage("/entites", "Gestion multi-entités activée : créez vos entités ci-dessous, puis sélectionnez l'entité de travail dans la barre latérale."));
}

export async function desactiverMultiEntites(): Promise<void> {
  await exigerSuperAdmin();
  const nb = await prisma.entite.count();
  if (nb > 1) redirect(avecMessage("/parametres", `Impossible de repasser en entité unique : ${nb} entités existent. Supprimez les entités inutilisées d'abord.`, "erreur"));
  await prisma.reglages.upsert({ where: { id: 1 }, update: { multiEntites: false }, create: { id: 1, multiEntites: false } });
  const magasin = await cookies();
  magasin.delete(COOKIE_ENTITE);
  toutRevalider();
  redirect(avecMessage("/parametres", "Retour au mode entité unique."));
}
