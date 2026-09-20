import type { ClasseEnergie } from "@prisma/client";

/**
 * Diagnostic de performance énergétique (DPE).
 *
 * Le DPE fait partie du dossier de diagnostic technique annexé au contrat de location
 * (article 3-3 de la loi n° 89-462 du 6 juillet 1989). Il est donc obligatoire, mais son absence
 * n'empêche ni de conclure ni d'exécuter le bail : elle n'entraîne pas la nullité du contrat.
 * L'application le signale partout où il manque sans jamais bloquer la location ; c'est au bailleur
 * de décider s'il loue en attendant le diagnostic.
 *
 * Deux conséquences, elles, s'imposent au bailleur (loi n° 2021-1104 du 22 août 2021, dite Climat
 * et Résilience) :
 * — le niveau de performance conditionne la décence du logement, par paliers ;
 * — les logements classés F ou G ne peuvent plus voir leur loyer indexé (gel des loyers).
 */

export const CLASSES: ClasseEnergie[] = ["A", "B", "C", "D", "E", "F", "G"];

export const LIBELLES_CLASSE: Record<ClasseEnergie, string> = {
  A: "A — extrêmement performant",
  B: "B — très performant",
  C: "C — performant",
  D: "D — assez performant",
  E: "E — peu performant",
  F: "F — très peu performant",
  G: "G — extrêmement peu performant",
};

/** Couleurs de l'étiquette énergie officielle. */
export const COULEURS_ENERGIE: Record<ClasseEnergie, string> = {
  A: "#319834",
  B: "#33cc31",
  C: "#cbfc34",
  D: "#fbfe06",
  E: "#fbcc05",
  F: "#fc9935",
  G: "#fc0205",
};

/** Couleurs de l'étiquette climat (émissions de gaz à effet de serre). */
export const COULEURS_GES: Record<ClasseEnergie, string> = {
  A: "#f6f2fb",
  B: "#e6ddf2",
  C: "#cfc0e6",
  D: "#b49fda",
  E: "#9878ce",
  F: "#7c51c2",
  G: "#5b2bb5",
};

/** Le texte de l'étiquette climat reste lisible sur les fonds clairs comme sur les fonds foncés. */
export function texteSurGes(classe: ClasseEnergie): string {
  return classe === "A" || classe === "B" || classe === "C" ? "#2b1a4d" : "#ffffff";
}

export function texteSurEnergie(classe: ClasseEnergie): string {
  return classe === "A" || classe === "G" ? "#ffffff" : "#1b2a3d";
}

/** Un DPE est valable dix ans. Ceux réalisés avant la réforme du 1er juillet 2021 ne sont plus valables. */
export const DUREE_VALIDITE_ANS = 10;
const REFORME_2021 = Date.UTC(2021, 6, 1);

export type EtatDpe = "MANQUANT" | "EXPIRE" | "VALIDE";

export type Dpe = {
  dpeClasseEnergie: ClasseEnergie | null;
  dpeClasseGes: ClasseEnergie | null;
  dpeConsommation: number | null;
  dpeEmissions: number | null;
  dpeRealiseLe: Date | null;
};

export function dateExpiration(realiseLe: Date): Date {
  const d = new Date(realiseLe);
  return new Date(Date.UTC(d.getUTCFullYear() + DUREE_VALIDITE_ANS, d.getUTCMonth(), d.getUTCDate()));
}

export function etatDpe(lot: Dpe, auj: Date): EtatDpe {
  if (!lot.dpeClasseEnergie || !lot.dpeRealiseLe) return "MANQUANT";
  if (lot.dpeRealiseLe.getTime() < REFORME_2021) return "EXPIRE";
  return dateExpiration(lot.dpeRealiseLe).getTime() <= auj.getTime() ? "EXPIRE" : "VALIDE";
}

export const LIBELLES_ETAT: Record<EtatDpe, string> = {
  MANQUANT: "DPE manquant",
  EXPIRE: "DPE expiré",
  VALIDE: "DPE à jour",
};

export const TONS_ETAT: Record<EtatDpe, "orange" | "rouge" | "vert"> = {
  MANQUANT: "orange",
  EXPIRE: "rouge",
  VALIDE: "vert",
};

/**
 * Calendrier de la décence énergétique (article 6 de la loi de 1989, complété par la loi Climat et
 * Résilience). En France métropolitaine, un logement ne peut plus être mis en location lorsqu'il
 * atteint le palier indiqué. Les départements d'outre-mer suivent un calendrier plus tardif.
 */
export const PALIERS_DECENCE: { classe: ClasseEnergie; depuis: Date }[] = [
  { classe: "G", depuis: new Date(Date.UTC(2025, 0, 1)) },
  { classe: "F", depuis: new Date(Date.UTC(2028, 0, 1)) },
  { classe: "E", depuis: new Date(Date.UTC(2034, 0, 1)) },
];

/** Consommation au-delà de laquelle le logement est indécent depuis le 1er janvier 2023. */
export const SEUIL_CONSOMMATION_2023 = 450;
const DEPUIS_2023 = new Date(Date.UTC(2023, 0, 1));

export type Decence =
  | { decent: true; prochainPalier: { classe: ClasseEnergie; depuis: Date } | null }
  | { decent: false; motif: string };

/** Décence énergétique du logement, et prochaine échéance à anticiper lorsqu'il est encore louable. */
export function decenceEnergetique(lot: Dpe, auj: Date): Decence | null {
  if (!lot.dpeClasseEnergie) return null;
  if (lot.dpeConsommation !== null && lot.dpeConsommation >= SEUIL_CONSOMMATION_2023 && auj.getTime() >= DEPUIS_2023.getTime()) {
    return { decent: false, motif: `La consommation atteint ${Math.round(lot.dpeConsommation)} kWh/m²/an : au-delà de ${SEUIL_CONSOMMATION_2023}, le logement n'est plus décent depuis le 1er janvier 2023.` };
  }
  const atteint = PALIERS_DECENCE.find((p) => p.classe === lot.dpeClasseEnergie && auj.getTime() >= p.depuis.getTime());
  if (atteint) {
    return { decent: false, motif: `Un logement classé ${atteint.classe} ne peut plus être mis en location depuis le ${atteint.depuis.getUTCDate()}er janvier ${atteint.depuis.getUTCFullYear()}.` };
  }
  const prochain = PALIERS_DECENCE.find((p) => p.classe === lot.dpeClasseEnergie && auj.getTime() < p.depuis.getTime()) ?? null;
  return { decent: true, prochainPalier: prochain };
}

/**
 * Gel des loyers : depuis le 24 août 2022, le loyer d'un logement classé F ou G ne peut plus être
 * indexé sur l'indice de référence des loyers, ni majoré au renouvellement du bail.
 */
export function loyerGele(lot: Dpe): boolean {
  return lot.dpeClasseEnergie === "F" || lot.dpeClasseEnergie === "G";
}

export const MOTIF_GEL = "Logement classé F ou G : depuis le 24 août 2022, son loyer ne peut plus être indexé sur l'indice de référence des loyers (loi Climat et Résilience).";
