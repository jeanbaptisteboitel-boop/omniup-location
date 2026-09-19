import "server-only";
import { prisma } from "./prisma";
import { TYPES_BAIL, TYPES_LOT, TYPES_PERSONNE, adresseSurUneLigne, nomComplet } from "./libelles";
import { includeLocataires } from "./locataires";
import { REGLES_BAIL, dureeEnMois } from "./bail-regles";
import { libelleTaux, montantsMensuels, usageHabitation } from "./tva";
import { formatDate, formatDateLongue } from "./dates";
import { formatEuros, formatNombre } from "./montants";
import { entiteCouranteId } from "@/lib/entite";

/** Fiche d'information d'un bail, en texte, pour les prompts de rédaction. */
export async function ficheBail(bailId: number): Promise<{ fiche: string; bail: NonNullable<Awaited<ReturnType<typeof chargerBail>>> }> {
  const bail = await chargerBail(bailId);
  if (!bail) throw new Error("Bail introuvable.");
  const { lot, locataires } = bail;
  const bailleur = lot.bailleur;
  const regle = REGLES_BAIL[bail.type];
  const lignes: (string | null)[] = [
    "## BAILLEUR",
    bailleur
      ? [
          `Nom / dénomination : ${bailleur.nom}`,
          `Qualité : ${TYPES_PERSONNE[bailleur.typePersonne]}${bailleur.siren ? ` — SIREN ${bailleur.siren}` : ""}`,
          bailleur.representant ? `Représentée par : ${bailleur.representant}` : null,
          `Adresse : ${adresseSurUneLigne(bailleur)}`,
          bailleur.email ? `Email : ${bailleur.email}` : null,
          bailleur.telephone ? `Téléphone : ${bailleur.telephone}` : null,
          bailleur.iban ? `IBAN pour le paiement du loyer : ${bailleur.iban}${bailleur.bic ? ` (BIC ${bailleur.bic})` : ""}` : null,
        ]
          .filter(Boolean)
          .join("\n")
      : "[À COMPLÉTER : identité et adresse du bailleur — non renseignées dans l'application]",
    "",
    locataires.length > 1 ? "## LOCATAIRES" : "## LOCATAIRE",
    locataires.length > 1 ? `${locataires.length} locataires titulaires du bail (couple ou colocation) : les désigner tous comme parties, tenus solidairement et indivisiblement.` : null,
    ...locataires.flatMap((locataire, i) => [
      locataires.length > 1 ? `### Locataire ${i + 1}` : null,
      `Nom : ${nomComplet(locataire)}`,
      locataire.dateNaissance ? `Date de naissance : ${formatDate(locataire.dateNaissance)}` : null,
      adresseSurUneLigne(locataire) ? `Adresse actuelle : ${adresseSurUneLigne(locataire)}` : null,
      locataire.email ? `Email : ${locataire.email}` : null,
      locataire.telephone ? `Téléphone : ${locataire.telephone}` : null,
    ]),
    "",
    "## LOGEMENT",
    `Désignation : ${lot.nom}`,
    `Type : ${TYPES_LOT[lot.type]}${lot.etage ? `, ${lot.etage}` : ""}${lot.meuble ? ", meublé" : ", non meublé"}`,
    `Adresse : ${adresseSurUneLigne(lot)}`,
    lot.surface ? `Surface habitable : ${formatNombre(lot.surface, lot.surface % 1 === 0 ? 0 : 2)} m²` : "Surface habitable : [À COMPLÉTER]",
    lot.nbPieces ? `Nombre de pièces principales : ${lot.nbPieces}` : "Nombre de pièces principales : [À COMPLÉTER]",
    lot.immeuble ? `Immeuble : ${lot.immeuble.nom}` : null,
    lot.description ? `Description / équipements : ${lot.description}` : null,
    "",
    "## CONDITIONS DU BAIL",
    `Type de bail : ${TYPES_BAIL[bail.type]} (${regle.resume})`,
    bail.type === "MOBILITE" ? `Motif du bail mobilité : ${bail.motifMobilite ?? "[À COMPLÉTER]"}` : null,
    `Date de prise d'effet : ${formatDateLongue(bail.dateDebut)}`,
    `Date de fin : ${formatDateLongue(bail.dateFin)} (durée : ${dureeEnMois(bail.dateDebut, bail.dateFin)} mois)${regle.reconductionTacite ? ", avec reconduction tacite" : ", sans renouvellement possible"}`,
    `Loyer mensuel hors charges : ${formatEuros(bail.loyerHC)}`,
    bail.charges > 0 ? `Charges mensuelles : ${formatEuros(bail.charges)} (${bail.chargesForfait ? "forfait" : "provision sur charges avec régularisation annuelle"})` : "Charges : aucune",
    `Total mensuel : ${formatEuros(bail.loyerHC + bail.charges)}${bail.tauxTva > 0 ? " hors taxes" : ""}`,
    bail.tauxTva > 0
      ? `TVA : loyer et charges soumis à la TVA au taux de ${libelleTaux(bail.tauxTva)} (soit ${formatEuros(montantsMensuels(bail).tva)} par mois, total TTC ${formatEuros(montantsMensuels(bail).ttc)})`
      : usageHabitation(bail.type)
        ? "TVA : exonéré (location à usage d'habitation)"
        : "TVA : non soumis (le bailleur n'a pas opté)",
    `Paiement : mensuel, d'avance, le ${bail.jourEcheance} de chaque mois`,
    bail.depotGarantie > 0 ? `Dépôt de garantie : ${formatEuros(bail.depotGarantie)}` : "Dépôt de garantie : aucun",
    regle.revisionIRL
      ? bail.clauseRevision
        ? `Révision annuelle du loyer selon l'IRL : oui${bail.irlTrimestre ? ` — indice de référence ${bail.irlTrimestre}${bail.irlValeur ? ` : ${String(bail.irlValeur).replace(".", ",")}` : ""}` : " — indice de référence [À COMPLÉTER]"}`
        : "Révision annuelle du loyer : aucune clause"
      : "Révision du loyer : non applicable (bail mobilité)",
    bail.notes ? `Observations / clauses particulières souhaitées : ${bail.notes}` : null,
  ];
  return { fiche: lignes.filter((l): l is string => l !== null).join("\n"), bail };
}

async function chargerBail(id: number) {
  return prisma.bail.findFirst({
    where: { id, entiteId: await entiteCouranteId() },
    include: { lot: { include: { bailleur: true, immeuble: true } }, locataires: includeLocataires },
  });
}
