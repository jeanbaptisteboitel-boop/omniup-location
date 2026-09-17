"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { echec, erreur, messageErreur, succes, type FormState } from "@/lib/forms";
import { avecMessage } from "@/lib/erreurs";
import { confirmerEnvoiDirect, enregistrerFichier, supprimerFichier, typeMimeDe, verifierFichier } from "@/lib/storage";
import type { FichierTeleverse } from "@/lib/envoi-direct";
import { analyser, zEnum, zTexteOpt } from "@/lib/validation";
import { CATEGORIES_DOCUMENT } from "@/lib/libelles";
import { entiteCouranteId } from "@/lib/entite";

const schemaDocument = z.object({
  categorie: zEnum(["PIECE_IDENTITE", "AVIS_IMPOSITION", "LETTRE_RECOMMANDATION", "JUSTIFICATIF_DOMICILE", "JUSTIFICATIF_REVENUS", "AUTRE"]),
  libelle: zTexteOpt(200),
});

export async function ajouterDocument(locataireId: number, _prev: FormState, fd: FormData): Promise<FormState> {
  const r = analyser(schemaDocument, fd);
  const errors = r.success ? {} : r.errors;
  const meta = fd.get("fichiers");
  const direct = typeof meta === "string" && meta.trim() !== "";

  let televerses: FichierTeleverse[] = [];
  let fichiers: File[] = [];
  if (direct) {
    try {
      televerses = JSON.parse(meta) as FichierTeleverse[];
    } catch {
      return erreur(fd, "Données d'envoi illisibles : recommencez l'import.");
    }
    if (!Array.isArray(televerses) || televerses.length === 0) errors.fichier = "Sélectionnez au moins un fichier.";
  } else {
    fichiers = fd.getAll("fichier").filter((f): f is File => f instanceof File && f.size > 0);
    if (fichiers.length === 0) errors.fichier = "Sélectionnez au moins un fichier.";
    for (const f of fichiers) {
      const pb = verifierFichier(f);
      if (pb) {
        errors.fichier = `${f.name} : ${pb}`;
        break;
      }
    }
  }
  if (!r.success || Object.keys(errors).length) return echec(fd, errors);

  const locataire = await prisma.locataire.findFirst({ where: { id: locataireId, entiteId: await entiteCouranteId() }, select: { id: true } });
  if (!locataire) return erreur(fd, "Locataire introuvable.");

  let nb = 0;
  try {
    if (direct) {
      for (const t of televerses) {
        const mimeType = typeMimeDe({ name: t.nomFichier, type: t.mimeType });
        if (!mimeType) throw new Error(`${t.nomFichier} : format non pris en charge.`);
        const taille = await confirmerEnvoiDirect(t.chemin, `locataires/${locataireId}/`);
        await prisma.document.create({ data: { locataireId, categorie: r.data.categorie, libelle: r.data.libelle, nomFichier: t.nomFichier, chemin: t.chemin, mimeType, taille } });
        nb++;
      }
    } else {
      for (const f of fichiers) {
        const e = await enregistrerFichier(f, `locataires/${locataireId}`);
        await prisma.document.create({ data: { locataireId, categorie: r.data.categorie, libelle: r.data.libelle, nomFichier: e.nomFichier, chemin: e.chemin, mimeType: e.mimeType, taille: e.taille } });
        nb++;
      }
    }
  } catch (e) {
    revalidatePath(`/locataires/${locataireId}`);
    return erreur(fd, `${nb ? `${nb} document(s) enregistré(s), puis erreur : ` : ""}${messageErreur(e)}`);
  }
  revalidatePath(`/locataires/${locataireId}`);
  return succes(nb === 1 ? `Document « ${CATEGORIES_DOCUMENT[r.data.categorie]} » ajouté.` : `${nb} documents « ${CATEGORIES_DOCUMENT[r.data.categorie]} » ajoutés.`);
}

export async function supprimerDocument(fd: FormData): Promise<void> {
  const id = Number(fd.get("id"));
  const doc = await prisma.document.findUnique({ where: { id }, include: { locataire: { select: { entiteId: true } } } });
  if (!doc || doc.locataire.entiteId !== (await entiteCouranteId())) return;
  await prisma.document.delete({ where: { id } });
  await supprimerFichier(doc.chemin);
  revalidatePath(`/locataires/${doc.locataireId}`);
  redirect(avecMessage(`/locataires/${doc.locataireId}`, "Document supprimé."));
}
