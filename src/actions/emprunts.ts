"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { echec, erreur, messageErreur, type FormState } from "@/lib/forms";
import { avecMessage } from "@/lib/erreurs";
import { parseAffectation } from "@/lib/affectation";
import { analyser, zBool, zDateOpt, zEntierOpt, zMontant, zMontantOpt, zNombreOpt, zTexte, zTexteOpt } from "@/lib/validation";
import { COLONNES, detecterColonnes, genererEcheancier, lignesVersEcheances, parseDateSouple, type Cellule, type Colonne, type LigneEcheance, type Mapping } from "@/lib/emprunts";
import { lireTableau } from "@/lib/import-fichiers";
import { extraireEcheancier } from "@/lib/mistral";
import { mistralConfigure } from "@/lib/mistral-config";
import { toISODate } from "@/lib/dates";
import { arrondir2 } from "@/lib/montants";
import { entiteCouranteId } from "@/lib/entite";
import { exigerEcriture } from "@/lib/droits";

const schemaEmprunt = z.object({
  libelle: zTexte(200),
  banque: zTexteOpt(120),
  reference: zTexteOpt(120),
  montantInitial: zMontant,
  tauxAnnuel: zNombreOpt,
  dureeMois: zEntierOpt(1, 600),
  dateDebut: zDateOpt,
  assuranceMensuelle: zMontantOpt,
  affectation: z.string(),
  notes: zTexteOpt(2000),
});

function revalider(e: { id: number; lotId: number | null; immeubleId: number | null }) {
  revalidatePath("/emprunts");
  revalidatePath(`/emprunts/${e.id}`);
  revalidatePath("/synthese");
  if (e.lotId) revalidatePath(`/lots/${e.lotId}`);
  if (e.immeubleId) revalidatePath(`/immeubles/${e.immeubleId}`);
}

function lire(fd: FormData) {
  const r = analyser(schemaEmprunt, fd);
  if (!r.success) return { ok: false as const, errors: r.errors };
  const affectation = parseAffectation(r.data.affectation);
  if (!affectation) return { ok: false as const, errors: { affectation: "Choisissez le lot ou l'immeuble financé." } };
  const { affectation: _a, ...reste } = r.data;
  void _a;
  return { ok: true as const, data: { ...reste, ...affectation } };
}

async function verifierAffectation(entiteId: number, a: { lotId: number | null; immeubleId: number | null }): Promise<boolean> {
  if (a.lotId) return !!(await prisma.lot.findFirst({ where: { id: a.lotId, entiteId }, select: { id: true } }));
  if (a.immeubleId) return !!(await prisma.immeuble.findFirst({ where: { id: a.immeubleId, entiteId }, select: { id: true } }));
  return false;
}

export async function creerEmprunt(_prev: FormState, fd: FormData): Promise<FormState> {
  await exigerEcriture();
  const r = lire(fd);
  if (!r.ok) return echec(fd, r.errors);
  const entiteId = await entiteCouranteId();
  if (!(await verifierAffectation(entiteId, r.data))) return echec(fd, { affectation: "Bien introuvable." });
  const e = await prisma.emprunt.create({ data: { ...r.data, entiteId } });
  revalider(e);
  redirect(avecMessage(`/emprunts/${e.id}`, "Emprunt créé. Générez ou importez maintenant son échéancier."));
}

export async function modifierEmprunt(id: number, _prev: FormState, fd: FormData): Promise<FormState> {
  await exigerEcriture();
  const r = lire(fd);
  if (!r.ok) return echec(fd, r.errors);
  const entiteId = await entiteCouranteId();
  const existant = await prisma.emprunt.findFirst({ where: { id, entiteId }, select: { id: true } });
  if (!existant) return erreur(fd, "Emprunt introuvable.");
  if (!(await verifierAffectation(entiteId, r.data))) return echec(fd, { affectation: "Bien introuvable." });
  const e = await prisma.emprunt.update({ where: { id }, data: r.data });
  revalider(e);
  redirect(avecMessage(`/emprunts/${e.id}`, "Emprunt modifié."));
}

