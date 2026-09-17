"use server";

import { prisma } from "@/lib/prisma";
import { messageErreur } from "@/lib/forms";
import { preparerEnvoiDirect } from "@/lib/storage";
import type { ReponsePreparation } from "@/lib/envoi-direct";

export async function preparerEnvoiDocument(locataireId: number, nom: string, type: string, taille: number): Promise<ReponsePreparation> {
  try {
    const l = await prisma.locataire.findUnique({ where: { id: locataireId }, select: { id: true } });
    if (!l) return { ok: false, erreur: "Locataire introuvable." };
    return { ok: true, preparation: await preparerEnvoiDirect(`locataires/${locataireId}`, { nom, type, taille }) };
  } catch (e) {
    return { ok: false, erreur: messageErreur(e) };
  }
}

export async function preparerEnvoiJustificatif(nom: string, type: string, taille: number): Promise<ReponsePreparation> {
  try {
    return { ok: true, preparation: await preparerEnvoiDirect("depenses", { nom, type, taille }) };
  } catch (e) {
    return { ok: false, erreur: messageErreur(e) };
  }
}
