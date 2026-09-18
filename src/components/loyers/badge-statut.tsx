import type { StatutAppel } from "@/lib/loyers";
import { Badge } from "@/components/ui";

const TONS: Record<StatutAppel, "vert" | "orange" | "gris" | "rouge"> = {
  PAYE: "vert",
  PARTIEL: "orange",
  A_PAYER: "gris",
  EN_RETARD: "rouge",
};

/** Libellés courts des statuts d'appel de loyer, tels qu'affichés dans les badges et les filtres. */
export const LIBELLES_STATUT_APPEL: Record<StatutAppel, string> = {
  PAYE: "Payé",
  PARTIEL: "Partiel",
  A_PAYER: "En attente",
  EN_RETARD: "En retard",
};

export function BadgeStatutAppel({ statut }: { statut: StatutAppel }) {
  return <Badge ton={TONS[statut]}>{LIBELLES_STATUT_APPEL[statut]}</Badge>;
}
