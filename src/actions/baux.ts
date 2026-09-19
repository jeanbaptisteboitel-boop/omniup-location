"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { echec, erreur, succes, type FormState } from "@/lib/forms";
import { avecMessage } from "@/lib/erreurs";
import { analyser, zBool, zDate, zDateOpt, zEntier, zEnum, zId, zMontant, zMontantOpt, zNombreOpt, zTexteOpt } from "@/lib/validation";
import { verifierRegles } from "@/lib/bail-regles";
import { aujourdhui, periodeDe, toISODate } from "@/lib/dates";
import { calculerLoyerRevise } from "@/lib/irl";
import { formatEuros } from "@/lib/montants";
import { recalculerAppelsNonRegles, synchroniserAppelsLoyer } from "@/lib/loyers-sync";
import { pdfContrat } from "@/lib/pdf/documents";
import { envoyerEmail } from "@/lib/mail";
import { emailContrat } from "@/lib/mail-modeles";
import { messageErreur } from "@/lib/forms";
import { entiteCouranteId } from "@/lib/entite";
import { emailsLocataires, includeLocataires, nomsLocataires } from "@/lib/locataires";

const schemaBail = z.object({
  lotId: zId,
  type: zEnum(["NON_MEUBLE", "MEUBLE", "MOBILITE"]),
  dateDebut: zDate,
  dateFin: zDate,
  loyerHC: zMontant,
  charges: zMontantOpt,
  chargesForfait: zBool,
  depotGarantie: zMontantOpt,
  jourEcheance: zEntier(1, 31),
  motifMobilite: zTexteOpt(200),
  clauseRevision: zBool,
  irlTrimestre: zTexteOpt(20),
  irlValeur: zNombreOpt,
  notes: zTexteOpt(5000),
});

/** Identifiants des locataires cochés (champ répété « locataireIds »). */
function locataireIdsDe(fd: FormData): number[] {
  const ids = fd
    .getAll("locataireIds")
    .flatMap((v) => (typeof v === "string" ? v.split(",") : []))
    .map((v) => Number(v.trim()))
    .filter((n) => Number.isInteger(n) && n > 0);
  return Array.from(new Set(ids));
}

async function preparerBail(fd: FormData) {
  const r = analyser(schemaBail, fd);
  const locataireIds = locataireIdsDe(fd);
  if (!r.success) return { ok: false as const, errors: { ...r.errors, ...(locataireIds.length ? {} : { locataireIds: "Choisissez au moins un locataire." }) } };
  const d = r.data;
  const entiteId = await entiteCouranteId();
  const [lot, locataires] = await Promise.all([
    prisma.lot.findFirst({ where: { id: d.lotId, entiteId }, select: { id: true, meuble: true } }),
    prisma.locataire.findMany({ where: { id: { in: locataireIds }, entiteId }, select: { id: true } }),
  ]);
  const errors: Record<string, string> = {};
  if (!lot) errors.lotId = "Lot introuvable.";
  if (!locataireIds.length) errors.locataireIds = "Choisissez au moins un locataire.";
  else if (locataires.length !== locataireIds.length) errors.locataireIds = "Locataire introuvable.";
  if (Object.keys(errors).length) return { ok: false as const, errors };

  const chargesForfait = d.type === "MOBILITE" ? true : d.chargesForfait;
  const data = {
    entiteId,
    lotId: d.lotId,
    type: d.type,
    dateDebut: d.dateDebut,
    dateFin: d.dateFin,
    loyerHC: d.loyerHC,
    charges: d.charges ?? 0,
    chargesForfait,
    depotGarantie: d.depotGarantie ?? 0,
    jourEcheance: d.jourEcheance,
    motifMobilite: d.type === "MOBILITE" ? d.motifMobilite : null,
    clauseRevision: d.type === "MOBILITE" ? false : d.clauseRevision,
    irlTrimestre: d.irlTrimestre,
    irlValeur: d.irlValeur,
    notes: d.notes,
  };
  const verif = verifierRegles({ ...data, lotMeuble: lot!.meuble });
  if (Object.keys(verif.erreurs).length) return { ok: false as const, errors: verif.erreurs };
  return { ok: true as const, data, locataireIds, avertissements: verif.avertissements };
}

