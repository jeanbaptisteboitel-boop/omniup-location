"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { echec, erreur, messageErreur, succes, type FormState } from "@/lib/forms";
import { avecMessage } from "@/lib/erreurs";
import { analyser, zEnum, zTexte, zTexteOpt } from "@/lib/validation";
import { confirmerEnvoiDirect, enregistrerFichier, preparerEnvoiDirect, supprimerFichier, typeMimeDe, verifierFichier } from "@/lib/storage";
import type { FichierTeleverse, ReponsePreparation } from "@/lib/envoi-direct";
import { envoyerEmail, mailConfigure } from "@/lib/mail";
import { emailTicket } from "@/lib/mail-modeles";
import { adresseAssistance, numeroTicket, resumeNavigateur } from "@/lib/tickets";
import { entiteCourante, entiteCouranteId } from "@/lib/entite";
import { exigerSession } from "@/lib/utilisateurs";
import { origineApplication } from "@/lib/espace";
import { exigerEcriture } from "@/lib/droits";

/** Tickets d'assistance : ouverts par n'importe quel utilisateur connecté (y compris en lecture seule), suivis par l'équipe. */

const schemaTicket = z.object({
  type: zEnum(["AIDE", "BUG", "FONCTIONNALITE"]),
  objet: zTexte(200),
  description: zTexte(5000),
  page: zTexteOpt(300),
});

export async function preparerEnvoiTicket(nom: string, type: string, taille: number): Promise<ReponsePreparation> {
  await exigerSession();
  try {
    return { ok: true, preparation: await preparerEnvoiDirect("tickets", { nom, type, taille }) };
  } catch (e) {
    return { ok: false, erreur: messageErreur(e) };
  }
}

export async function creerTicket(_prev: FormState, fd: FormData): Promise<FormState> {
  const session = await exigerSession();
  const r = analyser(schemaTicket, fd);
  if (!r.success) return echec(fd, r.errors);

  // Capture facultative : envoi direct vers le stockage objet quand il est configuré, sinon fichier transmis au serveur.
  let piece: { nomFichier: string; chemin: string; mimeType: string; taille: number } | null = null;
  try {
    const meta = fd.get("fichiers");
    if (typeof meta === "string" && meta.trim() !== "") {
      const t = (JSON.parse(meta) as FichierTeleverse[])[0];
      if (t) {
        const mimeType = typeMimeDe({ name: t.nomFichier, type: t.mimeType });
        if (!mimeType) return echec(fd, { fichier: "Format non pris en charge (PDF ou image)." });
        piece = { nomFichier: t.nomFichier, chemin: t.chemin, mimeType, taille: await confirmerEnvoiDirect(t.chemin, "tickets/") };
      }
    } else {
      const f = fd.get("fichier");
      if (f instanceof File && f.size > 0) {
        const pb = verifierFichier(f);
        if (pb) return echec(fd, { fichier: pb });
        const e = await enregistrerFichier(f, "tickets");
        piece = { nomFichier: e.nomFichier, chemin: e.chemin, mimeType: e.mimeType, taille: e.taille };
      }
    }
  } catch (e) {
    return erreur(fd, messageErreur(e, "Échec de l'envoi de la pièce jointe."));
  }

  const entite = await entiteCourante().catch(() => null);
  const navigateur = resumeNavigateur((await headers()).get("user-agent"));
  const ticket = await prisma.ticket.create({
    data: {
      entiteId: entite?.id ?? null,
      utilisateurId: session.utilisateurId,
      auteurNom: session.nom,
      auteurEmail: session.email,
      type: r.data.type,
      objet: r.data.objet,
      description: r.data.description,
      page: r.data.page,
      navigateur,
      ...(piece ?? {}),
    },
  });

  // Transmission à l'assistance : un échec d'envoi ne doit pas faire perdre le ticket, déjà enregistré.
  const destinataire = adresseAssistance();
  let transmis = false;
  if (destinataire && mailConfigure()) {
    try {
      const lien = `${await origineApplication()}/tickets/${ticket.id}`;
      const modele = emailTicket(ticket, { nom: session.nom, email: session.email }, entite?.nom ?? "Entité non déterminée", lien);
      await envoyerEmail({ a: destinataire, objet: modele.objet, texte: modele.corps, repondreA: session.email ?? undefined });
      await prisma.ticket.update({ where: { id: ticket.id }, data: { envoyeLe: new Date() } });
      transmis = true;
    } catch (e) {
      console.error(`[ticket ${ticket.id}] transmission à l'assistance impossible :`, e);
    }
  }
  revalidatePath("/tickets");
  return succes(
    `Ticket ${numeroTicket(ticket.id)} enregistré.${transmis ? " L'assistance a été prévenue par email." : destinataire ? " La transmission par email a échoué : le ticket reste consultable dans Assistance." : " Retrouvez-le dans Assistance (aucune adresse d'assistance configurée)."}`,
  );
}

const STATUTS = ["NOUVEAU", "EN_COURS", "RESOLU", "FERME"] as const;

/** Un ticket n'est consultable et modifiable que depuis l'entité dans laquelle il a été ouvert. */
async function ticketDeLEntite(id: number) {
  return prisma.ticket.findFirst({ where: { id, entiteId: await entiteCouranteId() } });
}

export async function changerStatutTicket(fd: FormData): Promise<void> {
  await exigerEcriture();
  const id = Number(fd.get("id"));
  const statut = String(fd.get("statut"));
  if (!STATUTS.includes(statut as (typeof STATUTS)[number])) redirect(avecMessage("/tickets", "Statut inconnu.", "erreur"));
  const t = await ticketDeLEntite(id);
  if (!t) redirect("/tickets");
  await prisma.ticket.update({ where: { id }, data: { statut: statut as (typeof STATUTS)[number] } });
  revalidatePath("/tickets");
  revalidatePath(`/tickets/${id}`);
  redirect(avecMessage(`/tickets/${id}`, `Ticket ${numeroTicket(id)} : statut mis à jour.`));
}

export async function enregistrerSuivi(id: number, _prev: FormState, fd: FormData): Promise<FormState> {
  await exigerEcriture();
  const t = await ticketDeLEntite(id);
  if (!t) return erreur(fd, "Ticket introuvable.");
  const suivi = String(fd.get("suivi") ?? "").trim();
  await prisma.ticket.update({ where: { id }, data: { suivi: suivi || null, suiviLe: suivi ? new Date() : null } });
  revalidatePath(`/tickets/${id}`);
  return succes(suivi ? "Suivi enregistré." : "Suivi effacé.");
}

export async function supprimerTicket(fd: FormData): Promise<void> {
  await exigerEcriture();
  const id = Number(fd.get("id"));
  const t = await ticketDeLEntite(id);
  if (!t) redirect("/tickets");
  await supprimerFichier(t.chemin);
  await prisma.ticket.delete({ where: { id } });
  revalidatePath("/tickets");
  redirect(avecMessage("/tickets", `Ticket ${numeroTicket(id)} supprimé.`));
}
