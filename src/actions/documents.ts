"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { echec, erreur, succes, type FormState } from "@/lib/forms";
import { avecMessage } from "@/lib/erreurs";
import { enregistrerFichier, supprimerFichier, verifierFichier } from "@/lib/storage";
import { analyser, zEnum, zTexteOpt } from "@/lib/validation";
import { CATEGORIES_DOCUMENT } from "@/lib/libelles";

const schemaDocument = z.object({
  categorie: zEnum(["PIECE_IDENTITE", "AVIS_IMPOSITION", "LETTRE_RECOMMANDATION", "JUSTIFICATIF_DOMICILE", "JUSTIFICATIF_REVENUS", "AUTRE"]),
  libelle: zTexteOpt(200),
});

export async function ajouterDocument(locataireId: number, _prev: FormState, fd: FormData): Promise<FormState> {
  const r = analyser(schemaDocument, fd);
  const fichiers = fd.getAll("fichier").filter((f): f is File => f instanceof File && f.size > 0);
  const errors = r.success ? {} : r.errors;
  if (fichiers.length === 0) errors.fichier = "Sélectionnez au moins un fichier.";
  for (const f of fichiers) {
    const pb = verifierFichier(f);
    if (pb) {
      errors.fichier = `${f.name} : ${pb}`;
      break;
    }
  }
  if (!r.success || Object.keys(errors).length) return echec(fd, errors);

  const locataire = await prisma.locataire.findUnique({ where: { id: locataireId }, select: { id: true } });
  if (!locataire) return erreur(fd, "Locataire introuvable.");

  for (const f of fichiers) {
    const enregistre = await enregistrerFichier(f, `locataires/${locataireId}`);
    await prisma.document.create({
      data: {
        locataireId,
        categorie: r.data.categorie,
        libelle: r.data.libelle,
        nomFichier: enregistre.nomFichier,
        chemin: enregistre.chemin,
        mimeType: enregistre.mimeType,
        taille: enregistre.taille,
      },
    });
  }
  revalidatePath(`/locataires/${locataireId}`);
  return succes(
    fichiers.length === 1
      ? `Document « ${CATEGORIES_DOCUMENT[r.data.categorie]} » ajouté.`
      : `${fichiers.length} documents « ${CATEGORIES_DOCUMENT[r.data.categorie]} » ajoutés.`,
  );
}

export async function supprimerDocument(fd: FormData): Promise<void> {
  const id = Number(fd.get("id"));
  const doc = await prisma.document.findUnique({ where: { id } });
  if (!doc) return;
  await prisma.document.delete({ where: { id } });
  await supprimerFichier(doc.chemin);
  revalidatePath(`/locataires/${doc.locataireId}`);
  redirect(avecMessage(`/locataires/${doc.locataireId}`, "Document supprimé."));
}
