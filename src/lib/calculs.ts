/**
 * Calculatrices : pourcentages de loyer, frais de notaire, emprunt, prêt in fine, révision de loyer, rentabilité.
 * Fonctions pures (testées), utilisables côté navigateur comme côté serveur.
 */
import { arrondir2 } from "./montants";

// ---------------------------------------------------------------------------
// Pourcentages
// ---------------------------------------------------------------------------

/** Variation en % entre deux montants. */
export function variationPourcentage(ancien: number, nouveau: number): number {
  if (ancien === 0) return 0;
  return arrondir2(((nouveau - ancien) / ancien) * 100);
}

/** Montant après application d'un pourcentage (positif ou négatif). */
export function appliquerPourcentage(montant: number, pourcentage: number): number {
  return arrondir2(montant * (1 + pourcentage / 100));
}

/** Taux d'effort : part du loyer charges comprises dans les revenus mensuels nets. */
export function tauxEffort(loyerChargesComprises: number, revenusMensuels: number): number {
  if (revenusMensuels <= 0) return 0;
  return arrondir2((loyerChargesComprises / revenusMensuels) * 100);
}

/** Loyer maximal pour respecter un taux d'effort donné (33 % par défaut). */
export function loyerMaximal(revenusMensuels: number, tauxEffortPct = 33): number {
  return arrondir2(revenusMensuels * (tauxEffortPct / 100));
}

/** Part d'un montant (ex. : quote-part de charges d'un lot) en %. */
export function partEnPourcentage(partie: number, total: number): number {
  if (total === 0) return 0;
  return arrondir2((partie / total) * 100);
}

// ---------------------------------------------------------------------------
// Frais de notaire (estimation)
// ---------------------------------------------------------------------------

export type ParametresNotaire = {
  prix: number;
  /** Logement neuf (VEFA ou moins de 5 ans, première mutation) : droits réduits. */
  neuf?: boolean;
  /** Taux de la taxe départementale : 4,5 % (standard), 5 % (majoré 2025-2028 dans certains départements), 3,8 % (Indre, Morbihan, Mayotte). */
  tauxDepartemental?: number;
  /** Frais divers et formalités (état hypothécaire, cadastre, copies…). */
  debours?: number;
  /** Prix du mobilier laissé dans le bien (non soumis aux droits). */
  mobilier?: number;
};

export type FraisNotaire = {
  base: number;
  droitsMutation: number;
  emoluments: number;
  tvaEmoluments: number;
  contributionSecurite: number;
  debours: number;
  total: number;
  pourcentage: number;
};

/** Émoluments proportionnels du notaire (barème par tranches, arrêté du 28 février 2020). */
export function emolumentsNotaire(prix: number): number {
  const tranches: [number, number, number][] = [
    [0, 6500, 3.87],
    [6500, 17000, 1.596],
    [17000, 60000, 1.064],
    [60000, Infinity, 0.799],
  ];
  let total = 0;
  for (const [bas, haut, taux] of tranches) {
    if (prix <= bas) break;
    total += (Math.min(prix, haut) - bas) * (taux / 100);
  }
  return arrondir2(total);
}

/** Estimation des « frais de notaire » (droits de mutation, émoluments TTC, contribution de sécurité immobilière, débours). */
export function fraisNotaire(p: ParametresNotaire): FraisNotaire {
  const base = Math.max(0, p.prix - (p.mobilier ?? 0));
  const tauxDep = p.tauxDepartemental ?? 4.5;
  // Ancien : taxe départementale + 2,37 % de frais d'assiette sur celle-ci + taxe communale 1,20 %. Neuf : taxe de publicité foncière 0,715 %.
  const tauxDroits = p.neuf ? 0.715 : tauxDep * 1.0237 + 1.2;
  const droitsMutation = arrondir2(base * (tauxDroits / 100));
  const emoluments = emolumentsNotaire(base);
  const tvaEmoluments = arrondir2(emoluments * 0.2);
  const contributionSecurite = arrondir2(base * 0.001);
  const debours = arrondir2(p.debours ?? 1000);
  const total = arrondir2(droitsMutation + emoluments + tvaEmoluments + contributionSecurite + debours);
  return { base, droitsMutation, emoluments, tvaEmoluments, contributionSecurite, debours, total, pourcentage: base > 0 ? arrondir2((total / base) * 100) : 0 };
}

// ---------------------------------------------------------------------------
// Emprunt
// ---------------------------------------------------------------------------

/** Mensualité constante hors assurance. */
export function mensualite(capital: number, tauxAnnuelPct: number, dureeMois: number): number {
  if (capital <= 0 || dureeMois <= 0) return 0;
  const t = tauxAnnuelPct / 100 / 12;
  if (t === 0) return arrondir2(capital / dureeMois);
  return arrondir2((capital * t) / (1 - Math.pow(1 + t, -dureeMois)));
}

