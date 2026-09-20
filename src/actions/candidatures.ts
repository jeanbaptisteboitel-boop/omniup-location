"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { echec, erreur, messageErreur, succes, type FormState } from "@/lib/forms";
import { avecMessage } from "@/lib/erreurs";
import { analyser, zBool, zDateOpt, zEnumOpt, zMontantOpt, zTexte, zTexteOpt } from "@/lib/validation";
import { supprimerFichier } from "@/lib/storage";
import { envoyerEmail, mailConfigure } from "@/lib/mail";
import { emailAccesCandidature, emailDecisionCandidature } from "@/lib/mail-modeles";
import { entiteCourante, entiteCouranteId } from "@/lib/entite";
import { genererJetonAcces, origineApplication } from "@/lib/espace";
import { lienCandidature } from "@/lib/candidat";
import { toISODate } from "@/lib/dates";
import { nomDossier } from "@/lib/candidatures";
import { exigerEcriture } from "@/lib/droits";

/**
 * Candidatures à la location, côté gestionnaire : création du dossier, envoi du lien au candidat
 * et à ses cautions, vérification des justificatifs, décision et transformation en locataire.
 */

async function candidatureDeLEntite(id: number) {
  return prisma.candidature.findFirst({ where: { id, entiteId: await entiteCouranteId() } });
}

async function dossierDeLEntite(id: number) {
  return prisma.dossierCandidature.findFirst({
    where: { id, candidature: { entiteId: await entiteCouranteId() } },
    include: { candidature: { select: { id: true } } },
  });
}

const schemaCandidature = z.object({
  lotId: z.string().transform((s) => (s.trim() === "" ? null : Number(s))),
  loyerAnnonce: zMontantOpt,
  chargesAnnonce: zMontantOpt,
  dateSouhaitee: zDateOpt,
  typeGarantie: zEnumOpt(["AUCUNE", "PERSONNE_PHYSIQUE", "PERSONNE_MORALE", "VISALE", "ASSURANCE_LOYERS_IMPAYES"]),
  assuranceLoyersImpayes: zBool,
  notes: zTexteOpt(2000),
});

const schemaCandidat = z.object({
  civilite: zTexteOpt(20),
  nom: zTexte(100),
  prenom: zTexte(100),
  email: z.string().trim().email("Adresse email invalide").max(200),
  telephone: zTexteOpt(30),
});

/** Ouvre une candidature et le dossier de son premier candidat. */
export async function creerCandidature(_prev: FormState, fd: FormData): Promise<FormState> {
  await exigerEcriture();
  const c = analyser(schemaCandidature, fd);
  const p = analyser(schemaCandidat, fd);
  if (!c.success || !p.success) return echec(fd, { ...(c.success ? {} : c.errors), ...(p.success ? {} : p.errors) });
  const entiteId = await entiteCouranteId();
  if (c.data.lotId) {
    const lot = await prisma.lot.findFirst({ where: { id: c.data.lotId, entiteId } });
    if (!lot) return echec(fd, { lotId: "Lot introuvable." });
  }
  const candidature = await prisma.candidature.create({
    data: {
      entiteId,
      lotId: c.data.lotId,
      loyerAnnonce: c.data.loyerAnnonce,
      chargesAnnonce: c.data.chargesAnnonce,
      dateSouhaitee: c.data.dateSouhaitee,
      typeGarantie: c.data.typeGarantie ?? null,
      assuranceLoyersImpayes: c.data.assuranceLoyersImpayes,
      notes: c.data.notes,
      dossiers: {
        create: {
          role: "CANDIDAT",
          civilite: p.data.civilite,
          nom: p.data.nom,
          prenom: p.data.prenom,
          email: p.data.email,
          telephone: p.data.telephone,
          accesJeton: genererJetonAcces(),
          accesCreeLe: new Date(),
        },
      },
    },
  });
  revalidatePath("/candidatures");
  redirect(avecMessage(`/candidatures/${candidature.id}`, "Candidature ouverte : transmettez son lien au candidat pour qu'il complète son dossier."));
}