function messageAvecAvertissements(base: string, avertissements: string[]): string {
  return avertissements.length ? `${base} Attention : ${avertissements.join(" ")}` : base;
}

export async function creerBail(_prev: FormState, fd: FormData): Promise<FormState> {
  const p = await preparerBail(fd);
  if (!p.ok) return echec(fd, p.errors);
  const bail = await prisma.bail.create({ data: { ...p.data, locataires: { connect: p.locataireIds.map((id) => ({ id })) } } });
  revalidatePath("/baux");
  redirect(avecMessage(`/baux/${bail.id}`, messageAvecAvertissements("Bail créé en brouillon.", p.avertissements)));
}

export async function modifierBail(id: number, _prev: FormState, fd: FormData): Promise<FormState> {
  const existant = await prisma.bail.findFirst({ where: { id, entiteId: await entiteCouranteId() }, include: { locataires: { select: { id: true } } } });
  if (!existant) return erreur(fd, "Bail introuvable.");
  const verrouille = existant.statut === "SIGNE" || existant.statut === "TERMINE";
  if (verrouille) {
    // Les éléments structurants d'un bail signé ne se modifient pas.
    fd.set("lotId", String(existant.lotId));
    fd.delete("locataireIds");
    for (const l of existant.locataires) fd.append("locataireIds", String(l.id));
    fd.set("type", existant.type);
    fd.set("dateDebut", toISODate(existant.dateDebut));
  }
  const p = await preparerBail(fd);
  if (!p.ok) return echec(fd, p.errors);
  await prisma.bail.update({ where: { id }, data: { ...p.data, locataires: { set: p.locataireIds.map((lid) => ({ id: lid })) } } });
  if (verrouille) await recalculerAppelsNonRegles(id, periodeDe(aujourdhui()));
  revalidatePath("/baux");
  revalidatePath(`/baux/${id}`);
  redirect(avecMessage(`/baux/${id}`, messageAvecAvertissements("Bail modifié.", p.avertissements)));
}

export async function supprimerBail(fd: FormData): Promise<void> {
  const id = Number(fd.get("id"));
  const bail = await prisma.bail.findFirst({ where: { id, entiteId: await entiteCouranteId() }, select: { lotId: true } });
  if (!bail) redirect("/baux");
  await prisma.bail.delete({ where: { id } });
  revalidatePath("/baux");
  revalidatePath(`/lots/${bail.lotId}`);
  redirect(avecMessage("/baux", "Bail supprimé (ainsi que ses appels de loyer et paiements)."));
}

// ---------------------------------------------------------------------------
// Cycle de vie : brouillon → en signature → signé → terminé
// ---------------------------------------------------------------------------

export async function envoyerEnSignature(fd: FormData): Promise<void> {
  const id = Number(fd.get("id"));
  const ref = String(fd.get("signatureRef") ?? "").trim() || null;
  const bail = await prisma.bail.findFirst({ where: { id, entiteId: await entiteCouranteId() } });
  if (!bail) redirect("/baux");
  if (bail.statut !== "BROUILLON") redirect(avecMessage(`/baux/${id}`, "Ce bail n'est plus en brouillon.", "erreur"));
  await prisma.bail.update({ where: { id }, data: { statut: "EN_SIGNATURE", signatureRef: ref ?? bail.signatureRef } });
  revalidatePath(`/baux/${id}`);
  revalidatePath("/baux");
  redirect(avecMessage(`/baux/${id}`, "Bail en attente de signature. Faites signer le contrat dans Omniup Sign, puis cliquez sur « Marquer comme signé »."));
}

export async function retourBrouillon(fd: FormData): Promise<void> {
  const id = Number(fd.get("id"));
  const bail = await prisma.bail.findFirst({ where: { id, entiteId: await entiteCouranteId() } });
  if (!bail) redirect("/baux");
  if (bail.statut !== "EN_SIGNATURE") redirect(avecMessage(`/baux/${id}`, "Seul un bail en signature peut revenir en brouillon.", "erreur"));
  await prisma.bail.update({ where: { id }, data: { statut: "BROUILLON" } });
  revalidatePath(`/baux/${id}`);
  revalidatePath("/baux");
  redirect(avecMessage(`/baux/${id}`, "Bail remis en brouillon."));
}

