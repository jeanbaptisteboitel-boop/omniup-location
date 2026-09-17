import type { StatutBail } from "@prisma/client";
import { STATUTS_BAIL } from "@/lib/libelles";
import { Badge } from "@/components/ui";

const TONS: Record<StatutBail, "gris" | "orange" | "vert" | "bleu"> = {
  BROUILLON: "gris",
  EN_SIGNATURE: "orange",
  SIGNE: "vert",
  TERMINE: "bleu",
};

export function BadgeStatutBail({ statut }: { statut: StatutBail }) {
  return <Badge ton={TONS[statut]}>{STATUTS_BAIL[statut]}</Badge>;
}