/** Loyer annoncé, garantie attendue, notes internes. */
export async function modifierCandidature(id: number, _prev: FormState, fd: FormData): Promise<FormState> {
  await exigerEcriture();
  const r = analyser(schemaCandidature, fd);
  if (!r.success) return echec(fd, r.errors);
  const c = await candidatureDeLEntite(id);
  if (!c) return erreur(fd, "Candidature introuvable.");
  if (r.data.lotId) {
    const lot = await prisma.lot.findFirst({ where: { id: r.data.lotId, entiteId: await entiteCouranteId() } });
    if (!lot) return echec(fd, { lotId: "Lot introuvable." });
  }
  await prisma.candidature.update({
    where: { id },
    data: {
      lotId: r.data.lotId,
      loyerAnnonce: r.data.loyerAnnonce,
      chargesAnnonce: r.data.chargesAnnonce,
      dateSouhaitee: r.data.dateSouhaitee,
      typeGarantie: r.data.typeGarantie ?? null,
      assuranceLoyersImpayes: r.data.assuranceLoyersImpayes,
      notes: r.data.notes,
    },
  });
  revalidatePath(`/candidatures/${id}`);
  return succes("Candidature mise à jour.");
}

/** Ajoute un colocataire candidat : il complète son propre dossier avec son propre lien. */
export async function ajouterCandidat(id: number, _prev: FormState, fd: FormData): Promise<FormState> {
  await exigerEcriture();
  const r = analyser(schemaCandidat, fd);
  if (!r.success) return echec(fd, r.errors);
  const c = await candidatureDeLEntite(id);
  if (!c) return erreur(fd, "Candidature introuvable.");
  await prisma.dossierCandidature.create({
    data: { candidatureId: id, role: "CANDIDAT", ...r.data, accesJeton: genererJetonAcces(), accesCreeLe: new Date() },
  });
  revalidatePath(`/candidatures/${id}`);
  return succes("Colocataire ajouté : transmettez-lui son lien pour qu'il complète son dossier.");
}

/** Supprime un dossier (colocataire ou caution) et les fichiers déposés. */
export async function supprimerDossier(fd: FormData): Promise<void> {
  await exigerEcriture();
  const id = Number(fd.get("id"));
  const d = await prisma.dossierCandidature.findFirst({
    where: { id, candidature: { entiteId: await entiteCouranteId() } },
    include: { pieces: true, candidature: { select: { id: true, dossiers: { where: { role: "CANDIDAT" }, select: { id: true } } } } },
  });
  if (!d) redirect("/candidatures");
  if (d.role === "CANDIDAT" && d.candidature.dossiers.length <= 1) {
    redirect(avecMessage(`/candidatures/${d.candidature.id}`, "Une candidature comporte au moins un candidat : supprimez la candidature entière.", "erreur"));
  }
  for (const p of d.pieces) await supprimerFichier(p.chemin);
  await prisma.dossierCandidature.delete({ where: { id } });
  revalidatePath(`/candidatures/${d.candidature.id}`);
  redirect(avecMessage(`/candidatures/${d.candidature.id}`, `Dossier de ${nomDossier(d)} supprimé.`));
}

/** Recrée le lien d'accès d'un dossier (l'ancien cesse de fonctionner). */
export async function renouvelerAcces(fd: FormData): Promise<void> {
  await exigerEcriture();
  const id = Number(fd.get("id"));
  const d = await dossierDeLEntite(id);
  if (!d) redirect("/candidatures");
  await prisma.dossierCandidature.update({ where: { id }, data: { accesJeton: genererJetonAcces(), accesCreeLe: new Date(), accesEnvoyeLe: null, accesDernierLe: null } });
  revalidatePath(`/candidatures/${d.candidature.id}`);
  redirect(avecMessage(`/candidatures/${d.candidature.id}`, "Nouveau lien créé : l'ancien ne fonctionne plus."));
}

