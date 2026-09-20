"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { echec, erreur, succes, type FormState } from "@/lib/forms";
import { avecMessage } from "@/lib/erreurs";
import { analyser, zBool, zDate, zDateOpt, zEntier, zEnum, zMontant, zMontantOpt, zTexte, zTexteOpt } from "@/lib/validation";
import { aujourdhui, formatDate, periodeDe } from "@/lib/dates";
import { formatEuros } from "@/lib/montants";
import { finPreavis, preavisMois, soldeDepot } from "@/lib/sortie-bail";
import { recalculerAppelsNonRegles, synchroniserAppelsLoyer } from "@/lib/loyers-sync";
import { entiteCouranteId } from "@/lib/entite";
import { exigerEcriture } from "@/lib/droits";

/** Sortie du locataire : congé, état des lieux, clôture, et suivi du dépôt de garantie (encaissement, retenues, restitution). */

async function bailDeLEntite(id: number) {
  return prisma.bail.findFirst({ where: { id, entiteId: await entiteCouranteId() } });
}

function versFiche(id: number, message: string, ton: "message" | "erreur" = "message"): never {
  revalidatePath(`/baux/${id}`);
  redirect(avecMessage(`/baux/${id}?onglet=sortie`, message, ton === "erreur" ? "erreur" : undefined));
}

// ---------------------------------------------------------------------------
// Dépôt de garantie encaissé
// ---------------------------------------------------------------------------

const schemaDepot = z.object({
  depotRecuLe: zDate,
  depotRecuMontant: zMontant,
  depotRecuMode: zEnum(["VIREMENT", "PRELEVEMENT", "CHEQUE", "ESPECES", "AUTRE"]),
  depotRecuReference: zTexteOpt(100),
});

export async function enregistrerDepotRecu(bailId: number, _prev: FormState, fd: FormData): Promise<FormState> {
  await exigerEcriture();
  const bail = await bailDeLEntite(bailId);
  if (!bail) return erreur(fd, "Bail introuvable.");
  const r = analyser(schemaDepot, fd);
  if (!r.success) return echec(fd, r.errors);
  if (r.data.depotRecuLe.getTime() > aujourdhui().getTime()) return echec(fd, { depotRecuLe: "La date d'encaissement ne peut pas être dans le futur." });
  await prisma.bail.update({ where: { id: bailId }, data: r.data });
  revalidatePath(`/baux/${bailId}`);
  const ecart = r.data.depotRecuMontant - bail.depotGarantie;
  return succes(
    `Dépôt de garantie de ${formatEuros(r.data.depotRecuMontant)} encaissé le ${formatDate(r.data.depotRecuLe)}.${
      Math.abs(ecart) > 0.005 ? ` Attention : le bail prévoit ${formatEuros(bail.depotGarantie)} (écart de ${formatEuros(Math.abs(ecart))}).` : ""
    }`,
  );
}

export async function annulerDepotRecu(fd: FormData): Promise<void> {
  await exigerEcriture();
  const id = Number(fd.get("id"));
  const bail = await bailDeLEntite(id);
  if (!bail) redirect("/baux");
  if (bail.depotRestitueLe) versFiche(id, "Le dépôt a déjà été restitué : annulez d'abord la restitution.", "erreur");
  await prisma.bail.update({ where: { id }, data: { depotRecuLe: null, depotRecuMontant: null, depotRecuMode: null, depotRecuReference: null } });
  versFiche(id, "Encaissement du dépôt de garantie annulé.");
}

// ---------------------------------------------------------------------------
// Congé et état des lieux de sortie
// ---------------------------------------------------------------------------

const schemaConge = z.object({
  congeOrigine: zEnum(["LOCATAIRE", "BAILLEUR"]),
  congeRecuLe: zDate,
  congePreavisMois: zEntier(0, 24),
  congeDateDepart: zDateOpt,
  congeMotif: zTexteOpt(300),
});

