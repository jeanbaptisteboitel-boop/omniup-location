"use server";

import { prisma } from "@/lib/prisma";
import { messageErreur } from "@/lib/forms";
import { preparerEnvoiDirect } from "@/lib/storage";
import type { ReponsePreparation } from "@/lib/envoi-direct";
import { entiteCouranteId } from "@/lib/entite";
import { exigerEcriture } from "@/lib/droits";

export async function preparerEnvoiDocument(locataireId: number, nom: string, type: string, taille: number): Promise<ReponsePreparation> {
  await exigerEcriture();
  try {
    const l = await prisma.locataire.findFirst({ where: { id: locataireId, entiteId: await entiteCouranteId() }, select: { id: true } });
    if (!l) return { ok: false, erreur: "Locataire introuvable." };
    return { ok: true, preparation: await preparerEnvoiDirect(`locataires/${locataireId}`, { nom, type, taille }) };
  } catch (e) {
    return { ok: false, erreur: messageErreur(e) };
  }
}

export async function preparerEnvoiContratSigne(bailId: number, nom: string, type: string, taille: number): Promise<ReponsePreparation> {
  await exigerEcriture();
  try {
    const b = await prisma.bail.findFirst({ where: { id: bailId, entiteId: await entiteCouranteId() }, select: { id: true } });
    if (!b) return { ok: false, erreur: "Bail introuvable." };
    return { ok: true, preparation: await preparerEnvoiDirect(`baux/${bailId}`, { nom, type, taille }) };
  } catch (e) {
    return { ok: false, erreur: messageErreur(e) };
  }
}

export async function preparerEnvoiJustificatif(nom: string, type: string, taille: number): Promise<ReponsePreparation> {
  await exigerEcriture();
  try {
    return { ok: true, preparation: await preparerEnvoiDirect("depenses", { nom, type, taille }) };
  } catch (e) {
    return { ok: false, erreur: messageErreur(e) };
  }
}
