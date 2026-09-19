import "server-only";
import { Prisma, type AppelLoyer } from "@prisma/client";
import { prisma } from "./prisma";
import { aujourdhui, periodeDe, comparerPeriodes } from "./dates";
import { calculerAppel, periodesAGenerer } from "./loyers";

export function joursAvanceAvis(): number {
  const n = Number(process.env.AVIS_JOURS_AVANCE ?? 10);
  return Number.isFinite(n) && n >= 0 ? n : 10;
}

/**
 * Crée les appels de loyer manquants pour tous les baux signés (ou pour un bail donné).
 * Idempotent : un appel par bail et par période.
 */
export async function synchroniserAppelsLoyer(options: { bailId?: number; aujourdhui?: Date } = {}): Promise<AppelLoyer[]> {
  const auj = options.aujourdhui ?? aujourdhui();
  const joursAvance = joursAvanceAvis();
  const baux = await prisma.bail.findMany({
    where: { statut: { in: ["SIGNE", "TERMINE"] }, ...(options.bailId ? { id: options.bailId } : {}) },
    include: { appels: { select: { periode: true } } },
  });
  const crees: AppelLoyer[] = [];
  for (const bail of baux) {
    const existantes = new Set(bail.appels.map((a) => a.periode));
    for (const periode of periodesAGenerer(bail, auj, joursAvance)) {
      if (existantes.has(periode)) continue;
      const calc = calculerAppel(bail, periode);
      try {
        const appel = await prisma.appelLoyer.create({
          data: {
            bailId: bail.id,
            periode,
            debutPeriode: calc.debutPeriode,
            finPeriode: calc.finPeriode,
            dateEmission: auj,
            dateEcheance: calc.dateEcheance,
            loyer: calc.loyer,
            charges: calc.charges,
            tauxTva: calc.tauxTva,
            montantTva: calc.montantTva,
            total: calc.total,
            prorata: calc.prorata,
          },
        });
        crees.push(appel);
      } catch (e) {
        // Création concurrente de la même période : on ignore.
        if (!(e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002")) throw e;
      }
    }
  }
  return crees;
}

/**
 * Après clôture ou révision d'un bail : recalcule les appels non réglés à partir d'une période
 * et supprime ceux qui dépassent la fin de location.
 */
export async function recalculerAppelsNonRegles(bailId: number, aPartirDe: string): Promise<void> {
  const bail = await prisma.bail.findUnique({ where: { id: bailId }, include: { appels: { include: { paiements: true } } } });
  if (!bail) return;
  const auj = aujourdhui();
  const periodesValides = new Set(periodesAGenerer(bail, auj, joursAvanceAvis()));
  for (const appel of bail.appels) {
    if (comparerPeriodes(appel.periode, aPartirDe) < 0) continue;
    if (appel.paiements.length > 0) continue;
    if (!periodesValides.has(appel.periode) && !(bail.dateFinEffective && periodeDe(bail.dateFinEffective) === appel.periode)) {
      await prisma.appelLoyer.delete({ where: { id: appel.id } });
      continue;
    }
    const calc = calculerAppel(bail, appel.periode);
    await prisma.appelLoyer.update({
      where: { id: appel.id },
      data: { debutPeriode: calc.debutPeriode, finPeriode: calc.finPeriode, dateEcheance: calc.dateEcheance, loyer: calc.loyer, charges: calc.charges, tauxTva: calc.tauxTva, montantTva: calc.montantTva, total: calc.total, prorata: calc.prorata },
    });
  }
}
