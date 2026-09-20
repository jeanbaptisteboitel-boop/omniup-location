import type { CategorieMaintenance, StatutMaintenance, UrgenceMaintenance } from "@prisma/client";
import { formatDate } from "./dates";
import { CATEGORIES_MAINTENANCE, STATUTS_MAINTENANCE, URGENCES_MAINTENANCE, adresseSurUneLigne, nomComplet } from "./libelles";
import { formuleAppel } from "./locataires";

/**
 * Emails des demandes de maintenance : avis au gestionnaire à chaque dépôt,
 * avis au locataire à chaque réponse ou changement de statut.
 */

type LotEmail = { nom: string; adresse: string; complementAdresse: string | null; codePostal: string; ville: string };

export type DemandeEmail = {
  id: number;
  objet: string;
  description: string;
  categorie: CategorieMaintenance;
  urgence: UrgenceMaintenance;
  statut: StatutMaintenance;
  interventionLe: Date | null;
  lot: LotEmail;
  locataire: { civilite: string | null; prenom: string; nom: string } | null;
};

function bailleurDe(lot: { bailleur?: { nom: string; representant: string | null } | null }): string {
  const b = lot.bailleur;
  if (!b) return "Votre bailleur";
  return b.representant ? `${b.representant}\n${b.nom}` : b.nom;
}

/** Avis au gestionnaire : une demande vient d'être déposée depuis l'espace locataire. */
export function emailNouvelleDemande(d: DemandeEmail, lien: string): { objet: string; corps: string } {
  const urgent = d.urgence !== "NORMALE";
  const lignes = [
    `Une demande d'intervention vient d'être déposée dans l'espace locataire.`,
    "",
    `Logement : ${d.lot.nom} — ${adresseSurUneLigne(d.lot)}`,
    ...(d.locataire ? [`Locataire : ${nomComplet(d.locataire)}`] : []),
    `Catégorie : ${CATEGORIES_MAINTENANCE[d.categorie]}`,
    `Urgence : ${URGENCES_MAINTENANCE[d.urgence]}`,
    "",
    `Objet : ${d.objet}`,
    d.description,
    "",
    `Suivi de la demande : ${lien}`,
  ];
  return { objet: `${urgent ? `[${URGENCES_MAINTENANCE[d.urgence].toUpperCase()}] ` : ""}Demande de maintenance — ${d.lot.nom} : ${d.objet}`, corps: lignes.join("\n") };
}

/** Phrase décrivant le nouvel état de la demande, utilisée dans l'email au locataire. */
export function phraseStatut(d: Pick<DemandeEmail, "statut" | "interventionLe">): string {
  switch (d.statut) {
    case "PRISE_EN_COMPTE":
      return "Votre demande a été prise en compte : nous revenons vers vous dès que l'intervention est organisée.";
    case "PLANIFIEE":
      return d.interventionLe
        ? `Une intervention est planifiée le ${formatDate(d.interventionLe)}. Merci de permettre l'accès au logement à cette date.`
        : "Une intervention est planifiée ; la date vous sera précisée prochainement.";
    case "RESOLUE":
      return "Votre demande est clôturée : le problème est considéré comme résolu.";
    case "REFUSEE":
      return "Votre demande n'a pas été retenue ; le motif est indiqué ci-dessous.";
    default:
      return "Votre demande est enregistrée.";
  }
}

/**
 * Avis au locataire après une réponse du gestionnaire. `statutChange` ajoute la phrase
 * correspondant au nouvel état ; `message` reprend le texte écrit par le gestionnaire.
 */
export function emailReponseMaintenance(
  d: DemandeEmail & { lot: LotEmail & { bailleur?: { nom: string; representant: string | null } | null } },
  lien: string,
  options: { message?: string | null; statutChange?: boolean } = {},
): { objet: string; corps: string } {
  const lignes = [
    `Bonjour ${formuleAppel(d.locataire ? [d.locataire] : [])},`,
    "",
    `Votre demande « ${d.objet} » concernant ${d.lot.nom} a été mise à jour.`,
    ...(options.statutChange ? ["", phraseStatut(d)] : []),
    ...(options.message?.trim() ? ["", options.message.trim()] : []),
    "",
    `État de la demande : ${STATUTS_MAINTENANCE[d.statut]}.`,
    `Suivre la demande et répondre : ${lien}`,
    "",
    "Cordialement,",
    bailleurDe(d.lot),
  ];
  return { objet: `Votre demande de maintenance — ${d.objet}`, corps: lignes.join("\n") };
}
