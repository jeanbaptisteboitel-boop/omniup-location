"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { echec, erreur, type FormState } from "@/lib/forms";
import { avecMessage } from "@/lib/erreurs";
import { parseAffectation } from "@/lib/affectation";
import { confirmerEnvoiDirect, enregistrerFichier, supprimerFichier, typeMimeDe, verifierFichier } from "@/lib/storage";
import { messageErreur } from "@/lib/forms";
import { analyser, zBool, zDate, zEnum, zMontant, zTexte, zTexteOpt } from "@/lib/validation";
import { entiteCouranteId } from "@/lib/entite";

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

type Justificatif = { nomFichier: string; chemin: string; mimeType: string };

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
  const cheminDirect = String(fd.get("justificatifChemin") ?? "");
  let direct: Justificatif | null = null;
  if (cheminDirect) {
    const nomFichier = String(fd.get("justificatifNom") ?? "justificatif");
    const mimeType = typeMimeDe({ name: nomFichier, type: String(fd.get("justificatifMime") ?? "") });
    if (!mimeType) errors.justificatif = "Format de justificatif non pris en charge.";
    else direct = { nomFichier, chemin: cheminDirect, mimeType };
  }
  if (Object.keys(errors).length) return { ok: false as const, errors };
  const { affectation: _a, supprimerJustificatif, ...reste } = r.data;
  void _a;
  return { ok: true as const, data: { ...reste, ...affectation! }, fichier: f, direct, supprimerJustificatif };
}

/** Enregistre le justificatif reçu (envoi direct déjà effectué, ou fichier transmis par le formulaire). */
async function justificatifDe(r: { fichier: File | null; direct: Justificatif | null }): Promise<Justificatif | null> {
  if (r.direct) {
    await confirmerEnvoiDirect(r.direct.chemin, "depenses/");
    return r.direct;
  }
  if (r.fichier) return enregistrerFichier(r.fichier, "depenses");
  return null;
}

async function verifierAffectation(entiteId: number, a: { lotId: number | null; immeubleId: number | null }): Promise<boolean> {
  if (a.lotId) return !!(await prisma.lot.findFirst({ where: { id: a.lotId, entiteId }, select: { id: true } }));
  if (a.immeubleId) return !!(await prisma.immeuble.findFirst({ where: { id: a.immeubleId, entiteId }, select: { id: true } }));
  return false;
}

export async function creerDepense(_prev: FormState, fd: FormData): Promise<FormState> {
  const r = await lireFormulaire(fd);
  if (!r.ok) return echec(fd, r.errors);
  const entiteId = await entiteCouranteId();
  if (!(await verifierAffectation(entiteId, r.data))) return echec(fd, { affectation: "Bien introuvable." });
  let justificatif: Justificatif | null;
  try {
    justificatif = await justificatifDe(r);
  } catch (e) {
    return erreur(fd, messageErreur(e));
  }
  const d = await prisma.depense.create({
    data: { ...r.data, entiteId, justificatifNom: justificatif?.nomFichier ?? null, justificatifChemin: justificatif?.chemin ?? null, justificatifMime: justificatif?.mimeType ?? null },
  });
  revalider(d);
  const retour = String(fd.get("retour") ?? "") || "/depenses";
  redirect(avecMessage(retour, `Dépense « ${d.libelle} » enregistrée.`));
}

export async function modifierDepense(id: number, _prev: FormState, fd: FormData): Promise<FormState> {
  const r = await lireFormulaire(fd);
  if (!r.ok) return echec(fd, r.errors);
  const entiteId = await entiteCouranteId();
  const existante = await prisma.depense.findFirst({ where: { id, entiteId } });
  if (!existante) redirect("/depenses");
  if (!(await verifierAffectation(entiteId, r.data))) return echec(fd, { affectation: "Bien introuvable." });
  let justificatif: Justificatif | null | undefined = undefined;
  if (r.fichier || r.direct) {
    try {
      justificatif = await justificatifDe(r);
    } catch (e) {
      return erreur(fd, messageErreur(e));
    }
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
  const d = await prisma.depense.findFirst({ where: { id, entiteId: await entiteCouranteId() } });
  if (!d) redirect("/depenses");
  await prisma.depense.delete({ where: { id } });
  await supprimerFichier(d.justificatifChemin);
  revalider(d);
  redirect(avecMessage("/depenses", "Dépense supprimée."));
}
