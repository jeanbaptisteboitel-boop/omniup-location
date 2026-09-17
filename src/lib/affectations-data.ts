import "server-only";
import { prisma } from "./prisma";
import type { OptionsAffectation } from "./affectation";

export async function chargerAffectations(): Promise<OptionsAffectation> {
  const [lots, immeubles] = await Promise.all([
    prisma.lot.findMany({ orderBy: [{ ville: "asc" }, { nom: "asc" }], select: { id: true, nom: true, ville: true } }),
    prisma.immeuble.findMany({ orderBy: { nom: "asc" }, select: { id: true, nom: true, ville: true } }),
  ]);
  return { lots, immeubles };
}
