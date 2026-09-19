import "server-only";
import { aujourdhui, formatDate, formatDateLongue, formatPeriode } from "../dates";
import { formatEuros, montantEnLettres } from "../montants";
import { MODES_PAIEMENT, TYPES_LOT, adresseSurUneLigne } from "../libelles";
import { nomsLocataires } from "../locataires";
import { etatAppel, numeroAppel, numeroQuittance } from "../loyers";
import type { AppelComplet } from "./donnees";
import { GRIS, blocDestinataire, enTete, finaliser, lignesBailleur, lignesLocataire, nouveauDocument, paragraphe, tableauCles, tableauMontants, titreSection } from "./base";

function libelleCharges(chargesForfait: boolean): string {
  return chargesForfait ? "Forfait de charges" : "Provision sur charges";
}

/** Avis d'échéance (appel de loyer). */
export async function pdfAvisEcheance(appel: AppelComplet): Promise<Buffer> {
  const { bail } = appel;
  const bailleur = bail.lot.bailleur;
  const { doc, fini } = nouveauDocument(`Avis d'échéance ${numeroAppel(appel.id)}`);
  enTete(doc, lignesBailleur(bailleur), "AVIS D'ÉCHÉANCE", [`N° ${numeroAppel(appel.id)}`, `Émis le ${formatDate(appel.dateEmission)}`, `Période : ${formatPeriode(appel.periode)}`]);
  blocDestinataire(doc, lignesLocataire(bail.locataires, bail.lot));

  titreSection(doc, "Logement");
  tableauCles(doc, [
    ["Désignation", `${bail.lot.nom} (${TYPES_LOT[bail.lot.type].toLowerCase()}${bail.lot.meuble ? " meublé" : ""})`],
    ["Adresse", adresseSurUneLigne(bail.lot)],
    [bail.locataires.length > 1 ? "Locataires" : "Locataire", nomsLocataires(bail.locataires)],
  ]);

  titreSection(doc, "Échéance");
  tableauCles(doc, [
    ["Période", `du ${formatDate(appel.debutPeriode)} au ${formatDate(appel.finPeriode)}${appel.prorata ? " (prorata temporis)" : ""}`],
    ["Date d'échéance", formatDate(appel.dateEcheance)],
  ]);
  tableauMontants(doc, [
    { libelle: "Loyer hors charges", montant: formatEuros(appel.loyer) },
    ...(appel.charges > 0 || bail.charges > 0 ? [{ libelle: libelleCharges(bail.chargesForfait), montant: formatEuros(appel.charges) }] : []),
    { libelle: "TOTAL À PAYER", montant: formatEuros(appel.total), gras: true },
  ]);

  titreSection(doc, "Règlement");
  if (bailleur?.iban) {
    paragraphe(doc, `Par virement bancaire à l'ordre de ${bailleur.nom} :`);
    paragraphe(doc, `IBAN ${bailleur.iban}${bailleur.bic ? `  -  BIC ${bailleur.bic}` : ""}`, { gras: true });
    paragraphe(doc, `Référence à indiquer : ${numeroAppel(appel.id)} - ${formatPeriode(appel.periode)}`);
  } else {
    paragraphe(doc, "Selon les modalités prévues au contrat de location (virement, chèque ou prélèvement).");
  }
  doc.moveDown(1.5);
  paragraphe(doc, "Cet avis d'échéance ne vaut pas quittance. Une quittance vous sera délivrée après encaissement du paiement intégral (article 21 de la loi n° 89-462 du 6 juillet 1989).", { taille: 8.5, couleur: GRIS });
  return finaliser(doc, fini, `Avis d'échéance ${numeroAppel(appel.id)} - ${bailleur?.nom ?? ""}`);
}

