/** Affectation d'une dépense ou d'un emprunt : à un lot ou à un immeuble. */
export type Affectation = { lotId: number | null; immeubleId: number | null };

export function parseAffectation(valeur: string | null | undefined): Affectation | null {
  if (!valeur) return null;
  const m = /^(lot|immeuble):(\d+)$/.exec(valeur);
  if (!m) return null;
  const id = Number(m[2]);
  return m[1] === "lot" ? { lotId: id, immeubleId: null } : { lotId: null, immeubleId: id };
}

export function affectationVers(a: Affectation): string {
  if (a.lotId) return `lot:${a.lotId}`;
  if (a.immeubleId) return `immeuble:${a.immeubleId}`;
  return "";
}

export type OptionsAffectation = {
  lots: { id: number; nom: string; ville: string }[];
  immeubles: { id: number; nom: string; ville: string }[];
};
