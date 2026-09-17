import { STATUTS_APPEL, type StatutAppel } from "@/lib/loyers";
import { Badge } from "@/components/ui";

const TONS: Record<StatutAppel, "vert" | "orange" | "gris" | "rouge"> = {
  PAYE: "vert",
  PARTIEL: "orange",
  A_PAYER: "gris",
  EN_RETARD: "rouge",
};

export function BadgeStatutAppel({ statut }: { statut: StatutAppel }) {
  return <Badge ton={TONS[statut]}>{STATUTS_APPEL[statut]}</Badge>;
}
