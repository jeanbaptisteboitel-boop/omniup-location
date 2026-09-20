import { formatDate, formatPeriode } from "./dates";
import { formatEuros } from "./montants";
import { adresseSurUneLigne } from "./libelles";
import { formuleAppel } from "./locataires";
import { numeroAppel } from "./loyers";
import { numeroTicket } from "./tickets";
import { libelleTaux, usageHabitation } from "./tva";
import type { AppelComplet } from "./pdf/donnees";

function signature(bailleur: { nom: string; representant: string | null } | null): string {
  if (!bailleur) return "Le bailleur";
  return bailleur.representant ? `${bailleur.representant}\n${bailleur.nom}` : bailleur.nom;
}

export function emailAvis(a: AppelComplet): { objet: string; corps: string } {
  const { bail } = a;
  const bailleur = bail.lot.bailleur;
  const lignes = [
    `Bonjour ${formuleAppel(bail.locataires)},`,
    "",
    `Veuillez trouver ci-joint l'avis d'échéance n° ${numeroAppel(a.id)} de votre loyer pour ${formatPeriode(a.periode).toLowerCase()}, concernant ${usageHabitation(bail.type) ? "le logement" : "le local"} situé ${adresseSurUneLigne(bail.lot)}.`,
    "",
    `Montant à régler : ${formatEuros(a.total)}${a.tauxTva > 0 ? ` TTC (loyer ${formatEuros(a.loyer)}${a.charges > 0 ? ` + charges ${formatEuros(a.charges)}` : ""} hors taxes + TVA ${libelleTaux(a.tauxTva)} ${formatEuros(a.montantTva)})` : a.charges > 0 ? ` (loyer ${formatEuros(a.loyer)} + charges ${formatEuros(a.charges)})` : ""}, à payer au plus tard le ${formatDate(a.dateEcheance)}.`,
    ...(bailleur?.iban ? [`Règlement par virement : IBAN ${bailleur.iban}${bailleur.bic ? ` - BIC ${bailleur.bic}` : ""}, référence ${numeroAppel(a.id)}.`] : []),
    "",
    "Une quittance vous sera adressée dès réception du paiement.",
    "",
    "Cordialement,",
    signature(bailleur),
  ];
  return { objet: `Avis d'échéance - loyer de ${formatPeriode(a.periode).toLowerCase()} - ${bail.lot.nom}`, corps: lignes.join("\n") };
}

export function emailQuittance(a: AppelComplet, integral: boolean): { objet: string; corps: string } {
  const { bail } = a;
  const bailleur = bail.lot.bailleur;
  const dernier = a.paiements[a.paiements.length - 1];
  const lignes = [
    `Bonjour ${formuleAppel(bail.locataires)},`,
    "",
    integral
      ? `Nous accusons réception de votre paiement${dernier ? ` du ${formatDate(dernier.date)}` : ""} et vous prions de trouver ci-joint la quittance de loyer pour ${formatPeriode(a.periode).toLowerCase()} (${formatEuros(a.total)}${a.tauxTva > 0 ? ` TTC, dont TVA ${formatEuros(a.montantTva)}` : ""}), concernant ${usageHabitation(bail.type) ? "le logement" : "le local"} situé ${adresseSurUneLigne(bail.lot)}.`
      : `Nous accusons réception de votre paiement partiel${dernier ? ` du ${formatDate(dernier.date)}` : ""} et vous prions de trouver ci-joint le reçu correspondant pour ${formatPeriode(a.periode).toLowerCase()}, concernant ${usageHabitation(bail.type) ? "le logement" : "le local"} situé ${adresseSurUneLigne(bail.lot)}.`,
    "",
    "Nous vous remercions.",
    "",
    "Cordialement,",
    signature(bailleur),
  ];
  return { objet: `${integral ? "Quittance de loyer" : "Reçu de paiement"} - ${formatPeriode(a.periode).toLowerCase()} - ${bail.lot.nom}`, corps: lignes.join("\n") };
}

export function emailCourrier(c: { objet: string; bail: { lot: { nom: string; bailleur: { nom: string; representant: string | null } | null }; locataires: { civilite: string | null; nom: string }[] } }): { objet: string; corps: string } {
  const lignes = [
    `Bonjour ${formuleAppel(c.bail.locataires)},`,
    "",
    `Veuillez trouver ci-joint un courrier concernant votre location (${c.bail.lot.nom}) : ${c.objet}.`,
    "",
    "Nous restons à votre disposition pour toute question.",
    "",
    "Cordialement,",
    signature(c.bail.lot.bailleur),
  ];
  return { objet: c.objet, corps: lignes.join("\n") };
}

export function emailContrat(b: { lot: { nom: string; adresse: string; complementAdresse: string | null; codePostal: string; ville: string; bailleur: { nom: string; representant: string | null } | null }; locataires: { civilite: string | null; nom: string }[] }): { objet: string; corps: string } {
  const lignes = [
    `Bonjour ${formuleAppel(b.locataires)},`,
    "",
    `Veuillez trouver ci-joint le projet de contrat de location pour le logement situé ${adresseSurUneLigne(b.lot)} (${b.lot.nom}).`,
    "",
    "Merci de le relire attentivement : il vous sera ensuite soumis pour signature électronique via Omniup Sign.",
    "",
    "Cordialement,",
    signature(b.lot.bailleur),
  ];
  return { objet: `Projet de contrat de location - ${b.lot.nom}`, corps: lignes.join("\n") };
}

