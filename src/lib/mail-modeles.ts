import { formatDate, formatPeriode } from "./dates";
import { formatEuros } from "./montants";
import { adresseSurUneLigne } from "./libelles";
import { formuleAppel } from "./locataires";
import { numeroAppel } from "./loyers";
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
    `Veuillez trouver ci-joint l'avis d'échéance n° ${numeroAppel(a.id)} de votre loyer pour ${formatPeriode(a.periode).toLowerCase()}, concernant le logement situé ${adresseSurUneLigne(bail.lot)}.`,
    "",
    `Montant à régler : ${formatEuros(a.total)}${a.charges > 0 ? ` (loyer ${formatEuros(a.loyer)} + charges ${formatEuros(a.charges)})` : ""}, à payer au plus tard le ${formatDate(a.dateEcheance)}.`,
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
      ? `Nous accusons réception de votre paiement${dernier ? ` du ${formatDate(dernier.date)}` : ""} et vous prions de trouver ci-joint la quittance de loyer pour ${formatPeriode(a.periode).toLowerCase()} (${formatEuros(a.total)}), concernant le logement situé ${adresseSurUneLigne(bail.lot)}.`
      : `Nous accusons réception de votre paiement partiel${dernier ? ` du ${formatDate(dernier.date)}` : ""} et vous prions de trouver ci-joint le reçu correspondant pour ${formatPeriode(a.periode).toLowerCase()}, concernant le logement situé ${adresseSurUneLigne(bail.lot)}.`,
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
