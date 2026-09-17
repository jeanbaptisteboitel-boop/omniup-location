import type { ModeleDefaut } from "../modeles";
import { MODELES_BAUX } from "./baux";
import { MODELES_AVENANTS, MODELES_CAUTIONS, MODELES_CONVENTIONS, MODELES_RENOUVELLEMENTS, MODELES_RESILIATIONS } from "./autres";

/** Modèles fournis avec l'application (réinitialisables individuellement). */
export const MODELES_DEFAUT: ModeleDefaut[] = [...MODELES_BAUX, ...MODELES_AVENANTS, ...MODELES_RENOUVELLEMENTS, ...MODELES_RESILIATIONS, ...MODELES_CAUTIONS, ...MODELES_CONVENTIONS];

export function modeleDefautParCode(code: string): ModeleDefaut | undefined {
  return MODELES_DEFAUT.find((m) => m.code === code);
}
