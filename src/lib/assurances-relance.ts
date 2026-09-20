import "server-only";
import { prisma } from "./prisma";
import { aujourdhui } from "./dates";
import { doitRelancer, etatAssurance } from "./assurances";
import { emailsLocataires, includeLocataires } from "./locataires";
import { envoyerEmail, mailConfigure } from "./mail";
import { emailDemandeAssurance } from "./mail-modeles";
import { lienAcces } from "./espace";

/**
 * Relance automatique des attestations d'assurance habitation (tâche planifiée quotidienne) :
 * un email par bail en cours dont l'attestation manque, a expiré ou arrive à échéance, au plus tous les quinze jours.
 */
export async function relancerAssurances(origine: string): Promise<{ relances: number; ignores: number; erreurs: string[] }> {
  const auj = aujourdhui();
  const erreurs: string[] = [];
  if (!mailConfigure()) return { relances: 0, ignores: 0, erreurs: ["Envoi d'emails non configuré."] };
  const baux = await prisma.bail.findMany({
    where: { statut: "SIGNE" },
    include: { locataires: includeLocataires, lot: { include: { bailleur: true } }, assurances: { select: { dateEcheance: true } } },
  });
  let relances = 0;
  let ignores = 0;
  for (const bail of baux) {
    const etat = etatAssurance(bail.assurances, auj);
    if (!doitRelancer(bail, etat, auj)) continue;
    const destinataires = emailsLocataires(bail.locataires);
    if (!destinataires.length) {
      ignores++;
      continue;
    }
    const avecJeton = bail.locataires.find((l) => l.accesJeton);
    const lien = avecJeton?.accesJeton ? lienAcces(origine, avecJeton.accesJeton) : null;
    const modele = emailDemandeAssurance(bail.locataires, bail.lot, etat, lien, bail.lot.bailleur);
    try {
      await envoyerEmail({ a: destinataires.join(", "), objet: modele.objet, texte: modele.corps });
      await prisma.bail.update({ where: { id: bail.id }, data: { assuranceRelanceLe: new Date(), assuranceDemandeeLe: bail.assuranceDemandeeLe ?? new Date() } });
      relances++;
    } catch (e) {
      erreurs.push(`Bail ${bail.id} : ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  return { relances, ignores, erreurs };
}