/** Capital empruntable pour une mensualité donnée. */
export function capitalPourMensualite(mensualiteMax: number, tauxAnnuelPct: number, dureeMois: number): number {
  if (mensualiteMax <= 0 || dureeMois <= 0) return 0;
  const t = tauxAnnuelPct / 100 / 12;
  if (t === 0) return arrondir2(mensualiteMax * dureeMois);
  return arrondir2((mensualiteMax * (1 - Math.pow(1 + t, -dureeMois))) / t);
}

export type CoutCredit = {
  mensualite: number;
  assuranceMensuelle: number;
  mensualiteTotale: number;
  totalInterets: number;
  totalAssurance: number;
  coutTotal: number;
  montantTotalRembourse: number;
};

/** Coût total d'un prêt amortissable (assurance exprimée en % du capital initial par an, ou en € par mois). */
export function coutCredit(capital: number, tauxAnnuelPct: number, dureeMois: number, assurance: { tauxAnnuelPct?: number; mensuelle?: number } = {}): CoutCredit {
  const m = mensualite(capital, tauxAnnuelPct, dureeMois);
  const assuranceMensuelle = arrondir2(assurance.mensuelle ?? (assurance.tauxAnnuelPct ? (capital * assurance.tauxAnnuelPct) / 100 / 12 : 0));
  const totalInterets = arrondir2(m * dureeMois - capital);
  const totalAssurance = arrondir2(assuranceMensuelle * dureeMois);
  return {
    mensualite: m,
    assuranceMensuelle,
    mensualiteTotale: arrondir2(m + assuranceMensuelle),
    totalInterets,
    totalAssurance,
    coutTotal: arrondir2(totalInterets + totalAssurance),
    montantTotalRembourse: arrondir2(capital + totalInterets + totalAssurance),
  };
}

export type CapaciteEmprunt = {
  mensualiteMax: number;
  capital: number;
  coutTotal: number;
  tauxEndettementPct: number;
};

/** Capacité d'emprunt à partir des revenus et du taux d'endettement maximal (35 % assurance comprise, norme HCSF). */
export function capaciteEmprunt(p: { revenusMensuels: number; chargesMensuelles?: number; tauxEndettementPct?: number; tauxAnnuelPct: number; dureeMois: number; assuranceTauxAnnuelPct?: number }): CapaciteEmprunt {
  const tauxEndettement = p.tauxEndettementPct ?? 35;
  const mensualiteMax = Math.max(0, arrondir2(p.revenusMensuels * (tauxEndettement / 100) - (p.chargesMensuelles ?? 0)));
  // La mensualité maximale inclut l'assurance : on résout capital × (facteur + assurance mensuelle par € emprunté) = mensualité.
  const t = p.tauxAnnuelPct / 100 / 12;
  const facteur = t === 0 ? 1 / p.dureeMois : t / (1 - Math.pow(1 + t, -p.dureeMois));
  const assuranceParEuro = (p.assuranceTauxAnnuelPct ?? 0) / 100 / 12;
  const capital = p.dureeMois > 0 ? arrondir2(mensualiteMax / (facteur + assuranceParEuro)) : 0;
  const cout = coutCredit(capital, p.tauxAnnuelPct, p.dureeMois, { tauxAnnuelPct: p.assuranceTauxAnnuelPct });
  return { mensualiteMax, capital, coutTotal: cout.coutTotal, tauxEndettementPct: tauxEndettement };
}

export type PretInFine = {
  interetsMensuels: number;
  assuranceMensuelle: number;
  mensualite: number;
  totalInterets: number;
  totalAssurance: number;
  coutTotal: number;
  capitalARembourser: number;
  epargneMensuelleNecessaire: number;
};

/** Prêt in fine : intérêts seuls chaque mois, capital remboursé en une fois au terme. */
export function pretInFine(capital: number, tauxAnnuelPct: number, dureeMois: number, assuranceMensuelle = 0, tauxEpargnePct = 0): PretInFine {
  const interetsMensuels = arrondir2((capital * tauxAnnuelPct) / 100 / 12);
  const totalInterets = arrondir2(interetsMensuels * dureeMois);
  const totalAssurance = arrondir2(assuranceMensuelle * dureeMois);
  // Épargne mensuelle à placer (au taux indiqué) pour reconstituer le capital au terme.
  const te = tauxEpargnePct / 100 / 12;
  const epargne = dureeMois > 0 ? (te === 0 ? capital / dureeMois : (capital * te) / (Math.pow(1 + te, dureeMois) - 1)) : 0;
  return {
    interetsMensuels,
    assuranceMensuelle: arrondir2(assuranceMensuelle),
    mensualite: arrondir2(interetsMensuels + assuranceMensuelle),
    totalInterets,
    totalAssurance,
    coutTotal: arrondir2(totalInterets + totalAssurance),
    capitalARembourser: capital,
    epargneMensuelleNecessaire: arrondir2(epargne),
  };
}

// ---------------------------------------------------------------------------
// Révision de loyer
// ---------------------------------------------------------------------------

export type CodeIndice = "IRL" | "ILC" | "ILAT" | "ICC";