/** Quittance de loyer (paiement intégral) ou reçu (paiement partiel). */
export async function pdfQuittance(appel: AppelComplet): Promise<Buffer> {
  const { bail } = appel;
  const bailleur = bail.lot.bailleur;
  const etat = etatAppel(appel, aujourdhui());
  const integral = etat.statut === "PAYE";
  const titre = integral ? "QUITTANCE DE LOYER" : "REÇU DE PAIEMENT PARTIEL";
  const numero = integral ? numeroQuittance(appel.id) : `R-${String(appel.id).padStart(6, "0")}`;
  const dernierPaiement = appel.paiements[appel.paiements.length - 1];
  const dateDoc = dernierPaiement?.date ?? aujourdhui();

  const { doc, fini } = nouveauDocument(`${titre} ${numero}`);
  enTete(doc, lignesBailleur(bailleur), titre, [`N° ${numero}`, `Période : ${formatPeriode(appel.periode)}`, `Établie le ${formatDate(dateDoc)}`]);
  blocDestinataire(doc, lignesLocataire(bail.locataires, bail.lot));
  const locataires = nomsLocataires(bail.locataires);
  const pronom = bail.locataires.length > 1 ? "leur" : "lui";

  const qui = bailleur
    ? bailleur.typePersonne === "MORALE"
      ? `La société ${bailleur.nom}${bailleur.representant ? `, représentée par ${bailleur.representant}` : ""}, propriétaire`
      : `Je soussigné(e) ${bailleur.nom}, propriétaire`
    : "[Bailleur non renseigné], propriétaire";
  const logement = `du logement situé ${adresseSurUneLigne(bail.lot)} (${bail.lot.nom})`;
  const periode = `pour la période du ${formatDate(appel.debutPeriode)} au ${formatDate(appel.finPeriode)}`;

  if (integral) {
    paragraphe(
      doc,
      `${qui} ${logement}, déclare avoir reçu de ${locataires} la somme de ${montantEnLettres(etat.regle)} (${formatEuros(etat.regle)}) au titre du paiement du loyer et des charges ${periode}, et ${pronom} en donne quittance, sous réserve de tous mes droits.`,
      { align: "justify" },
    );
  } else {
    paragraphe(
      doc,
      `${qui} ${logement}, déclare avoir reçu de ${locataires} la somme de ${montantEnLettres(etat.regle)} (${formatEuros(etat.regle)}) en règlement partiel du loyer et des charges ${periode}. Il reste dû la somme de ${formatEuros(etat.reste)}. Le présent reçu ne vaut pas quittance.`,
      { align: "justify" },
    );
  }

  titreSection(doc, "Détail");
  tableauMontants(doc, [
    { libelle: "Loyer hors charges", montant: formatEuros(appel.loyer) },
    ...(appel.charges > 0 || bail.charges > 0 ? [{ libelle: libelleCharges(bail.chargesForfait), montant: formatEuros(appel.charges) }] : []),
    { libelle: "Total de l'échéance", montant: formatEuros(appel.total), gras: true },
    ...appel.paiements.map((p) => ({ libelle: `Paiement du ${formatDate(p.date)} - ${MODES_PAIEMENT[p.mode]}${p.reference ? ` (${p.reference})` : ""}`, montant: formatEuros(p.montant) })),
    ...(integral ? [] : [{ libelle: "Reste dû", montant: formatEuros(etat.reste), gras: true }]),
  ]);

  doc.moveDown(1);
  paragraphe(doc, `Fait à ${bailleur?.ville ?? "[ville]"}, le ${formatDateLongue(dateDoc)}.`);
  doc.moveDown(2);
  paragraphe(doc, "Le bailleur", { gras: true });
  paragraphe(doc, bailleur?.representant ?? bailleur?.nom ?? "");
  doc.moveDown(3);
  paragraphe(
    doc,
    integral
      ? "Quittance délivrée en application de l'article 21 de la loi n° 89-462 du 6 juillet 1989. Elle annule tous les reçus établis pour acomptes versés sur la période et n'emporte pas présomption de paiement des termes antérieurs."
      : "Reçu établi en application de l'article 21 de la loi n° 89-462 du 6 juillet 1989 : le bailleur remet un reçu pour tout paiement partiel.",
    { taille: 8.5, couleur: GRIS },
  );
  return finaliser(doc, fini, `${integral ? "Quittance" : "Reçu"} ${numero} - ${bailleur?.nom ?? ""}`);
}
