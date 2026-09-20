"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { avecMessage } from "@/lib/erreurs";
import { echec, erreur, messageErreur, succes, type FormState } from "@/lib/forms";
import { analyser, zDateOpt, zEnum, zIdOpt, zTexte, zTexteOpt } from "@/lib/validation";
import { exigerEcriture } from "@/lib/droits";
import { entiteCouranteId } from "@/lib/entite";
import { exigerLocataire, locataireConnecte, origineApplication } from "@/lib/espace";
import { bauxPourDemande, demandeDuLocataire, demandeEntite, estOuverte, includeDemande, transitionAutorisee, type DemandeComplete } from "@/lib/maintenance";
import { STATUTS_MAINTENANCE } from "@/lib/libelles";
import { envoyerEmail, mailConfigure } from "@/lib/mail";
import { emailNouvelleDemande, emailReponseMaintenance } from "@/lib/mail-maintenance";
import { confirmerEnvoiDirect, enregistrerFichier, preparerEnvoiDirect, typeMimeDe, verifierFichier } from "@/lib/storage";
import type { FichierTeleverse, ReponsePreparation } from "@/lib/envoi-direct";

/** Toutes les pièces jointes des demandes sont rangées ensemble : les noms de fichiers sont tirés au hasard. */
const DOSSIER = "maintenance";

const CATEGORIES = ["PLOMBERIE", "ELECTRICITE", "CHAUFFAGE", "SERRURERIE", "MENUISERIE", "ELECTROMENAGER", "DEGAT_EAUX", "NUISIBLES", "PARTIES_COMMUNES", "AUTRE"] as const;
const URGENCES = ["NORMALE", "URGENTE", "TRES_URGENTE"] as const;
const STATUTS = ["NOUVELLE", "PRISE_EN_COMPTE", "PLANIFIEE", "RESOLUE", "REFUSEE"] as const;

type Piece = { chemin: string; nomFichier: string; mimeType: string; taille: number };

/**
 * Pièce jointe éventuelle d'un message : fichier déjà déposé sur le stockage objet (champ « fichiers »)
 * ou fichier reçu par le serveur (champ « fichier »). Lève une erreur lisible si le format ne convient pas.
 */
async function lirePiece(fd: FormData): Promise<Piece | null> {
  const meta = fd.get("fichiers");
  if (typeof meta === "string" && meta.trim() !== "") {
    const televerses = JSON.parse(meta) as FichierTeleverse[];
    const t = Array.isArray(televerses) ? televerses[0] : null;
    if (!t) return null;
    const mimeType = typeMimeDe({ name: t.nomFichier, type: t.mimeType });
    if (!mimeType) throw new Error("Format non pris en charge (PDF ou image).");
    return { chemin: t.chemin, nomFichier: t.nomFichier, mimeType, taille: await confirmerEnvoiDirect(t.chemin, `${DOSSIER}/`) };
  }
  const f = fd.get("fichier");
  if (!(f instanceof File) || f.size === 0) return null;
  const probleme = verifierFichier(f);
  if (probleme) throw new Error(probleme);
  const e = await enregistrerFichier(f, DOSSIER);
  return { chemin: e.chemin, nomFichier: e.nomFichier, mimeType: e.mimeType, taille: e.taille };
}

// ---------------------------------------------------------------------------
// Emails (un échec d'envoi ne doit jamais faire échouer l'action)
// ---------------------------------------------------------------------------

/** Destinataire des nouvelles demandes : l'adresse du bailleur du lot, sinon ALERTES_EMAIL. */
function adresseGestionnaire(d: DemandeComplete): string | null {
  return d.lot.bailleur?.email?.trim() || (process.env.ALERTES_EMAIL ?? "").trim() || null;
}

async function previenirGestionnaire(d: DemandeComplete): Promise<void> {
  const a = adresseGestionnaire(d);
  if (!a || !mailConfigure()) return;
  try {
    const modele = emailNouvelleDemande(d, `${await origineApplication()}/maintenance/${d.id}`);
    await envoyerEmail({ a, objet: modele.objet, texte: modele.corps, repondreA: d.locataire?.email ?? null });
  } catch (e) {
    console.error("[maintenance] Avis au gestionnaire non envoyé :", e);
  }
}

