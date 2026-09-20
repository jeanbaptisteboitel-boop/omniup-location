import "server-only";
import type { AttestationAssurance, Bail, Bailleur, Locataire, Lot, RetenueDepot } from "@prisma/client";
import { aujourdhui, formatDate, formatDateLongue } from "../dates";
import { formatEuros } from "../montants";
import { MODES_PAIEMENT, TYPES_LOT, adresseSurUneLigne } from "../libelles";
import { nomsLocataires } from "../locataires";
import { dateLimiteRestitution, delaiRestitutionMois, majorationRetard, soldeDepot } from "../sortie-bail";
import { usageHabitation } from "../tva";
import { GRIS, blocDestinataire, enTete, finaliser, lignesBailleur, lignesLocataire, nouveauDocument, paragraphe, tableauCles, tableauMontants, titreSection } from "./base";

export type BailSortie = Bail & { lot: Lot & { bailleur: Bailleur | null }; locataires: Locataire[]; retenuesDepot: RetenueDepot[]; assurances?: AttestationAssurance[] };

/**
 * Décompte de restitution du dépôt de garantie remis au locataire à son départ
 * (article 22 de la loi du 6 juillet 1989 pour les locations d'habitation).
 */
export async function pdfRestitutionDepot(bail: BailSortie, impayes: number): Promise<Buffer> {
  const bailleur = bail.lot.bailleur;
  const solde = soldeDepot(bail, bail.retenuesDepot, impayes);
  const depart = bail.dateFinEffective ?? bail.congeDateDepart ?? bail.dateFin;
  const limite = dateLimiteRestitution(depart, bail.etatLieuxConforme);
  const dateDoc = bail.depotRestitueLe ?? aujourdhui();
  const majoration = majorationRetard(solde.restituable, bail.loyerHC, limite, dateDoc);
  const habitation = usageHabitation(bail.type);

  const { doc, fini } = nouveauDocument(`Restitution du dépôt de garantie - ${bail.lot.nom}`);
  enTete(doc, lignesBailleur(bailleur), "DÉPÔT DE GARANTIE", [`Bail n° ${bail.id}`, `Départ le ${formatDate(depart)}`, `Établi le ${formatDate(dateDoc)}`]);
  blocDestinataire(doc, lignesLocataire(bail.locataires, bail.lot));
  paragraphe(doc, `Objet : décompte de restitution du dépôt de garantie${bail.depotRestitueLe ? "" : " (projet)"}`, { gras: true });
  doc.moveDown(0.8);

  titreSection(doc, habitation ? "Logement" : "Local");
  tableauCles(doc, [
    ["Désignation", `${bail.lot.nom} (${TYPES_LOT[bail.lot.type].toLowerCase()})`],
    ["Adresse", adresseSurUneLigne(bail.lot)],
    [bail.locataires.length > 1 ? "Locataires" : "Locataire", nomsLocataires(bail.locataires)],
    ["Période de location", `du ${formatDate(bail.dateDebut)} au ${formatDate(depart)}`],
    ["État des lieux de sortie", bail.etatLieuxSortieLe ? `${formatDate(bail.etatLieuxSortieLe)} · ${bail.etatLieuxConforme === false ? "non conforme à l'entrée" : "conforme à l'entrée"}` : "non réalisé"],
  ]);

  titreSection(doc, "Décompte");
  tableauMontants(doc, [
    { libelle: `Dépôt de garantie versé${bail.depotRecuLe ? ` le ${formatDate(bail.depotRecuLe)}` : ""}`, montant: formatEuros(solde.recu) },
    ...bail.retenuesDepot.map((r) => ({ libelle: `Retenue : ${r.libelle}`, montant: `- ${formatEuros(r.montant)}` })),
    ...(solde.impayes > 0 ? [{ libelle: "Sommes restant dues au titre du bail (loyers, charges, régularisations)", montant: `- ${formatEuros(solde.impayes)}` }] : []),
    ...(majoration > 0 ? [{ libelle: `Majoration pour restitution tardive (10 % du loyer mensuel par mois de retard commencé)`, montant: `+ ${formatEuros(majoration)}` }] : []),
    solde.resteDuParLocataire > 0
      ? { libelle: "SOLDE RESTANT DÛ PAR LE LOCATAIRE", montant: formatEuros(solde.resteDuParLocataire), gras: true }
      : { libelle: "SOLDE RESTITUÉ AU LOCATAIRE", montant: formatEuros(solde.restituable + majoration), gras: true },
  ]);

  if (bail.depotRestitueLe) {
    paragraphe(doc, `Somme versée le ${formatDate(bail.depotRestitueLe)}${bail.depotRestitueMode ? ` par ${MODES_PAIEMENT[bail.depotRestitueMode].toLowerCase()}` : ""} : ${formatEuros(bail.depotRestitueMontant ?? 0)}.`, { gras: true });
  } else if (solde.resteDuParLocataire === 0) {
    paragraphe(doc, `Cette somme vous sera versée au plus tard le ${formatDate(limite)}, soit ${delaiRestitutionMois(bail.etatLieuxConforme)} mois après la remise des clés.`);
  }
  doc.moveDown(0.5);
  if (bail.retenuesDepot.length > 0) {
    paragraphe(doc, "Les retenues ci-dessus sont justifiées par l'état des lieux de sortie comparé à celui d'entrée et par les pièces jointes (devis, factures ou constat).", { taille: 9 });
  }
  doc.moveDown(1);
  paragraphe(doc, `Fait à ${bailleur?.ville ?? "[ville]"}, le ${formatDateLongue(dateDoc)}.`);
  doc.moveDown(2);
  paragraphe(doc, "Le bailleur", { gras: true });
  paragraphe(doc, bailleur?.representant ?? bailleur?.nom ?? "");
  doc.moveDown(2.5);
  paragraphe(
    doc,
    habitation
      ? "Décompte établi en application de l'article 22 de la loi n° 89-462 du 6 juillet 1989 : le dépôt de garantie est restitué dans un délai d'un mois à compter de la remise des clés lorsque l'état des lieux de sortie est conforme à celui d'entrée, de deux mois dans le cas contraire. À défaut, le solde restant dû au locataire est majoré de 10 % du loyer mensuel hors charges par mois de retard commencé. En immeuble collectif, le bailleur peut conserver une provision de 20 % au maximum jusqu'à l'arrêté annuel des comptes de la copropriété."
      : "Décompte établi selon les stipulations du bail : le dépôt de garantie est restitué après déduction des sommes restant dues au bailleur et du coût des réparations locatives constatées à la sortie.",
    { taille: 8.5, couleur: GRIS },
  );
  return finaliser(doc, fini, `Restitution du dépôt de garantie - ${bail.lot.nom}`);
}
