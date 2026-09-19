import "server-only";
import type { FrequenceSerie } from "@prisma/client";
import { prisma } from "../prisma";

export type SerieDefaut = { code: string; idbank: string; libelle: string; frequence: FrequenceSerie; unite: string; base: string };

/**
 * Lot initial (idbanks du brief, à confirmer par un appel réel : bouton « Vérifier les idbanks » ou scripts/verifier-idbanks.mjs).
 * Le référentiel vit en base : cette liste ne sert qu'à créer les séries manquantes, jamais à écraser une série modifiée.
 */
export const SERIES_DEFAUT: SerieDefaut[] = [
  { code: "IRL", idbank: "001515333", libelle: "Indice de référence des loyers (IRL)", frequence: "Q", unite: "indice", base: "base 100 au 4e trimestre 1998" },
  { code: "ILC", idbank: "001532540", libelle: "Indice des loyers commerciaux (ILC)", frequence: "Q", unite: "indice", base: "base 100 au 1er trimestre 2008" },
  { code: "ILAT", idbank: "001617112", libelle: "Indice des loyers des activités tertiaires (ILAT)", frequence: "Q", unite: "indice", base: "base 100 au 1er trimestre 2010" },
  { code: "ICC", idbank: "000008630", libelle: "Indice du coût de la construction (ICC)", frequence: "Q", unite: "indice", base: "base 100 au 4e trimestre 1953" },
  { code: "BT01", idbank: "001710986", libelle: "Index bâtiment tous corps d'état (BT01)", frequence: "M", unite: "indice", base: "base 100 en 2010" },
];

/** Crée les séries par défaut absentes (un code déjà présent, même remplacé par l'utilisateur, n'est pas recréé). */
export async function initialiserSeriesDefaut(): Promise<void> {
  const existantes = await prisma.indiceSerie.findMany({ select: { idbank: true, code: true } });
  const idbanks = new Set(existantes.map((s) => s.idbank));
  const codes = new Set(existantes.map((s) => s.code));
  const manquantes = SERIES_DEFAUT.filter((s) => !idbanks.has(s.idbank) && !codes.has(s.code));
  if (manquantes.length) await prisma.indiceSerie.createMany({ data: manquantes, skipDuplicates: true });
}