export async function marquerSigne(fd: FormData): Promise<void> {
  const id = Number(fd.get("id"));
  const dateSignature = zDateOpt.safeParse(String(fd.get("dateSignature") ?? ""));
  const ref = String(fd.get("signatureRef") ?? "").trim() || null;
  const bail = await prisma.bail.findFirst({ where: { id, entiteId: await entiteCouranteId() } });
  if (!bail) redirect("/baux");
  if (bail.statut === "SIGNE" || bail.statut === "TERMINE") redirect(avecMessage(`/baux/${id}`, "Ce bail est déjà signé.", "erreur"));
  if (!dateSignature.success) redirect(avecMessage(`/baux/${id}`, "Date de signature invalide.", "erreur"));

  const conflit = await prisma.bail.findFirst({
    where: { lotId: bail.lotId, statut: "SIGNE", id: { not: id }, OR: [{ dateFinEffective: null }, { dateFinEffective: { gte: bail.dateDebut } }] },
    include: { locataires: includeLocataires },
  });
  if (conflit) {
    redirect(avecMessage(`/baux/${id}`, `Le lot a déjà un bail signé en cours avec ${nomsLocataires(conflit.locataires)}. Clôturez-le avant de signer celui-ci.`, "erreur"));
  }

  await prisma.bail.update({
    where: { id },
    data: { statut: "SIGNE", dateSignature: dateSignature.data ?? aujourdhui(), signatureRef: ref ?? bail.signatureRef },
  });
  const crees = await synchroniserAppelsLoyer({ bailId: id });
  revalidatePath(`/baux/${id}`);
  revalidatePath("/baux");
  revalidatePath("/loyers");
  revalidatePath(`/lots/${bail.lotId}`);
  const detail = crees.length ? ` ${crees.length} appel${crees.length > 1 ? "s" : ""} de loyer émis.` : " Les appels de loyer seront émis automatiquement à l'approche de chaque échéance.";
  redirect(avecMessage(`/baux/${id}`, `Bail signé.${detail}`));
}

export async function cloturerBail(fd: FormData): Promise<void> {
  const id = Number(fd.get("id"));
  const dateFin = zDate.safeParse(String(fd.get("dateFinEffective") ?? ""));
  const bail = await prisma.bail.findFirst({ where: { id, entiteId: await entiteCouranteId() } });
  if (!bail) redirect("/baux");
  if (bail.statut !== "SIGNE") redirect(avecMessage(`/baux/${id}`, "Seul un bail signé peut être clôturé.", "erreur"));
  if (!dateFin.success) redirect(avecMessage(`/baux/${id}`, "Indiquez la date de fin effective (départ du locataire).", "erreur"));
  if (dateFin.data.getTime() < bail.dateDebut.getTime()) redirect(avecMessage(`/baux/${id}`, "La date de fin ne peut pas précéder le début du bail.", "erreur"));

  await prisma.bail.update({ where: { id }, data: { statut: "TERMINE", dateFinEffective: dateFin.data } });
  await recalculerAppelsNonRegles(id, periodeDe(dateFin.data));
  await synchroniserAppelsLoyer({ bailId: id });
  revalidatePath(`/baux/${id}`);
  revalidatePath("/baux");
  revalidatePath("/loyers");
  revalidatePath(`/lots/${bail.lotId}`);
  redirect(avecMessage(`/baux/${id}`, "Bail clôturé. Le dernier appel de loyer a été recalculé au prorata si nécessaire ; pensez à restituer le dépôt de garantie."));
}

// ---------------------------------------------------------------------------
// Contrat et révision de loyer
// ---------------------------------------------------------------------------