/** Lien d'accès à l'espace locataire. */
export function emailAccesLocataire(l: { civilite: string | null; nom: string }, lien: string, expediteur: string | null): { objet: string; corps: string } {
  const lignes = [
    `Bonjour ${formuleAppel([l])},`,
    "",
    "Votre espace locataire est ouvert : vous y retrouverez votre bail, l'exemplaire signé du contrat, vos avis d'échéance, vos quittances, vos courriers et votre solde.",
    "",
    "Pour y accéder, ouvrez ce lien personnel (ne le transmettez à personne) :",
    lien,
    "",
    "Conservez cet email : le lien reste valable tant qu'il n'est pas révoqué par votre bailleur.",
    "",
    "Cordialement,",
    expediteur || "Votre bailleur",
  ];
  return { objet: "Votre espace locataire", corps: lignes.join("\n") };
}

/** Demande (ou relance) de l'attestation d'assurance habitation, à déposer dans l'espace locataire. */
export function emailDemandeAssurance(
  locataires: { civilite: string | null; nom: string }[],
  lot: { nom: string },
  etat: { statut: "A_JOUR" | "BIENTOT_EXPIREE" | "EXPIREE" | "MANQUANTE"; echeance: Date | null },
  lien: string | null,
  bailleur: { nom: string; representant: string | null } | null,
): { objet: string; corps: string } {
  const situation =
    etat.statut === "MANQUANTE"
      ? "nous n'avons pas encore reçu votre attestation d'assurance habitation"
      : etat.statut === "EXPIREE"
        ? `votre attestation d'assurance habitation est arrivée à échéance le ${formatDate(etat.echeance)}`
        : `votre attestation d'assurance habitation arrive à échéance le ${formatDate(etat.echeance)}`;
  const lignes = [
    `Bonjour ${formuleAppel(locataires)},`,
    "",
    `Concernant le logement ${lot.nom}, ${situation}.`,
    "",
    "Le contrat de location prévoit que vous justifiez chaque année d'une assurance contre les risques locatifs (article 7 g de la loi du 6 juillet 1989). Merci de nous transmettre votre nouvelle attestation.",
    ...(lien ? ["", "Vous pouvez la déposer directement depuis votre espace locataire :", lien] : ["", "Vous pouvez nous l'adresser en réponse à cet email."]),
    "",
    "Cordialement,",
    signature(bailleur),
  ];
  return { objet: `Attestation d'assurance habitation - ${lot.nom}`, corps: lignes.join("\n") };
}

/** Ticket d'assistance transmis à l'équipe (aide, dysfonctionnement, proposition). */
export function emailTicket(
  t: { id: number; type: "AIDE" | "BUG" | "FONCTIONNALITE"; objet: string; description: string; page: string | null; navigateur: string | null; nomFichier: string | null },
  auteur: { nom: string; email: string | null },
  entite: string,
  lien: string | null,
): { objet: string; corps: string } {
  const nature = t.type === "BUG" ? "Signalement d'un problème" : t.type === "FONCTIONNALITE" ? "Proposition d'amélioration" : "Demande d'aide";
  const lignes = [
    `${nature} - ticket ${numeroTicket(t.id)}`,
    "",
    `Entité : ${entite}`,
    `Auteur : ${auteur.nom}${auteur.email ? ` (${auteur.email})` : ""}`,
    ...(t.page ? [`Page : ${t.page}`] : []),
    ...(t.navigateur ? [`Navigateur : ${t.navigateur}`] : []),
    ...(t.nomFichier ? [`Pièce jointe déposée : ${t.nomFichier}`] : []),
    "",
    `Objet : ${t.objet}`,
    "",
    t.description,
    ...(lien ? ["", `Suivi du ticket : ${lien}`] : []),
  ];
  return { objet: `[${nature}] ${t.objet}`, corps: lignes.join("\n") };
}

