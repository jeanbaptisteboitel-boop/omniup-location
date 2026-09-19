import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { entiteCourante } from "./entite";
import { type ContexteModele } from "./modeles";
import { MODELES_DEFAUT } from "./modeles-defaut";
import { TYPES_BAIL, TYPES_LOT, TYPES_PERSONNE, adresseSurUneLigne } from "./libelles";
import { identificationLocataires, includeLocataires, nomsLocataires, valeurParLocataire } from "./locataires";
import { aujourdhui, formatDate, formatDateLongue } from "./dates";
import { formatEuros, formatNombre, montantEnLettres } from "./montants";
import { dureeEnMois } from "./bail-regles";

/** Crée les modèles par défaut manquants (les modèles déjà présents, même modifiés, sont conservés). */
export async function initialiserModelesDefaut(): Promise<void> {
  const existants = await prisma.modeleDocument.findMany({ where: { code: { not: null } }, select: { code: true } });
  const codes = new Set(existants.map((m) => m.code));
  const manquants = MODELES_DEFAUT.filter((m) => !codes.has(m.code));
  if (manquants.length === 0) return;
  await prisma.modeleDocument.createMany({
    data: manquants.map((m) => ({ code: m.code, nom: m.nom, categorie: m.categorie, description: m.description, contenu: m.contenu, parDefaut: true })),
    skipDuplicates: true,
  });
}

export const includeBailPourModele = { lot: { include: { bailleur: true } }, locataires: includeLocataires } satisfies Prisma.BailInclude;
export type BailPourModele = Prisma.BailGetPayload<{ include: typeof includeBailPourModele }>;

/** Variables disponibles sans bail (entité et date). */
export async function contexteBase(): Promise<ContexteModele> {
  const entite = await entiteCourante();
  return { "entite.nom": entite.nom, "date.jour": formatDateLongue(aujourdhui()) };
}

/** Variables issues d'un bail (bailleur, locataire, lot, conditions). */
export async function contexteDepuisBail(bail: BailPourModele): Promise<ContexteModele> {
  const base = await contexteBase();
  const b = bail.lot.bailleur;
  const ls = bail.locataires;
  const lot = bail.lot;
  const ctx: ContexteModele = {
    ...base,
    "bailleur.nom": b?.nom ?? "",
    "bailleur.qualite": b ? TYPES_PERSONNE[b.typePersonne].toLowerCase() : "",
    "bailleur.representant": b?.representant ? `représenté(e) par ${b.representant}` : "",
    "bailleur.adresse": b ? adresseSurUneLigne(b) : "",
    "bailleur.email": b?.email ?? "",
    "bailleur.telephone": b?.telephone ?? "",
    "bailleur.siren": b?.siren ?? "",
    "bailleur.iban": b?.iban ?? "",
    "locataire.nomComplet": nomsLocataires(ls),
    "locataire.identification": identificationLocataires(ls),
    "locataire.dateNaissance": valeurParLocataire(ls, (l) => formatDate(l.dateNaissance)),
    "locataire.adresse": valeurParLocataire(ls, (l) => adresseSurUneLigne(l)),
    "locataire.email": ls.map((l) => l.email ?? "").filter(Boolean).join(", "),
    "locataire.telephone": ls.map((l) => l.telephone ?? "").filter(Boolean).join(", "),
    "lot.designation": lot.nom,
    "lot.type": TYPES_LOT[lot.type].toLowerCase(),
    "lot.adresse": adresseSurUneLigne(lot),
    "lot.surface": lot.surface ? formatNombre(lot.surface, lot.surface % 1 === 0 ? 0 : 2) : "",
    "lot.pieces": lot.nbPieces ? String(lot.nbPieces) : "",
    "lot.etage": lot.etage ?? "",
    "lot.meuble": lot.meuble ? "meublé" : "non meublé",
    "lot.description": lot.description ?? "",
    "bail.type": TYPES_BAIL[bail.type],
    "bail.dateDebut": formatDate(bail.dateDebut),
    "bail.dateFin": formatDate(bail.dateFin),
    "bail.dureeMois": String(dureeEnMois(bail.dateDebut, bail.dateFin)),
    "bail.loyerHC": formatEuros(bail.loyerHC),
    "bail.loyerHCLettres": montantEnLettres(bail.loyerHC),
    "bail.charges": formatEuros(bail.charges),
    "bail.chargesRegime": bail.chargesForfait ? "forfait" : "provision avec régularisation annuelle",
    "bail.totalMensuel": formatEuros(bail.loyerHC + bail.charges),
    "bail.depotGarantie": bail.depotGarantie > 0 ? formatEuros(bail.depotGarantie) : "aucun dépôt de garantie",
    "bail.depotGarantieLettres": bail.depotGarantie > 0 ? montantEnLettres(bail.depotGarantie) : "zéro euro",
    "bail.jourEcheance": String(bail.jourEcheance),
    "bail.irlTrimestre": bail.irlTrimestre ?? "",
    "bail.irlValeur": bail.irlValeur !== null ? String(bail.irlValeur).replace(".", ",") : "",
    "bail.dateSignature": formatDate(bail.dateSignature),
    "bail.motifMobilite": bail.motifMobilite ?? "",
  };
  return ctx;
}