/** Coupe l'accès d'un dossier. */
export async function revoquerAcces(fd: FormData): Promise<void> {
  await exigerEcriture();
  const id = Number(fd.get("id"));
  const d = await dossierDeLEntite(id);
  if (!d) redirect("/candidatures");
  await prisma.dossierCandidature.update({ where: { id }, data: { accesJeton: null, accesCreeLe: null, accesEnvoyeLe: null, accesDernierLe: null } });
  revalidatePath(`/candidatures/${d.candidature.id}`);
  redirect(avecMessage(`/candidatures/${d.candidature.id}`, "Accès révoqué : le lien ne fonctionne plus."));
}

/** Envoie le lien du dossier par email, et marque la candidature comme transmise. */
export async function envoyerAcces(fd: FormData): Promise<void> {
  await exigerEcriture();
  const id = Number(fd.get("id"));
  const d = await prisma.dossierCandidature.findFirst({
    where: { id, candidature: { entiteId: await entiteCouranteId() } },
    include: { candidature: { include: { lot: true } } },
  });
  if (!d) redirect("/candidatures");
  const retour = `/candidatures/${d.candidature.id}`;
  if (!d.email) redirect(avecMessage(retour, "Ce dossier n'a pas d'adresse email : renseignez-la ou copiez le lien.", "erreur"));
  if (!mailConfigure()) redirect(avecMessage(retour, "L'envoi d'emails n'est pas configuré (voir Paramètres) : copiez le lien pour le transmettre.", "erreur"));
  const jeton = d.accesJeton ?? genererJetonAcces();
  if (!d.accesJeton) await prisma.dossierCandidature.update({ where: { id }, data: { accesJeton: jeton, accesCreeLe: new Date() } });
  const [origine, entite] = await Promise.all([origineApplication(), entiteCourante()]);
  const modele = emailAccesCandidature(d, d.candidature, d.candidature.lot, lienCandidature(origine, jeton), entite.nom);
  try {
    await envoyerEmail({ a: d.email, objet: modele.objet, texte: modele.corps });
  } catch (e) {
    redirect(avecMessage(retour, `Échec de l'envoi : ${messageErreur(e)}`, "erreur"));
  }
  await prisma.dossierCandidature.update({ where: { id }, data: { accesEnvoyeLe: new Date() } });
  if (d.candidature.statut === "BROUILLON") await prisma.candidature.update({ where: { id: d.candidature.id }, data: { statut: "TRANSMISE" } });
  revalidatePath(retour);
  redirect(avecMessage(retour, `Lien envoyé à ${d.email}.`));
}

/** Marque la candidature comme transmise sans passer par l'email (lien copié, remis en main propre). */
export async function marquerTransmise(fd: FormData): Promise<void> {
  await exigerEcriture();
  const id = Number(fd.get("id"));
  const c = await candidatureDeLEntite(id);
  if (!c) redirect("/candidatures");
  if (c.statut === "BROUILLON") await prisma.candidature.update({ where: { id }, data: { statut: "TRANSMISE" } });
  revalidatePath(`/candidatures/${id}`);
  redirect(avecMessage(`/candidatures/${id}`, "Candidature marquée comme transmise au candidat."));
}

/** Vérification d'une pièce déposée : validée ou à remplacer. */
export async function statuerPiece(fd: FormData): Promise<void> {
  await exigerEcriture();
  const id = Number(fd.get("id"));
  const decision = String(fd.get("decision"));
  const motif = String(fd.get("motifRefus") ?? "").trim() || null;
  const piece = await prisma.pieceCandidature.findFirst({
    where: { id, dossier: { candidature: { entiteId: await entiteCouranteId() } } },
    include: { dossier: { select: { candidatureId: true } } },
  });
  if (!piece) redirect("/candidatures");
  const retour = `/candidatures/${piece.dossier.candidatureId}`;
  if (decision !== "VALIDEE" && decision !== "REFUSEE") redirect(avecMessage(retour, "Décision inconnue.", "erreur"));
  await prisma.pieceCandidature.update({ where: { id }, data: { statut: decision, motifRefus: decision === "REFUSEE" ? motif : null } });
  revalidatePath(retour);
  redirect(avecMessage(retour, decision === "VALIDEE" ? "Pièce validée." : "Pièce marquée à remplacer : le candidat en est informé dans son espace."));
}