/** Lien d'accès au dossier de candidature : envoyé au candidat, à un colocataire ou à une caution. */
export function emailAccesCandidature(
  d: { civilite: string | null; nom: string; prenom: string | null; raisonSociale: string | null; personneMorale: boolean; role: "CANDIDAT" | "GARANT" },
  candidature: { loyerAnnonce: number | null; chargesAnnonce: number | null },
  lot: { nom: string; adresse: string; codePostal: string; ville: string } | null,
  lien: string,
  expediteur: string | null,
): { objet: string; corps: string } {
  const caution = d.role === "GARANT";
  const loyer = (candidature.loyerAnnonce ?? 0) + (candidature.chargesAnnonce ?? 0);
  const lignes = [
    `Bonjour ${d.personneMorale ? (d.raisonSociale ?? d.nom) : formuleAppel([d])},`,
    "",
    caution
      ? "Vous avez été désigné comme caution pour une candidature à la location. Pour que le dossier soit complet, merci de renseigner vos informations et de déposer vos justificatifs depuis votre espace personnel."
      : "Votre dossier de candidature à la location est ouvert. Renseignez vos informations, déposez vos justificatifs et remettez votre dossier depuis votre espace personnel.",
    ...(lot ? ["", `Logement concerné : ${lot.nom} — ${adresseSurUneLigne(lot)}`] : []),
    ...(loyer > 0 ? [`Loyer charges comprises : ${formatEuros(loyer)} par mois`] : []),
    "",
    "Pour y accéder, ouvrez ce lien personnel (ne le transmettez à personne) :",
    lien,
    "",
    "Seules les pièces autorisées par le décret du 5 novembre 2015 vous sont demandées. Ne transmettez jamais de relevé de compte bancaire, de carte Vitale ni d'autorisation de prélèvement : ces documents ne peuvent pas être exigés.",
    "",
    "Cordialement,",
    expediteur || "Votre bailleur",
  ];
  return { objet: caution ? "Votre dossier de caution" : "Votre dossier de candidature à la location", corps: lignes.join("\n") };
}

/** Suite donnée à la candidature. */
export function emailDecisionCandidature(
  d: { civilite: string | null; nom: string; prenom: string | null; raisonSociale: string | null; personneMorale: boolean },
  lot: { nom: string; adresse: string; codePostal: string; ville: string } | null,
  acceptee: boolean,
  motif: string | null,
  expediteur: string | null,
): { objet: string; corps: string } {
  const logement = lot ? `${lot.nom} — ${adresseSurUneLigne(lot)}` : "le logement";
  const lignes = [
    `Bonjour ${d.personneMorale ? (d.raisonSociale ?? d.nom) : formuleAppel([d])},`,
    "",
    acceptee
      ? `Votre candidature pour ${logement} est retenue. Nous revenons vers vous pour organiser la signature du bail et l'état des lieux d'entrée.`
      : `Votre candidature pour ${logement} n'a pas été retenue.`,
    ...(!acceptee && motif ? ["", `Motif : ${motif}`] : []),
    ...(acceptee ? [] : ["", "Les pièces de votre dossier seront détruites une fois le logement attribué. Nous vous remercions de l'intérêt porté à ce bien."]),
    "",
    "Cordialement,",
    expediteur || "Votre bailleur",
  ];
  return { objet: acceptee ? "Votre candidature est retenue" : "Suite donnée à votre candidature", corps: lignes.join("\n") };
}

/** Lien d'accès à l'espace propriétaire (bailleur). */
export function emailAccesBailleur(b: { nom: string; representant: string | null }, lien: string, expediteur: string | null): { objet: string; corps: string } {
  const lignes = [
    `Bonjour${b.representant ? ` ${b.representant}` : ""},`,
    "",
    `Votre espace propriétaire${b.representant ? ` (${b.nom})` : ""} est ouvert : vous y suivez vos biens, les baux en cours, les loyers encaissés et en retard, les dépenses et la synthèse annuelle.`,
    "",
    "Pour y accéder, ouvrez ce lien personnel (ne le transmettez à personne) :",
    lien,
    "",
    "Conservez cet email : le lien reste valable tant qu'il n'est pas révoqué par votre gestionnaire.",
    "",
    "Cordialement,",
    expediteur || "Votre gestionnaire",
  ];
  return { objet: "Votre espace propriétaire", corps: lignes.join("\n") };
}

/** Invitation d'un utilisateur à choisir son mot de passe. */
export function emailInvitationUtilisateur(nom: string, lien: string, invitePar: string, entites: string[]): { objet: string; corps: string } {
  const lignes = [
    `Bonjour ${nom},`,
    "",
    `${invitePar} vous a ouvert un accès à OMNIUP Location, l'application de gestion locative${entites.length ? ` (${entites.join(", ")})` : ""}.`,
    "",
    "Pour choisir votre mot de passe et vous connecter, ouvrez ce lien (valable 7 jours) :",
    lien,
    "",
    "Si vous n'attendiez pas cet accès, ignorez simplement cet email.",
    "",
    "Cordialement,",
    "OMNIUP Location",
  ];
  return { objet: "Votre accès à OMNIUP Location", corps: lignes.join("\n") };
}

/** Réinitialisation du mot de passe d'un utilisateur. */
export function emailReinitialisationMotDePasse(nom: string, lien: string): { objet: string; corps: string } {
  const lignes = [
    `Bonjour ${nom},`,
    "",
    "Une réinitialisation de votre mot de passe OMNIUP Location a été demandée. Pour en choisir un nouveau, ouvrez ce lien (valable 2 heures) :",
    lien,
    "",
    "Si vous n'êtes pas à l'origine de cette demande, ignorez cet email : votre mot de passe reste inchangé.",
    "",
    "Cordialement,",
    "OMNIUP Location",
  ];
  return { objet: "Réinitialisation de votre mot de passe", corps: lignes.join("\n") };
}
