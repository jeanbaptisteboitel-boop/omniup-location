"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { echec, type FormState } from "@/lib/forms";
import { avecMessage } from "@/lib/erreurs";
import { parseAffectation } from "@/lib/affectation";
import { enregistrerFichier, supprimerFichier, verifierFichier } from "@/lib/storage";
import { analyser, zBool, zDate, zEnum, zMontant, zTexte, zTexteOpt } from "@/lib/validation";

const schemaDepense = z.object({
  date: zDate,
  libelle: zTexte(200),
  categorie: zEnum(["REPARATION_ENTRETIEN", "AMELIORATION", "GESTION_LOCATIVE", "COPROPRIETE", "ASSURANCE_PNO", "TAXE_FONCIERE", "INTERETS_EMPRUNT", "AUTRE"]),
  montant: zMontant,
  fournisseur: zTexteOpt(200),
  affectation: z.string(),
  notes: zTexteOpt(2000),
  supprimerJustificatif: zBool,
});

function revalider(d: { lotId: number | null; immeubleId: number | null }) {
  revalidatePath("/depenses");
  revalidatePath("/synthese");
  revalidatePath("/");
  if (d.lotId) revalidatePath(`/lots/${d.lotId}`);
  if (d.immeubleId) revalidatePath(`/immeubles/${d.immeubleId}`);
}

async function lireFormulaire(fd: FormData) {
  const r = analyser(schemaDepense, fd);
  if (!r.success) return { ok: false as const, errors: r.errors };
  const affectation = parseAffectation(r.data.affectation);
  const errors: Record<string, string> = {};
  if (!affectation) errors.affectation = "Choisissez le lot ou l'immeuble concerné.";
  const fichier = fd.get("justificatif");
  const f = fichier instanceof File && fichier.size > 0 ? fichier : null;
  if (f) {
    const pb = verifierFichier(f);
    if (pb) errors.justificatif = pb;
  }
  if (Object.keys(errors).length) return { ok: false as const, errors };
  const { affectation: _a, supprimerJustificatif, ...reste } = r.data;
  void _a;
  return { ok: true as const, data: { ...reste, ...affectation! }, fichier: f, supprimerJustificatif };
}

export async function creerDepense(_prev: FormState, fd: FormData): Promise<FormState> {
  const r = await lireFormulaire(fd);
  if (!r.ok) return echec(fd, r.errors);
  const justificatif = r.fichier ? await enregistrerFichier(r.fichier, "depenses") : null;
  const d = await prisma.depense.create({
    data: { ...r.data, justificatifNom: justificatif?.nomFichier ?? null, justificatifChemin: justificatif?.chemin ?? null, justificatifMime: justificatif?.mimeType ?? null },
  });
  revalider(d);
  const retour = String(fd.get("retour") ?? "") || "/depenses";
  redirect(avecMessage(retour, `Dépense « ${d.libelle} » enregistrée.`));
}

export async function modifierDepense(id: number, _prev: FormState, fd: FormData): Promise<FormState> {
  const r = await lireFormulaire(fd);
  if (!r.ok) return echec(fd, r.errors);
  const existante = await prisma.depense.findUnique({ where: { id } });
  if (!existante) redirect("/depenses");
  let justificatif: { nomFichier: string; chemin: string; mimeType: string } | null | undefined = undefined;
  if (r.fichier) {
    justificatif = await enregistrerFichier(r.fichier, "depenses");
    await supprimerFichier(existante.justificatifChemin);
  } else if (r.supprimerJustificatif) {
    await supprimerFichier(existante.justificatifChemin);
    justificatif = null;
  }
  const d = await prisma.depense.update({
    where: { id },
    data: {
      ...r.data,
      ...(justificatif === undefined ? {} : { justificatifNom: justificatif?.nomFichier ?? null, justificatifChemin: justificatif?.chemin ?? null, justificatifMime: justificatif?.mimeType ?? null }),
    },
  });
  revalider(existante);
  revalider(d);
  redirect(avecMessage("/depenses", `Dépense « ${d.libelle} » modifiée.`));
}

export async function supprimerDepense(fd: FormData): Promise<void> {
  const id = Number(fd.get("id"));
  const d = await prisma.depense.findUnique({ where: { id } });
  if (!d) redirect("/depenses");
  await prisma.depense.delete({ where: { id } });
  await supprimerFichier(d.justificatifChemin);
  revalider(d);
  redirect(avecMessage("/depenses", "Dépense supprimée."));
}
