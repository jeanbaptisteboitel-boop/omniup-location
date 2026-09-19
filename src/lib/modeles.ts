/**
 * Modèles de documents : variables disponibles et remplissage.
 * Le contenu d'un modèle est un texte structuré (« # », « ## », « - ») contenant des variables {{cle}}.
 */

export type ContexteModele = Record<string, string>;

export const VARIABLES_MODELE: { cle: string; description: string }[] = [
  { cle: "entite.nom", description: "Nom de l'entité de travail" },
  { cle: "date.jour", description: "Date du jour en toutes lettres" },
  { cle: "bailleur.nom", description: "Nom ou dénomination du bailleur" },
  { cle: "bailleur.qualite", description: "Personne physique ou société" },
  { cle: "bailleur.representant", description: "Représentant du bailleur (société)" },
  { cle: "bailleur.adresse", description: "Adresse complète du bailleur" },
  { cle: "bailleur.email", description: "Email du bailleur" },
  { cle: "bailleur.telephone", description: "Téléphone du bailleur" },
  { cle: "bailleur.siren", description: "SIREN du bailleur" },
  { cle: "bailleur.iban", description: "IBAN du bailleur" },
  { cle: "locataire.nomComplet", description: "Civilité, prénom et nom du ou des locataires (« A et B » en colocation)" },
  { cle: "locataire.identification", description: "Identité complète de chaque locataire : nom, date de naissance, domicile, email, téléphone" },
  { cle: "locataire.dateNaissance", description: "Date de naissance du locataire (par locataire s'ils sont plusieurs)" },
  { cle: "locataire.adresse", description: "Adresse actuelle du locataire (par locataire si elles diffèrent)" },
  { cle: "locataire.email", description: "Email du ou des locataires" },
  { cle: "locataire.telephone", description: "Téléphone du ou des locataires" },
  { cle: "lot.designation", description: "Désignation du lot" },
  { cle: "lot.type", description: "Appartement ou maison" },
  { cle: "lot.adresse", description: "Adresse complète du logement" },
  { cle: "lot.surface", description: "Surface habitable en m²" },
  { cle: "lot.pieces", description: "Nombre de pièces principales" },
  { cle: "lot.etage", description: "Étage" },
  { cle: "lot.meuble", description: "« meublé » ou « non meublé »" },
  { cle: "lot.description", description: "Description et équipements du lot" },
  { cle: "bail.type", description: "Type de bail" },
  { cle: "bail.dateDebut", description: "Date de prise d'effet" },
  { cle: "bail.dateFin", description: "Date de fin" },
  { cle: "bail.dureeMois", description: "Durée en mois" },
  { cle: "bail.loyerHC", description: "Loyer mensuel hors charges" },
  { cle: "bail.loyerHCLettres", description: "Loyer hors charges en toutes lettres" },
  { cle: "bail.charges", description: "Charges mensuelles" },
  { cle: "bail.chargesRegime", description: "« forfait » ou « provision avec régularisation annuelle »" },
  { cle: "bail.totalMensuel", description: "Loyer charges comprises" },
  { cle: "bail.depotGarantie", description: "Dépôt de garantie" },
  { cle: "bail.depotGarantieLettres", description: "Dépôt de garantie en toutes lettres" },
  { cle: "bail.jourEcheance", description: "Jour de paiement du loyer" },
  { cle: "bail.irlTrimestre", description: "Trimestre de l'IRL de référence" },
  { cle: "bail.irlValeur", description: "Valeur de l'IRL de référence" },
  { cle: "bail.dateSignature", description: "Date de signature du bail" },
  { cle: "bail.motifMobilite", description: "Motif du bail mobilité" },
];

const VARIABLE = /\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g;

/** Remplace les variables par leur valeur ; une variable inconnue ou vide devient un champ à compléter. */
export function remplirModele(contenu: string, ctx: ContexteModele): string {
  return contenu.replace(VARIABLE, (_, cle: string) => {
    const v = ctx[cle];
    if (v !== undefined && v !== "") return v;
    const description = VARIABLES_MODELE.find((x) => x.cle === cle)?.description ?? cle;
    return `[À COMPLÉTER : ${description}]`;
  });
}

/** Variables présentes dans un contenu. */
export function variablesUtilisees(contenu: string): string[] {
  return Array.from(new Set(Array.from(contenu.matchAll(VARIABLE), (m) => m[1])));
}

export type ModeleDefaut = {
  code: string;
  nom: string;
  categorie: "BAIL" | "AVENANT" | "RENOUVELLEMENT" | "RESILIATION" | "CAUTION" | "CONVENTION" | "AUTRE";
  description: string;
  contenu: string;
};