/** Suppression d'une pièce par le gestionnaire (doublon, pièce hors liste déposée par erreur). */
export async function supprimerPiece(fd: FormData): Promise<void> {
  await exigerEcriture();
  const id = Number(fd.get("id"));
  const piece = await prisma.pieceCandidature.findFirst({
    where: { id, dossier: { candidature: { entiteId: await entiteCouranteId() } } },
    include: { dossier: { select: { candidatureId: true } } },
  });
  if (!piece) redirect("/candidatures");
  await supprimerFichier(piece.chemin);
  await prisma.pieceCandidature.delete({ where: { id } });
  revalidatePath(`/candidatures/${piece.dossier.candidatureId}`);
  redirect(avecMessage(`/candidatures/${piece.dossier.candidatureId}`, "Pièce supprimée."));
}

async function notifierDecision(candidatureId: number, acceptee: boolean, motif: string | null): Promise<void> {
  const c = await prisma.candidature.findUnique({ where: { id: candidatureId }, include: { lot: true, dossiers: { where: { role: "CANDIDAT" } } } });
  if (!c || !mailConfigure()) return;
  const entite = await entiteCourante();
  for (const d of c.dossiers) {
    if (!d.email) continue;
    const modele = emailDecisionCandidature(d, c.lot, acceptee, motif, entite.nom);
    // Un échec d'envoi ne doit pas empêcher d'enregistrer la décision.
    await envoyerEmail({ a: d.email, objet: modele.objet, texte: modele.corps }).catch((e) => console.error(`[candidature ${candidatureId}] notification impossible :`, e));
  }
}

/** Retient la candidature : le candidat en est informé, le dossier peut être transformé en locataire. */
export async function accepterCandidature(fd: FormData): Promise<void> {
  await exigerEcriture();
  const id = Number(fd.get("id"));
  const prevenir = fd.get("prevenir") === "on";
  const c = await candidatureDeLEntite(id);
  if (!c) redirect("/candidatures");
  await prisma.candidature.update({ where: { id }, data: { statut: "ACCEPTEE", decisionLe: new Date(), motifRefus: null } });
  if (prevenir) await notifierDecision(id, true, null);
  revalidatePath(`/candidatures/${id}`);
  revalidatePath("/candidatures");
  redirect(avecMessage(`/candidatures/${id}`, "Candidature acceptée : créez le locataire pour préparer le bail."));
}

export async function refuserCandidature(fd: FormData): Promise<void> {
  await exigerEcriture();
  const id = Number(fd.get("id"));
  const motif = String(fd.get("motifRefus") ?? "").trim() || null;
  const prevenir = fd.get("prevenir") === "on";
  const c = await candidatureDeLEntite(id);
  if (!c) redirect("/candidatures");
  await prisma.candidature.update({ where: { id }, data: { statut: "REFUSEE", decisionLe: new Date(), motifRefus: motif } });
  if (prevenir) await notifierDecision(id, false, motif);
  revalidatePath(`/candidatures/${id}`);
  revalidatePath("/candidatures");
  redirect(avecMessage(`/candidatures/${id}`, "Candidature refusée. Pensez à détruire les pièces du dossier une fois le logement attribué."));
}

