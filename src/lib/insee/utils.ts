import { formatNombre } from "../montants";
import { periodeUnAnAvant } from "./periodes";

/** Types et fonctions utilisables côté navigateur (formulaires, calculatrices). */

export { trimestrePlus } from "./periodes";

export type ObservationIndice = { periode: string; trimestre: string; valeur: number; valeurTexte: string; statut: string | null };
export type SerieIndice = { code: string; libelle: string; idbank: string; frequence: "M" | "Q" | "A"; observations: ObservationIndice[]; miseAJour: string | null };

/** Valeur d'un indice pour la saisie ou l'affichage (« 147,10 »). */
export function formatIndice(valeur: number | string): string {
  return formatNombre(typeof valeur === "number" ? valeur : Number(valeur), 2);
}

export function dernierIndice(serie: Pick<SerieIndice, "observations">): ObservationIndice | null {
  return serie.observations[serie.observations.length - 1] ?? null;
}

/** Observation d'un trimestre donné (« T2 2026 »), sinon null. */
export function valeurTrimestre(serie: Pick<SerieIndice, "observations">, trimestre: string | null | undefined): ObservationIndice | null {
  if (!trimestre) return null;
  return serie.observations.find((o) => o.trimestre === trimestre.trim()) ?? null;
}

/** Variation en % par rapport à la même période un an plus tôt (null si elle est inconnue). */
export function variationSurUnAn(observations: { periode: string; valeur: number }[], obs: { periode: string; valeur: number }): number | null {
  const avant = periodeUnAnAvant(obs.periode);
  const ref = avant ? observations.find((o) => o.periode === avant) : null;
  if (!ref || ref.valeur === 0) return null;
  return ((obs.valeur - ref.valeur) / ref.valeur) * 100;
}

export function formatVariation(v: number | string | null): string {
  if (v === null) return "—";
  const n = typeof v === "number" ? v : Number(v);
  return `${n > 0 ? "+" : ""}${formatNombre(n, 2)} %`;
}