/** Renvoie vrai quand le locataire a effectivement été prévenu par email. */
async function previenirLocataire(d: DemandeComplete, options: { message?: string | null; statutChange?: boolean }): Promise<boolean> {
  const a = d.locataire?.email?.trim();
  if (!a || !mailConfigure()) return false;
  try {
    const modele = emailReponseMaintenance(d, `${await origineApplication()}/espace/maintenance/${d.id}`, options);
    await envoyerEmail({ a, objet: modele.objet, texte: modele.corps });
    return true;
  } catch (e) {
    console.error("[maintenance] Avis au locataire non envoyé :", e);
    return false;
  }
}

// ---------------------------------------------------------------------------
// Côté locataire (authentifié par son jeton d'accès)
// ---------------------------------------------------------------------------

const schemaDemande = z.object({
  bailId: zIdOpt,
  objet: zTexte(200),
  description: zTexte(5000),
  categorie: zEnum(CATEGORIES),
  urgence: zEnum(URGENCES),
});

export async function preparerPieceLocataire(nom: string, type: string, taille: number): Promise<ReponsePreparation> {
  if (!(await locataireConnecte())) return { ok: false, erreur: "Votre session a expiré : rouvrez votre espace." };
  try {
    return { ok: true, preparation: await preparerEnvoiDirect(DOSSIER, { nom, type, taille }) };
  } catch (e) {
    return { ok: false, erreur: messageErreur(e) };
  }
}

/** Dépôt d'une demande : la description devient le premier message du fil, avec la photo éventuelle. */
export async function deposerDemande(_prev: FormState, fd: FormData): Promise<FormState> {
  const l = await exigerLocataire();
  const baux = await bauxPourDemande(l.id);
  if (baux.length === 0) return erreur(fd, "Aucun bail en cours n'est rattaché à votre compte : contactez votre bailleur.");
  const r = analyser(schemaDemande, fd);
  if (!r.success) return echec(fd, r.errors);
  const d = r.data;
  const bail = d.bailId ? baux.find((b) => b.id === d.bailId) : baux[0];
  if (!bail) return echec(fd, { bailId: "Choisissez le logement concerné." });

  let piece: Piece | null;
  try {
    piece = await lirePiece(fd);
  } catch (e) {
    return echec(fd, { fichier: messageErreur(e) });
  }
  let demande: DemandeComplete;
  try {
    demande = await prisma.demandeMaintenance.create({
      data: {
        entiteId: bail.entiteId,
        bailId: bail.id,
        lotId: bail.lotId,
        locataireId: l.id,
        objet: d.objet,
        description: d.description,
        categorie: d.categorie,
        urgence: d.urgence,
        luLocataireLe: new Date(),
        messages: { create: { auteur: "LOCATAIRE", texte: d.description, ...(piece ?? {}) } },
      },
      include: includeDemande,
    });
  } catch (e) {
    return erreur(fd, messageErreur(e));
  }
  await previenirGestionnaire(demande);
  revalidatePath("/espace/maintenance");
  revalidatePath("/maintenance");
  redirect(avecMessage(`/espace/maintenance/${demande.id}`, "Votre demande a été transmise à votre bailleur."));
}

const schemaMessage = z.object({ texte: zTexte(5000) });

/** Message ajouté par le locataire au fil d'une demande encore ouverte. */
export async function repondreLocataire(demandeId: number, _prev: FormState, fd: FormData): Promise<FormState> {
  const l = await exigerLocataire();
  const demande = await demandeDuLocataire(l.id, demandeId);
  if (!demande) return erreur(fd, "Demande introuvable.");
  if (!estOuverte(demande.statut)) return erreur(fd, "Cette demande est clôturée : elle n'accepte plus de message.");
  const r = analyser(schemaMessage, fd);
  if (!r.success) return echec(fd, r.errors);
  try {
    const piece = await lirePiece(fd);
    await prisma.messageMaintenance.create({ data: { demandeId, auteur: "LOCATAIRE", texte: r.data.texte, ...(piece ?? {}) } });
  } catch (e) {
    return echec(fd, { fichier: messageErreur(e) }, messageErreur(e));
  }
  await prisma.demandeMaintenance.update({ where: { id: demandeId }, data: { luLocataireLe: new Date() } });
  revalidatePath(`/espace/maintenance/${demandeId}`);
  revalidatePath(`/maintenance/${demandeId}`);
  return succes("Votre message a été ajouté à la demande.");
}