export async function supprimerEmprunt(fd: FormData): Promise<void> {
  await exigerEcriture();
  const id = Number(fd.get("id"));
  const e = await prisma.emprunt.findFirst({ where: { id, entiteId: await entiteCouranteId() } });
  if (!e) redirect("/emprunts");
  await prisma.emprunt.delete({ where: { id } });
  revalider(e);
  redirect(avecMessage("/emprunts", "Emprunt supprimé avec son échéancier."));
}

async function remplacerEcheances(empruntId: number, lignes: LigneEcheance[], remplacer: boolean): Promise<void> {
  await prisma.$transaction([
    ...(remplacer ? [prisma.echeanceEmprunt.deleteMany({ where: { empruntId } })] : []),
    prisma.echeanceEmprunt.createMany({
      data: lignes.map((l) => ({ empruntId, date: l.date, capital: l.capital, interets: l.interets, assurance: l.assurance, total: l.total, capitalRestant: l.capitalRestant })),
    }),
  ]);
}

/** Échéancier théorique calculé à partir des caractéristiques du prêt. */
export async function genererEcheancierEmprunt(fd: FormData): Promise<void> {
  await exigerEcriture();
  const id = Number(fd.get("id"));
  const e = await prisma.emprunt.findFirst({ where: { id, entiteId: await entiteCouranteId() } });
  if (!e) redirect("/emprunts");
  if (e.tauxAnnuel === null || !e.dureeMois || !e.dateDebut) {
    redirect(avecMessage(`/emprunts/${id}`, "Renseignez le taux, la durée en mois et la date de première échéance pour générer l'échéancier.", "erreur"));
  }
  const lignes = genererEcheancier({ montant: e.montantInitial, tauxAnnuel: e.tauxAnnuel, dureeMois: e.dureeMois, dateDebut: e.dateDebut, assuranceMensuelle: e.assuranceMensuelle });
  await remplacerEcheances(id, lignes, true);
  revalider(e);
  redirect(avecMessage(`/emprunts/${id}`, `Échéancier théorique généré : ${lignes.length} échéances. Pour les intérêts réels, importez le tableau d'amortissement de la banque.`));
}

export async function supprimerEcheancier(fd: FormData): Promise<void> {
  await exigerEcriture();
  const id = Number(fd.get("id"));
  const e = await prisma.emprunt.findFirst({ where: { id, entiteId: await entiteCouranteId() } });
  if (!e) redirect("/emprunts");
  await prisma.echeanceEmprunt.deleteMany({ where: { empruntId: id } });
  revalider(e);
  redirect(avecMessage(`/emprunts/${id}`, "Échéancier supprimé."));
}

// ---------------------------------------------------------------------------
// Import : étape 1 (analyse du fichier) puis étape 2 (enregistrement)
// ---------------------------------------------------------------------------

export type ApercuImport = {
  source: "tableau" | "ia";
  entetes: string[];
  lignes: Cellule[][];
  mapping: Mapping;
  echeances: { date: string; capital: number; interets: number; assurance: number; total: number; capitalRestant: number | null }[];
  remarques: string;
};

function serialiser(c: Cellule): string | number | null {
  if (c instanceof Date) return toISODate(c);
  return c;
}

