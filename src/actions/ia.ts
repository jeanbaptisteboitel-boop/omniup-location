"use server";

import { prisma } from "@/lib/prisma";
import { erreur, messageErreur, succes, type FormState } from "@/lib/forms";
import { rediger } from "@/lib/ia";
import { ficheBail } from "@/lib/ia-contexte";
import { promptContratBail, promptCourrierLibre, promptCourrierRevision, promptEmail, promptRelance } from "@/lib/ia-prompts";
import { formatDateLongue, formatPeriode, formatDate, aujourdhui } from "@/lib/dates";
import { formatEuros } from "@/lib/montants";
import { variationIRL } from "@/lib/irl";
import { etatAppel } from "@/lib/loyers";
import { exigerEcriture } from "@/lib/droits";

function instructionsDe(fd: FormData): string | null {
  const s = String(fd.get("instructions") ?? "").trim();
  return s === "" ? null : s.slice(0, 2000);
}

function resultat(texte: string): FormState {
  return { ...succes("Texte généré : relisez-le, modifiez-le si besoin, puis enregistrez."), values: { texte } };
}

export async function genererContrat(bailId: number, _prev: FormState, fd: FormData): Promise<FormState> {
  await exigerEcriture();
  try {
    const { fiche, bail } = await ficheBail(bailId);
    const texte = await rediger({ prompt: promptContratBail(fiche, bail.type, instructionsDe(fd)), maxTokens: 24000 });
    return resultat(texte);
  } catch (e) {
    return erreur(fd, messageErreur(e));
  }
}

export async function genererCourrier(bailId: number, _prev: FormState, fd: FormData): Promise<FormState> {
  await exigerEcriture();
  const type = String(fd.get("type") ?? "AUTRE");
  const instructions = instructionsDe(fd);
  try {
    const { fiche, bail } = await ficheBail(bailId);
    let prompt: string;
    if (type === "REVISION_LOYER") {
      const revisionId = Number(fd.get("revisionId"));
      const revision = revisionId
        ? await prisma.revisionLoyer.findUnique({ where: { id: revisionId } })
        : await prisma.revisionLoyer.findFirst({ where: { bailId }, orderBy: { dateEffet: "desc" } });
      if (!revision) return erreur(fd, "Aucune révision de loyer enregistrée pour ce bail : appliquez d'abord la révision depuis la fiche du bail.");
      prompt = promptCourrierRevision(
        fiche,
        {
          dateEffet: formatDateLongue(revision.dateEffet),
          ancienLoyer: formatEuros(revision.ancienLoyer),
          nouveauLoyer: formatEuros(revision.nouveauLoyer),
          irlAncien: `${revision.irlAncienTrimestre ?? ""} ${String(revision.irlAncienValeur).replace(".", ",")}`.trim(),
          irlNouveau: `${revision.irlNouveauTrimestre ?? ""} ${String(revision.irlNouveauValeur).replace(".", ",")}`.trim(),
          variation: String(variationIRL(revision.irlAncienValeur, revision.irlNouveauValeur)).replace(".", ","),
        },
        instructions,
      );
    } else if (type === "RELANCE") {
      const appels = await prisma.appelLoyer.findMany({ where: { bailId }, include: { paiements: true }, orderBy: { periode: "asc" } });
      const auj = aujourdhui();
      const impayes = appels
        .map((a) => ({ a, e: etatAppel(a, auj) }))
        .filter(({ e }) => e.reste > 0 && e.statut !== "A_PAYER");
      if (impayes.length === 0) return erreur(fd, "Aucune échéance en retard pour ce bail.");
      const detail = impayes.map(({ a, e }) => `- ${formatPeriode(a.periode)} (échéance du ${formatDate(a.dateEcheance)}) : ${formatEuros(a.total)} appelés, ${formatEuros(e.regle)} réglés, reste dû ${formatEuros(e.reste)}`).join("\n");
      const total = impayes.reduce((s, { e }) => s + e.reste, 0);
      const niveau = String(fd.get("niveau")) === "mise_en_demeure" ? "mise_en_demeure" : "simple";
      prompt = promptRelance(fiche, `${detail}\n- Total restant dû : ${formatEuros(total)}`, niveau, instructions);
      void bail;
    } else {
      if (!instructions) return erreur(fd, "Décrivez le courrier souhaité dans les instructions.");
      prompt = promptCourrierLibre(fiche, instructions);
    }
    const texte = await rediger({ prompt });
    return resultat(texte);
  } catch (e) {
    return erreur(fd, messageErreur(e));
  }
}

export async function genererEmail(bailId: number, _prev: FormState, fd: FormData): Promise<FormState> {
  await exigerEcriture();
  const objet = String(fd.get("objet") ?? "").trim() || "Votre location";
  const contexte = String(fd.get("contexte") ?? "").trim().slice(0, 4000);
  try {
    const { fiche } = await ficheBail(bailId);
    const texte = await rediger({ prompt: promptEmail(fiche, objet, contexte, instructionsDe(fd)), maxTokens: 4000 });
    const m = /^Objet\s*:\s*(.+)\n+([\s\S]*)$/i.exec(texte);
    return { ...succes("Email rédigé : relisez-le avant envoi."), values: { objet: m ? m[1].trim() : objet, corps: m ? m[2].trim() : texte } };
  } catch (e) {
    return erreur(fd, messageErreur(e));
  }
}
