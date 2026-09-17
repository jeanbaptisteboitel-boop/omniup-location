import "server-only";
import { prisma } from "./prisma";
import type { OptionsAffectation } from "./affectation";
import { entiteCouranteId } from "@/lib/entite";

export async function chargerAffectations(): Promise<OptionsAffectation> {
  const entiteId = await entiteCouranteId();
  const [lots, immeubles] = await Promise.all([
    prisma.lot.findMany({ where: { entiteId }, orderBy: [{ ville: "asc" }, { nom: "asc" }], select: { id: true, nom: true, ville: true } }),
    prisma.immeuble.findMany({ where: { entiteId }, orderBy: { nom: "asc" }, select: { id: true, nom: true, ville: true } }),
  ]);
  return { lots, immeubles };
}