export async function analyserFichierEcheancier(empruntId: number, _prev: FormState, fd: FormData): Promise<FormState> {
  await exigerEcriture();
  const fichier = fd.get("fichier");
  if (!(fichier instanceof File) || fichier.size === 0) return echec(fd, { fichier: "Sélectionnez un fichier." });
  if (fichier.size > 4 * 1024 * 1024) return echec(fd, { fichier: "Le fichier dépasse 4 Mo : exportez l'échéancier en CSV ou Excel, ou découpez le PDF." });
  const nom = fichier.name.toLowerCase();
  const type = fichier.type.toLowerCase();
  try {
    let apercu: ApercuImport;
    if (nom.endsWith(".csv") || nom.endsWith(".txt") || nom.endsWith(".xlsx") || nom.endsWith(".xlsm") || type.includes("csv") || type.includes("spreadsheetml")) {
      const tableau = await lireTableau(fichier);
      if (tableau.length < 2) return echec(fd, { fichier: "Le fichier ne contient pas de tableau exploitable." });
      // Ligne d'en-tête : première ligne comportant au moins deux textes.
      let idxEntete = tableau.findIndex((l) => l.filter((c) => typeof c === "string" && c.trim() !== "" && parseDateSouple(c) === null).length >= 2);
      if (idxEntete === -1) idxEntete = 0;
      const entetes = tableau[idxEntete].map((c) => (c === null ? "" : String(serialiser(c) ?? "")));
      const lignes = tableau.slice(idxEntete + 1).map((l) => l.map(serialiser)) as Cellule[][];
      const mapping = detecterColonnes(entetes);
      apercu = { source: "tableau", entetes, lignes, mapping, echeances: [], remarques: "" };
    } else if (type === "application/pdf" || type.startsWith("image/")) {
      if (!mistralConfigure()) return echec(fd, { fichier: "L'import d'un PDF ou d'une image nécessite l'OCR Mistral (MISTRAL_API_KEY). Fournissez un fichier CSV ou Excel, ou générez l'échéancier théorique." });
      const contenu = Buffer.from(await fichier.arrayBuffer());
      const resultat = await extraireEcheancier(contenu, type);
      if (resultat.echeances.length === 0) return echec(fd, { fichier: "Aucune échéance n'a pu être lue dans ce document." + (resultat.remarques ? ` ${resultat.remarques}` : "") });
      apercu = { source: "ia", entetes: [], lignes: [], mapping: {}, echeances: resultat.echeances, remarques: resultat.remarques };
    } else {
      return echec(fd, { fichier: "Format non pris en charge : CSV, Excel (.xlsx), PDF ou image." });
    }
    return { ok: true, message: "Fichier analysé : vérifiez l'aperçu puis confirmez l'import.", values: { apercu: JSON.stringify(apercu), empruntId: String(empruntId) } };
  } catch (e) {
    return erreur(fd, messageErreur(e));
  }
}

export async function importerEcheancier(empruntId: number, _prev: FormState, fd: FormData): Promise<FormState> {
  await exigerEcriture();
  const e = await prisma.emprunt.findFirst({ where: { id: empruntId, entiteId: await entiteCouranteId() } });
  if (!e) return erreur(fd, "Emprunt introuvable.");
  let apercu: ApercuImport;
  try {
    apercu = JSON.parse(String(fd.get("apercu") ?? "")) as ApercuImport;
  } catch {
    return erreur(fd, "Données d'import illisibles : recommencez l'analyse du fichier.");
  }
  const remplacer = zBool.parse(String(fd.get("remplacer") ?? ""));
  let lignes: LigneEcheance[];
  const erreurs: string[] = [];
  if (apercu.source === "tableau") {
    const mapping: Mapping = {};
    for (const c of COLONNES) {
      const v = String(fd.get(`col_${c}`) ?? "");
      if (v !== "") mapping[c as Colonne] = Number(v);
    }
    const r = lignesVersEcheances(apercu.lignes, mapping);
    lignes = r.echeances;
    erreurs.push(...r.erreurs);
  } else {
    lignes = [];
    apercu.echeances.forEach((x, i) => {
      const date = parseDateSouple(x.date);
      if (!date) {
        erreurs.push(`Ligne ${i + 1} : date illisible (${x.date}).`);
        return;
      }
      lignes.push({ date, capital: arrondir2(Math.abs(Number(x.capital) || 0)), interets: arrondir2(Math.abs(Number(x.interets) || 0)), assurance: arrondir2(Math.abs(Number(x.assurance) || 0)), total: arrondir2(Math.abs(Number(x.total) || 0)), capitalRestant: x.capitalRestant === null || x.capitalRestant === undefined ? null : arrondir2(Number(x.capitalRestant)) });
    });
  }
  if (lignes.length === 0) return erreur(fd, `Aucune échéance à importer.${erreurs.length ? ` ${erreurs.slice(0, 3).join(" ")}` : ""}`);
  await remplacerEcheances(empruntId, lignes, remplacer);
  revalider(e);
  redirect(avecMessage(`/emprunts/${empruntId}`, `${lignes.length} échéances importées.${erreurs.length ? ` ${erreurs.length} ligne(s) ignorée(s) : ${erreurs.slice(0, 3).join(" ")}` : ""}`));
}