/** Le locataire signale que le problème est résolu : la demande est clôturée. */
export async function signalerResolu(fd: FormData): Promise<void> {
  const l = await exigerLocataire();
  const id = Number(fd.get("id"));
  const demande = await demandeDuLocataire(l.id, id);
  if (!demande) redirect("/espace/maintenance");
  if (!estOuverte(demande.statut)) redirect(avecMessage(`/espace/maintenance/${id}`, "Cette demande est déjà clôturée.", "erreur"));
  await prisma.demandeMaintenance.update({
    where: { id },
    data: {
      statut: "RESOLUE",
      clotureeLe: new Date(),
      luLocataireLe: new Date(),
      messages: { create: { auteur: "LOCATAIRE", texte: "Le problème est résolu : je clôture la demande." } },
    },
  });
  revalidatePath(`/espace/maintenance/${id}`);
  revalidatePath(`/maintenance/${id}`);
  redirect(avecMessage(`/espace/maintenance/${id}`, "Merci : la demande est clôturée."));
}

// ---------------------------------------------------------------------------
// Côté gestionnaire
// ---------------------------------------------------------------------------

export async function preparerPieceGestionnaire(nom: string, type: string, taille: number): Promise<ReponsePreparation> {
  await exigerEcriture();
  try {
    return { ok: true, preparation: await preparerEnvoiDirect(DOSSIER, { nom, type, taille }) };
  } catch (e) {
    return { ok: false, erreur: messageErreur(e) };
  }
}

/** Réponse du gestionnaire (texte et pièce jointe facultative) ; le locataire en est averti par email. */
export async function repondreDemande(demandeId: number, _prev: FormState, fd: FormData): Promise<FormState> {
  await exigerEcriture();
  const demande = await demandeEntite(demandeId, await entiteCouranteId());
  if (!demande) return erreur(fd, "Demande introuvable.");
  const r = analyser(schemaMessage, fd);
  if (!r.success) return echec(fd, r.errors);
  try {
    const piece = await lirePiece(fd);
    await prisma.messageMaintenance.create({ data: { demandeId, auteur: "GESTIONNAIRE", texte: r.data.texte, ...(piece ?? {}) } });
  } catch (e) {
    return echec(fd, { fichier: messageErreur(e) }, messageErreur(e));
  }
  const prevenu = await previenirLocataire(demande, { message: r.data.texte });
  revalidatePath(`/maintenance/${demandeId}`);
  revalidatePath(`/espace/maintenance/${demandeId}`);
  return succes(prevenu ? `Réponse enregistrée et envoyée à ${demande.locataire?.email}.` : "Réponse enregistrée : le locataire la verra dans son espace.");
}

const schemaStatut = z.object({ statut: zEnum(STATUTS), interventionLe: zDateOpt, message: zTexteOpt(5000) });

/** Changement de statut : prise en compte, planification datée, résolution ou refus motivé. */
export async function changerStatutDemande(fd: FormData): Promise<void> {
  await exigerEcriture();
  const id = Number(fd.get("id"));
  const demande = await demandeEntite(id, await entiteCouranteId());
  if (!demande) redirect("/maintenance");
  const cible = `/maintenance/${id}`;
  const r = analyser(schemaStatut, fd);
  if (!r.success) redirect(avecMessage(cible, Object.values(r.errors)[0] ?? "Formulaire incomplet.", "erreur"));
  const { statut, interventionLe, message } = r.data;
  if (!transitionAutorisee(demande.statut, statut)) redirect(avecMessage(cible, `Une demande ${STATUTS_MAINTENANCE[demande.statut].toLowerCase()} ne peut pas passer à « ${STATUTS_MAINTENANCE[statut]} ».`, "erreur"));
  if (statut === "PLANIFIEE" && !interventionLe) redirect(avecMessage(cible, "Indiquez la date d'intervention pour planifier la demande.", "erreur"));
  if (statut === "REFUSEE" && !message) redirect(avecMessage(cible, "Le refus doit être motivé : expliquez-le au locataire.", "erreur"));

  const misAJour = await prisma.demandeMaintenance.update({
    where: { id },
    data: {
      statut,
      interventionLe: statut === "PLANIFIEE" ? interventionLe : demande.interventionLe,
      clotureeLe: statut === "RESOLUE" || statut === "REFUSEE" ? new Date() : null,
      ...(message ? { messages: { create: { auteur: "GESTIONNAIRE", texte: message } } } : {}),
    },
    include: includeDemande,
  });
  const prevenu = await previenirLocataire(misAJour, { message, statutChange: true });
  revalidatePath(cible);
  revalidatePath("/maintenance");
  revalidatePath(`/espace/maintenance/${id}`);
  redirect(avecMessage(cible, `Demande « ${STATUTS_MAINTENANCE[statut]} »${prevenu ? " : le locataire est prévenu par email." : " : le locataire le verra dans son espace."}`));
}
