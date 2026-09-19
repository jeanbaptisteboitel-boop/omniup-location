import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "../prisma";
import { includeLocataires } from "../locataires";

export const includeAppel = {
  bail: { include: { lot: { include: { bailleur: true } }, locataires: includeLocataires } },
  paiements: { orderBy: { date: "asc" as const } },
} satisfies Prisma.AppelLoyerInclude;

export type AppelComplet = Prisma.AppelLoyerGetPayload<{ include: typeof includeAppel }>;

export async function chargerAppel(id: number): Promise<AppelComplet | null> {
  return prisma.appelLoyer.findUnique({ where: { id }, include: includeAppel });
}

export const includeCourrier = { bail: { include: { lot: { include: { bailleur: true } }, locataires: includeLocataires } } } satisfies Prisma.CourrierInclude;
export type CourrierComplet = Prisma.CourrierGetPayload<{ include: typeof includeCourrier }>;

export async function chargerCourrier(id: number): Promise<CourrierComplet | null> {
  return prisma.courrier.findUnique({ where: { id }, include: includeCourrier });
}