export async function enregistrerConge(bailId: number, _prev: FormState, fd: FormData): Promise<FormState> {
  await exigerEcriture();
  const bail = await bailDeLEntite(bailId);
  if (!bail) return erreur(fd, "Bail introuvable.");
  if (bail.statut !== "SIGNE") return erreur(fd, "Seul un bail signé peut faire l'objet d'un congé.");
  const r = analyser(schemaConge, fd);
  if (!r.success) return echec(fd, r.errors);
  const { congeOrigine, congeRecuLe, congePreavisMois, congeMotif } = r.data;
  if (congeRecuLe.getTime() < bail.dateDebut.getTime()) return echec(fd, { congeRecuLe: "Le congé ne peut pas précéder le début du bail." });
  // Le départ est déduit du préavis, sauf si le gestionnaire indique une autre date (départ anticipé accepté, accord amiable).
  const congeDateDepart = r.data.congeDateDepart ?? finPreavis(congeRecuLe, congePreavisMois);
  if (congeDateDepart.getTime() < congeRecuLe.getTime()) return echec(fd, { congeDateDepart: "La date de départ ne peut pas précéder la réception du congé." });
  const legal = preavisMois(bail.type, congeOrigine);
  await prisma.bail.update({ where: { id: bailId }, data: { congeOrigine, congeRecuLe, congePreavisMois, congeDateDepart, congeMotif } });
  revalidatePath(`/baux/${bailId}`);
  revalidatePath("/baux");
  const alerte = congePreavisMois < legal && !congeMotif ? ` Préavis inférieur au préavis légal de ${legal} mois : précisez le motif de la réduction.` : "";
  return succes(`Congé enregistré : départ prévu le ${formatDate(congeDateDepart)}.${alerte}`);
}

export async function annulerConge(fd: FormData): Promise<void> {
  await exigerEcriture();
  const id = Number(fd.get("id"));
  if (!(await bailDeLEntite(id))) redirect("/baux");
  await prisma.bail.update({ where: { id }, data: { congeRecuLe: null, congeOrigine: null, congeMotif: null, congePreavisMois: null, congeDateDepart: null } });
  revalidatePath("/baux");
  versFiche(id, "Congé annulé : le bail se poursuit.");
}

const schemaEtatLieux = z.object({ etatLieuxSortieLe: zDate, etatLieuxConforme: zBool });

export async function enregistrerEtatLieuxSortie(bailId: number, _prev: FormState, fd: FormData): Promise<FormState> {
  await exigerEcriture();
  const bail = await bailDeLEntite(bailId);
  if (!bail) return erreur(fd, "Bail introuvable.");
  const r = analyser(schemaEtatLieux, fd);
  if (!r.success) return echec(fd, r.errors);
  if (r.data.etatLieuxSortieLe.getTime() < bail.dateDebut.getTime()) return echec(fd, { etatLieuxSortieLe: "L'état des lieux de sortie ne peut pas précéder le début du bail." });
  await prisma.bail.update({ where: { id: bailId }, data: r.data });
  revalidatePath(`/baux/${bailId}`);
  return succes(
    r.data.etatLieuxConforme
      ? "État des lieux de sortie conforme à l'entrée : le dépôt de garantie doit être restitué dans le mois qui suit la remise des clés."
      : "État des lieux de sortie non conforme : le dépôt de garantie doit être restitué dans les deux mois, retenues justifiées à l'appui.",
  );
}

// ---------------------------------------------------------------------------
// Retenues sur le dépôt et restitution
// ---------------------------------------------------------------------------

export async function ajouterRetenue(bailId: number, _prev: FormState, fd: FormData): Promise<FormState> {
  await exigerEcriture();
  if (!(await bailDeLEntite(bailId))) return erreur(fd, "Bail introuvable.");
  const r = analyser(z.object({ libelle: zTexte(200), montant: zMontant }), fd);
  if (!r.success) return echec(fd, r.errors);
  if (r.data.montant <= 0) return echec(fd, { montant: "Indiquez un montant supérieur à zéro." });
  await prisma.retenueDepot.create({ data: { bailId, libelle: r.data.libelle, montant: r.data.montant } });
  revalidatePath(`/baux/${bailId}`);
  return succes(`Retenue « ${r.data.libelle} » de ${formatEuros(r.data.montant)} ajoutée au décompte.`);
}

export async function supprimerRetenue(fd: FormData): Promise<void> {
  await exigerEcriture();
  const id = Number(fd.get("id"));
  const retenue = await prisma.retenueDepot.findFirst({ where: { id, bail: { entiteId: await entiteCouranteId() } }, select: { bailId: true } });
  if (!retenue) redirect("/baux");
  await prisma.retenueDepot.delete({ where: { id } });
  versFiche(retenue.bailId, "Retenue supprimée.");
}