/** Revient sur une décision (erreur de saisie, candidat retenu finalement). */
export async function rouvrirCandidature(fd: FormData): Promise<void> {
  await exigerEcriture();
  const id = Number(fd.get("id"));
  const c = await candidatureDeLEntite(id);
  if (!c) redirect("/candidatures");
  await prisma.candidature.update({ where: { id }, data: { statut: c.deposeLe ? "DEPOSEE" : "TRANSMISE", decisionLe: null, motifRefus: null } });
  revalidatePath(`/candidatures/${id}`);
  redirect(avecMessage(`/candidatures/${id}`, "Candidature rouverte : elle est de nouveau à l'étude."));
}

/**
 * Prépare le bail de la candidature retenue : chaque candidat devient une fiche locataire et le
 * formulaire de bail s'ouvre pré-rempli. La mutation ne s'achève qu'à la signature du bail, qui
 * bascule alors la candidature en « bail signé ».
 */
export async function preparerBailDepuisCandidature(fd: FormData): Promise<void> {
  await exigerEcriture();
  const id = Number(fd.get("id"));
  const c = await prisma.candidature.findFirst({
    where: { id, entiteId: await entiteCouranteId() },
    include: { dossiers: { where: { role: "CANDIDAT" }, orderBy: { createdAt: "asc" } } },
  });
  if (!c) redirect("/candidatures");
  if (c.statut !== "ACCEPTEE") redirect(avecMessage(`/candidatures/${id}`, "Retenez d'abord la candidature.", "erreur"));
  if (c.dossiers.length === 0) redirect(avecMessage(`/candidatures/${id}`, "Aucun candidat dans cette candidature.", "erreur"));

  // Les fiches déjà créées sont réutilisées : préparer le bail deux fois ne duplique pas les locataires.
  const locataireIds: number[] = [];
  for (const d of c.dossiers) {
    if (d.locataireId) {
      locataireIds.push(d.locataireId);
      continue;
    }
    const locataire = await prisma.locataire.create({
      data: {
        entiteId: c.entiteId,
        civilite: d.civilite,
        nom: d.nom,
        prenom: d.prenom ?? "",
        dateNaissance: d.dateNaissance,
        adresse: d.adresse,
        complementAdresse: d.complementAdresse,
        codePostal: d.codePostal,
        ville: d.ville,
        telephone: d.telephone,
        email: d.email,
        notes: `Issu de la candidature n° ${c.id}.`,
      },
    });
    await prisma.dossierCandidature.update({ where: { id: d.id }, data: { locataireId: locataire.id } });
    locataireIds.push(locataire.id);
  }

  revalidatePath(`/candidatures/${id}`);
  revalidatePath("/locataires");
  const params = new URLSearchParams();
  if (c.lotId) params.set("lotId", String(c.lotId));
  for (const l of locataireIds) params.append("locataireId", String(l));
  if (c.loyerAnnonce !== null) params.set("loyerHC", String(c.loyerAnnonce));
  if (c.chargesAnnonce !== null) params.set("charges", String(c.chargesAnnonce));
  if (c.dateSouhaitee) params.set("dateDebut", toISODate(c.dateSouhaitee));
  redirect(avecMessage(`/baux/nouveau?${params.toString()}`, `${locataireIds.length > 1 ? "Locataires créés" : "Locataire créé"} : le candidat deviendra locataire à la signature du bail.`));
}

/**
 * Destruction du dossier et de ses pièces (RGPD) : à faire dès que le logement est attribué pour
 * les candidats non retenus. La candidature elle-même disparaît.
 */
export async function supprimerCandidature(fd: FormData): Promise<void> {
  await exigerEcriture();
  const id = Number(fd.get("id"));
  const c = await prisma.candidature.findFirst({
    where: { id, entiteId: await entiteCouranteId() },
    include: { dossiers: { include: { pieces: true } } },
  });
  if (!c) redirect("/candidatures");
  for (const d of c.dossiers) for (const p of d.pieces) await supprimerFichier(p.chemin);
  await prisma.candidature.delete({ where: { id } });
  revalidatePath("/candidatures");
  redirect(avecMessage("/candidatures", "Candidature et pièces justificatives définitivement supprimées."));
}