export const INDICES: { code: CodeIndice; libelle: string; usage: string; periodicite: string }[] = [
  { code: "IRL", libelle: "IRL — indice de référence des loyers", usage: "Baux d'habitation (vides et meublés) : révision annuelle à la date prévue au bail (art. 17-1 loi du 6 juillet 1989).", periodicite: "Annuelle" },
  { code: "ILC", libelle: "ILC — indice des loyers commerciaux", usage: "Baux commerciaux (commerces, artisans) : révision triennale légale (art. L145-38 C. com.) ou indexation annuelle si clause d'échelle mobile.", periodicite: "Triennale ou annuelle" },
  { code: "ILAT", libelle: "ILAT — indice des loyers des activités tertiaires", usage: "Bureaux, professions libérales, logistique : baux professionnels et commerciaux tertiaires.", periodicite: "Triennale ou annuelle" },
  { code: "ICC", libelle: "ICC — indice du coût de la construction", usage: "Anciens baux commerciaux ; n'est plus utilisable pour les révisions de baux d'habitation ni pour les nouveaux baux commerciaux depuis 2014.", periodicite: "Triennale ou annuelle" },
];

export type ResultatRevision = {
  nouveauLoyer: number;
  augmentation: number;
  variationIndicePct: number;
  /** Loyer plafonné si un plafond en % a été appliqué (clause ou dispositif légal). */
  plafonne: boolean;
};

/**
 * Révision d'un loyer par indice : loyer × nouvel indice / ancien indice.
 * Annuelle (IRL, clause d'échelle mobile) ou triennale (indices du même trimestre à trois ans d'écart).
 * `plafondPct` permet de limiter la hausse (ex. : 3,5 % pour l'IRL entre 2022 et 2024).
 */
export function revisionLoyerIndice(loyerActuel: number, indiceAncien: number, indiceNouveau: number, plafondPct?: number | null): ResultatRevision {
  if (indiceAncien <= 0 || indiceNouveau <= 0) return { nouveauLoyer: loyerActuel, augmentation: 0, variationIndicePct: 0, plafonne: false };
  const variation = ((indiceNouveau - indiceAncien) / indiceAncien) * 100;
  let nouveau = (loyerActuel * indiceNouveau) / indiceAncien;
  let plafonne = false;
  if (plafondPct !== undefined && plafondPct !== null && variation > plafondPct) {
    nouveau = loyerActuel * (1 + plafondPct / 100);
    plafonne = true;
  }
  nouveau = arrondir2(nouveau);
  return { nouveauLoyer: nouveau, augmentation: arrondir2(nouveau - loyerActuel), variationIndicePct: arrondir2(variation), plafonne };
}

// ---------------------------------------------------------------------------
// Rentabilité
// ---------------------------------------------------------------------------

export type ParametresRentabilite = {
  prix: number;
  fraisAcquisition?: number;
  travaux?: number;
  loyerMensuelHC: number;
  chargesRecuperablesMensuelles?: number;
  chargesNonRecuperablesAnnuelles?: number;
  taxeFonciere?: number;
  assurancePNO?: number;
  gestionPct?: number;
  vacanceSemaines?: number;
  mensualiteCredit?: number;
};

export type Rentabilite = {
  investissement: number;
  loyerAnnuelHC: number;
  loyerAnnuelEncaisse: number;
  chargesAnnuelles: number;
  fraisGestion: number;
  revenuNetAnnuel: number;
  rentabiliteBrutePct: number;
  rentabiliteNettePct: number;
  cashFlowMensuel: number;
};

/** Rentabilité brute, nette de charges (avant impôt) et cash-flow mensuel. */
export function rentabilite(p: ParametresRentabilite): Rentabilite {
  const investissement = p.prix + (p.fraisAcquisition ?? 0) + (p.travaux ?? 0);
  const loyerAnnuelHC = p.loyerMensuelHC * 12;
  const vacance = Math.min(52, Math.max(0, p.vacanceSemaines ?? 0));
  const loyerAnnuelEncaisse = loyerAnnuelHC * (1 - vacance / 52);
  const fraisGestion = loyerAnnuelEncaisse * ((p.gestionPct ?? 0) / 100);
  const chargesAnnuelles = (p.chargesNonRecuperablesAnnuelles ?? 0) + (p.taxeFonciere ?? 0) + (p.assurancePNO ?? 0);
  const revenuNetAnnuel = loyerAnnuelEncaisse - chargesAnnuelles - fraisGestion;
  return {
    investissement: arrondir2(investissement),
    loyerAnnuelHC: arrondir2(loyerAnnuelHC),
    loyerAnnuelEncaisse: arrondir2(loyerAnnuelEncaisse),
    chargesAnnuelles: arrondir2(chargesAnnuelles),
    fraisGestion: arrondir2(fraisGestion),
    revenuNetAnnuel: arrondir2(revenuNetAnnuel),
    rentabiliteBrutePct: p.prix > 0 ? arrondir2((loyerAnnuelHC / p.prix) * 100) : 0,
    rentabiliteNettePct: investissement > 0 ? arrondir2((revenuNetAnnuel / investissement) * 100) : 0,
    cashFlowMensuel: arrondir2(revenuNetAnnuel / 12 - (p.mensualiteCredit ?? 0)),
  };
}