export async function enregistrerContrat(id: number, _prev: FormState, fd: FormData): Promise<FormState> {
  const bail = await prisma.bail.findFirst({ where: { id, entiteId: await entiteCouranteId() }, select: { id: true } });
  if (!bail) return erreur(fd, "Bail introuvable.");
  const texte = String(fd.get("texteContrat") ?? "");
  await prisma.bail.update({ where: { id }, data: { texteContrat: texte.trim() === "" ? null : texte } });
  revalidatePath(`/baux/${id}`);
  revalidatePath(`/baux/${id}/contrat`);
  return succes("Contrat enregistré.");
}

const schemaRevision = z.object({
  dateEffet: zDate,
  irlAncienTrimestre: zTexteOpt(20),
  irlAncienValeur: zMontant,
  irlNouveauTrimestre: zTexteOpt(20),
  irlNouveauValeur: zMontant,
});

export async function reviserLoyer(id: number, _prev: FormState, fd: FormData): Promise<FormState> {
  const r = analyser(schemaRevision, fd);
  if (!r.success) return echec(fd, r.errors);
  const bail = await prisma.bail.findFirst({ where: { id, entiteId: await entiteCouranteId() } });
  if (!bail) return erreur(fd, "Bail introuvable.");
  if (bail.type === "MOBILITE") return erreur(fd, "Le loyer d'un bail mobilité ne peut pas être révisé.");
  if (r.data.irlAncienValeur <= 0 || r.data.irlNouveauValeur <= 0) return echec(fd, { irlNouveauValeur: "Indices invalides." });
  if (r.data.dateEffet.getTime() < bail.dateDebut.getTime()) return echec(fd, { dateEffet: "La révision ne peut pas prendre effet avant le début du bail." });

  const nouveauLoyer = calculerLoyerRevise(bail.loyerHC, r.data.irlAncienValeur, r.data.irlNouveauValeur);
  await prisma.$transaction([
    prisma.revisionLoyer.create({
      data: {
        bailId: id,
        dateEffet: r.data.dateEffet,
        ancienLoyer: bail.loyerHC,
        nouveauLoyer,
        irlAncienTrimestre: r.data.irlAncienTrimestre,
        irlAncienValeur: r.data.irlAncienValeur,
        irlNouveauTrimestre: r.data.irlNouveauTrimestre,
        irlNouveauValeur: r.data.irlNouveauValeur,
      },
    }),
    prisma.bail.update({ where: { id }, data: { loyerHC: nouveauLoyer, irlTrimestre: r.data.irlNouveauTrimestre, irlValeur: r.data.irlNouveauValeur } }),
  ]);
  await recalculerAppelsNonRegles(id, periodeDe(r.data.dateEffet));
  revalidatePath(`/baux/${id}`);
  revalidatePath("/loyers");
  redirect(avecMessage(`/baux/${id}`, `Loyer révisé : ${formatEuros(bail.loyerHC)} → ${formatEuros(nouveauLoyer)} hors charges à compter du ${toISODate(r.data.dateEffet).split("-").reverse().join("/")}. Vous pouvez rédiger le courrier de notification aux locataires.`));
}

export async function envoyerContrat(id: number, _prev: FormState, fd: FormData): Promise<FormState> {
  const bail = await prisma.bail.findFirst({ where: { id, entiteId: await entiteCouranteId() }, include: { lot: { include: { bailleur: true } }, locataires: includeLocataires } });
  if (!bail) return erreur(fd, "Bail introuvable.");
  if (!bail.texteContrat?.trim()) return erreur(fd, "Enregistrez d'abord le texte du contrat.");
  const email = emailsLocataires(bail.locataires);
  if (!email.length) return erreur(fd, "Aucun locataire n'a d'adresse email.");
  try {
    const modele = emailContrat(bail);
    const pdf = await pdfContrat(bail);
    await envoyerEmail({
      a: email,
      objet: String(fd.get("objet") ?? "").trim() || modele.objet,
      texte: String(fd.get("corps") ?? "").trim() || modele.corps,
      repondreA: bail.lot.bailleur?.email,
      piecesJointes: [{ nom: `contrat-bail-${bail.id}.pdf`, contenu: pdf, type: "application/pdf" }],
    });
  } catch (e) {
    return erreur(fd, messageErreur(e));
  }
  return succes(`Contrat envoyé à ${email.join(", ")}.`);
}
