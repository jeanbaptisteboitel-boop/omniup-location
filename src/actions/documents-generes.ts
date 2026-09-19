"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { echec, erreur, messageErreur, succes, type FormState } from "@/lib/forms";
import { avecMessage } from "@/lib/erreurs";
import { analyser, zEnum, zIdOpt, zTexte } from "@/lib/validation";
import { entiteCouranteId } from "@/lib/entite";
import { pdfDocumentGenere } from "@/lib/pdf/documents";
import { envoyerEmail } from "@/lib/mail";
import { rediger } from "@/lib/ia";
import { ficheBail } from "@/lib/ia-contexte";
import { emailsLocataires, includeLocataires } from "@/lib/locataires";
import { exigerEcriture } from "@/lib/droits";

const schemaDocument = z.object({
  titre: zTexte(200),
  categorie: zEnum(["BAIL", "AVENANT", "RENOUVELLEMENT", "RESILIATION", "CAUTION", "CONVENTION", "AUTRE"]),
  bailId: zIdOpt,
  contenu: zTexte(100000),
});

async function documentDeLEntite(id: number) {
  return prisma.documentGenere.findFirst({ where: { id, entiteId: await entiteCouranteId() }, include: { bail: { include: { lot: { include: { bailleur: true } }, locataires: includeLocataires } } } });
}

function revalider(d: { id: number; bailId: number | null }) {
  revalidatePath("/documents");
  revalidatePath(`/documents/${d.id}`);
  if (d.bailId) revalidatePath(`/baux/${d.bailId}`);
}

export async function modifierDocumentGenere(id: number, _prev: FormState, fd: FormData): Promise<FormState> {
  await exigerEcriture();
  const r = analyser(schemaDocument, fd);
  if (!r.success) return echec(fd, r.errors);
  const entiteId = await entiteCouranteId();
  const existant = await prisma.documentGenere.findFirst({ where: { id, entiteId } });
  if (!existant) return erreur(fd, "Document introuvable.");
  if (r.data.bailId && !(await prisma.bail.findFirst({ where: { id: r.data.bailId, entiteId }, select: { id: true } }))) return echec(fd, { bailId: "Bail introuvable." });
  const d = await prisma.documentGenere.update({ where: { id }, data: r.data });
  revalider(existant);
  revalider(d);
  return succes("Document enregistré.");
}

export async function supprimerDocumentGenere(fd: FormData): Promise<void> {
  await exigerEcriture();
  const id = Number(fd.get("id"));
  const d = await documentDeLEntite(id);
  if (!d) redirect("/documents");
  await prisma.documentGenere.delete({ where: { id } });
  revalider(d);
  redirect(avecMessage(d.bailId ? `/baux/${d.bailId}` : "/documents", "Document supprimé."));
}

/** Document remis en main propre ou posté : il devient visible dans l'espace locataire (s'il est rattaché à un bail). */
export async function marquerDocumentRemis(fd: FormData): Promise<void> {
  await exigerEcriture();
  const id = Number(fd.get("id"));
  const d = await documentDeLEntite(id);
  if (!d) redirect("/documents");
  await prisma.documentGenere.update({ where: { id }, data: { dateEnvoi: d.dateEnvoi ? null : new Date() } });
  revalider(d);
  redirect(avecMessage(`/documents/${id}`, d.dateEnvoi ? "Document marqué comme non remis." : `Document marqué comme remis${d.bailId ? " : il est visible dans l'espace locataire" : ""}.`));
}

export async function envoyerDocumentGenere(id: number, _prev: FormState, fd: FormData): Promise<FormState> {
  await exigerEcriture();
  const d = await documentDeLEntite(id);
  if (!d) return erreur(fd, "Document introuvable.");
  const email = d.bail ? emailsLocataires(d.bail.locataires) : [];
  if (!email.length) return erreur(fd, d.bail ? "Aucun locataire n'a d'adresse email." : "Rattachez le document à un bail pour l'envoyer au locataire.");
  try {
    const pdf = await pdfDocumentGenere(d);
    await envoyerEmail({
      a: email,
      objet: String(fd.get("objet") ?? "").trim() || d.titre,
      texte: String(fd.get("corps") ?? "").trim() || `Bonjour,\n\nVeuillez trouver ci-joint le document « ${d.titre} ».\n\nCordialement,\n${d.bail?.lot.bailleur?.nom ?? ""}`,
      repondreA: d.bail?.lot.bailleur?.email,
      piecesJointes: [{ nom: `document-${d.id}.pdf`, contenu: pdf, type: "application/pdf" }],
    });
  } catch (e) {
    return erreur(fd, messageErreur(e));
  }
  await prisma.documentGenere.update({ where: { id }, data: { dateEnvoi: new Date() } });
  revalider(d);
  return succes(`Document envoyé à ${email.join(", ")}.`);
}

/** Adapte ou complète le document avec l'assistant de rédaction, selon les instructions données. */
export async function adapterDocumentIA(id: number, _prev: FormState, fd: FormData): Promise<FormState> {
  await exigerEcriture();
  const d = await documentDeLEntite(id);
  if (!d) return erreur(fd, "Document introuvable.");
  const instructions = String(fd.get("instructions") ?? "").trim().slice(0, 2000);
  const contenuActuel = String(fd.get("contenu") ?? d.contenu).slice(0, 60000);
  if (!instructions) return erreur(fd, "Indiquez ce que l'assistant doit modifier ou compléter.");
  try {
    const fiche = d.bailId ? (await ficheBail(d.bailId)).fiche : "(Document non rattaché à un bail : utilise uniquement les informations présentes dans le texte.)";
    const texte = await rediger({
      prompt: `Voici un document de gestion locative à adapter. Applique les instructions de l'utilisateur, complète les champs entre crochets avec les informations de la fiche lorsqu'elles existent (sinon laisse le champ à compléter), conserve la structure et les mentions légales, et renvoie le document complet.

Instructions de l'utilisateur : ${instructions}

# FICHE DU BAIL
${fiche}

# DOCUMENT ACTUEL
${contenuActuel}`,
      maxTokens: 24000,
    });
    return { ...succes("Document adapté par l'assistant : relisez-le puis enregistrez."), values: { texte } };
  } catch (e) {
    return erreur(fd, messageErreur(e));
  }
}
