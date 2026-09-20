import type { StatutMaintenance, UrgenceMaintenance } from "@prisma/client";
import { STATUTS_MAINTENANCE, URGENCES_MAINTENANCE } from "@/lib/libelles";
import { Badge, type Ton } from "@/components/ui";

const TONS_STATUT: Record<StatutMaintenance, Ton> = {
  NOUVELLE: "cyan",
  PRISE_EN_COMPTE: "bleu",
  PLANIFIEE: "violet",
  RESOLUE: "vert",
  REFUSEE: "gris",
};

const TONS_URGENCE: Record<UrgenceMaintenance, Ton> = { NORMALE: "gris", URGENTE: "orange", TRES_URGENTE: "rouge" };

export function BadgeStatutMaintenance({ statut }: { statut: StatutMaintenance }) {
  return <Badge ton={TONS_STATUT[statut]}>{STATUTS_MAINTENANCE[statut]}</Badge>;
}

/** L'urgence normale n'est pas mise en avant : seules les demandes urgentes portent un badge coloré. */
export function BadgeUrgence({ urgence }: { urgence: UrgenceMaintenance }) {
  return <Badge ton={TONS_URGENCE[urgence]}>{URGENCES_MAINTENANCE[urgence]}</Badge>;
}