const schemaRestitution = z.object({
  depotRestitueLe: zDate,
  depotRestitueMontant: zMontantOpt,
  depotRestitueMode: zEnum(["VIREMENT", "PRELEVEMENT", "CHEQUE", "ESPECES", "AUTRE"]),
});

export async function restituerDepot(bailId: number, _prev: FormState, fd: FormData): Promise<FormState> {
  await exigerEcriture();
  const bail = await prisma.bail.findFirst({ where: { id: bailId, entiteId: await entiteCouranteId() }, include: { retenuesDepot: true } });
  if (!bail) return erreur(fd, "Bail introuvable.");
  if (!bail.depotRecuLe) return erreur(fd, "Aucun dépôt de garantie n'a été encaissé pour ce bail.");
  const r = analyser(schemaRestitution, fd);
  if (!r.success) return echec(fd, r.errors);
  const solde = soldeDepot(bail, bail.retenuesDepot);
  const montant = r.data.depotRestitueMontant ?? solde.restituable;
  if (montant > solde.recu + 0.005) return echec(fd, { depotRestitueMontant: `La restitution ne peut pas dépasser le dépôt encaissé (${formatEuros(solde.recu)}).` });
  await prisma.bail.update({ where: { id: bailId }, data: { depotRestitueLe: r.data.depotRestitueLe, depotRestitueMontant: montant, depotRestitueMode: r.data.depotRestitueMode } });
  revalidatePath(`/baux/${bailId}`);
  const ecart = solde.restituable - montant;
  return succes(`Restitution de ${formatEuros(montant)} enregistrée le ${formatDate(r.data.depotRestitueLe)}.${Math.abs(ecart) > 0.005 ? ` Le décompte faisait ressortir ${formatEuros(solde.restituable)}.` : ""}`);
}

export async function annulerRestitution(fd: FormData): Promise<void> {
  await exigerEcriture();
  const id = Number(fd.get("id"));
  if (!(await bailDeLEntite(id))) redirect("/baux");
  await prisma.bail.update({ where: { id }, data: { depotRestitueLe: null, depotRestitueMontant: null, depotRestitueMode: null } });
  versFiche(id, "Restitution annulée.");
}

// ---------------------------------------------------------------------------
// Clôture du bail (départ effectif)
// ---------------------------------------------------------------------------

/** Clôture le bail au départ du locataire : le dernier appel de loyer est recalculé au prorata des jours occupés. */
export async function cloturerAuDepart(fd: FormData): Promise<void> {
  await exigerEcriture();
  const id = Number(fd.get("id"));
  const dateFin = zDate.safeParse(String(fd.get("dateFinEffective") ?? ""));
  const bail = await bailDeLEntite(id);
  if (!bail) redirect("/baux");
  if (bail.statut !== "SIGNE") versFiche(id, "Seul un bail signé peut être clôturé.", "erreur");
  if (!dateFin.success) versFiche(id, "Indiquez la date de départ effective du locataire.", "erreur");
  const departLe = dateFin.data;
  if (departLe.getTime() < bail.dateDebut.getTime()) versFiche(id, "La date de départ ne peut pas précéder le début du bail.", "erreur");
  await prisma.bail.update({ where: { id }, data: { statut: "TERMINE", dateFinEffective: departLe } });
  await recalculerAppelsNonRegles(id, periodeDe(departLe));
  await synchroniserAppelsLoyer({ bailId: id });
  const dernier = await prisma.appelLoyer.findFirst({ where: { bailId: id }, orderBy: { periode: "desc" }, include: { paiements: true } });
  for (const chemin of ["/baux", "/loyers", `/lots/${bail.lotId}`]) revalidatePath(chemin);
  const detail = dernier ? ` Dernier loyer (${dernier.periode}) : ${formatEuros(dernier.total)}${dernier.prorata ? " au prorata des jours occupés" : ""}.` : "";
  versFiche(id, `Bail clôturé au ${formatDate(departLe)}.${detail} Établissez le décompte du dépôt de garantie ci-dessous.`);
}
