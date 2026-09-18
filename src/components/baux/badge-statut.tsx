import type { StatutBail } from "@prisma/client";
import { Badge } from "@/components/ui";

/** Libellés courts des statuts pour les badges (STATUTS_BAIL, dans lib, garde la forme longue « En signature (Omniup Sign) »). */
export const STATUTS_BAIL_COURT: Record<StatutBail, string> = {
  BROUILLON: "Brouillon",
  EN_SIGNATURE: "En signature",
  SIGNE: "Signé",
  TERMINE: "Terminé",
};

const TONS: Record<StatutBail, "gris" | "orange" | "vert"> = {
  BROUILLON: "gris",
  EN_SIGNATURE: "orange",
  SIGNE: "vert",
  TERMINE: "gris",
};

export function BadgeStatutBail({ statut }: { statut: StatutBail }) {
  return <Badge ton={TONS[statut]}>{STATUTS_BAIL_COURT[statut]}</Badge>;
}
