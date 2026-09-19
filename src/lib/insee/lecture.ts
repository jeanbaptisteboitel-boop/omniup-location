import "server-only";
import { Prisma, type FrequenceSerie, type IndiceSerie, type IndiceSynchronisation } from "@prisma/client";
import { prisma } from "../prisma";
import { debutPeriode, libellePeriode, periodeUnAnAvant, trimestreDepuisPeriode } from "./periodes";
import { initialiserSeriesDefaut } from "./series-defaut";
import { synchroniserIndices } from "./sync";
import type { SerieIndice } from "./utils";

/** Lecture des indices pour l'application et l'API : valeurs exposées en chaînes décimales exactes. */

export type ObservationLue = { periode: string; libelle: string; valeur: string; statut: string | null; debutPeriode: Date; recupereLe: Date };
export type RevisionLue = { periode: string; ancienneValeur: string; nouvelleValeur: string; ancienStatut: string | null; nouveauStatut: string | null; date: Date };
export type SerieResume = {
  id: number;
  code: string;
  idbank: string;
  libelle: string;
  libelleInsee: string | null;
  frequence: FrequenceSerie;
  unite: string | null;
  base: string | null;
  active: boolean;
  derniereSync: Date | null;
  dernierePeriode: string | null;
  echecsConsecutifs: number;
  dernierEchec: string | null;
  nbObservations: number;
  derniere: ObservationLue | null;
  variationUnAn: string | null;
};

export const LIBELLES_FREQUENCE: Record<FrequenceSerie, string> = { M: "mensuelle", Q: "trimestrielle", A: "annuelle" };

function versObservation(o: { periode: string; valeur: Prisma.Decimal; statut: string | null; debutPeriode: Date; recupereLe: Date }): ObservationLue {
  return { periode: o.periode, libelle: libellePeriode(o.periode), valeur: o.valeur.toString(), statut: o.statut, debutPeriode: o.debutPeriode, recupereLe: o.recupereLe };
}

/** Variation en % entre deux valeurs, en arithmétique décimale exacte (chaîne à deux décimales). */
export function variationDecimal(nouvelle: Prisma.Decimal | string, ancienne: Prisma.Decimal | string): string | null {
  const n = new Prisma.Decimal(nouvelle);
  const a = new Prisma.Decimal(ancienne);
  if (a.isZero()) return null;
  return n.minus(a).div(a).mul(100).toFixed(2);
}

export async function listerSeries(): Promise<SerieResume[]> {
  await initialiserSeriesDefaut();
  const series = await prisma.indiceSerie.findMany({
    orderBy: [{ active: "desc" }, { code: "asc" }, { id: "desc" }],
    include: { _count: { select: { observations: true } }, observations: { orderBy: { debutPeriode: "desc" }, take: 1 } },
  });
  return Promise.all(
    series.map(async (s) => {
      const derniere = s.observations[0] ?? null;
      let variationUnAn: string | null = null;
      if (derniere) {
        const avant = periodeUnAnAvant(derniere.periode);
        const ref = avant ? await prisma.indiceObservation.findUnique({ where: { serieId_periode: { serieId: s.id, periode: avant } } }) : null;
        if (ref) variationUnAn = variationDecimal(derniere.valeur, ref.valeur);
      }
      return {
        id: s.id,
        code: s.code,
        idbank: s.idbank,
        libelle: s.libelle,
        libelleInsee: s.libelleInsee,
        frequence: s.frequence,
        unite: s.unite,
        base: s.base,
        active: s.active,
        derniereSync: s.derniereSync,
        dernierePeriode: s.dernierePeriode,
        echecsConsecutifs: s.echecsConsecutifs,
        dernierEchec: s.dernierEchec,
        nbObservations: s._count.observations,
        derniere: derniere ? versObservation(derniere) : null,
        variationUnAn,
      };
    }),
  );
}

/** Série active d'un code, sinon la plus récente (série remplacée après rebasage). */
export async function serieParCode(code: string): Promise<IndiceSerie | null> {
  const c = code.trim().toUpperCase();
  return (await prisma.indiceSerie.findFirst({ where: { code: c, active: true } })) ?? prisma.indiceSerie.findFirst({ where: { code: c }, orderBy: { id: "desc" } });
}

export async function historiqueSerie(code: string, options: { from?: string | null; to?: string | null } = {}): Promise<{ serie: IndiceSerie; observations: ObservationLue[]; revisions: RevisionLue[] } | null> {
  const serie = await serieParCode(code);
  if (!serie) return null;
  const from = options.from ? debutPeriode(options.from) : null;
  const to = options.to ? debutPeriode(options.to) : null;
  const [observations, revisions] = await Promise.all([
    prisma.indiceObservation.findMany({
      where: { serieId: serie.id, ...(from || to ? { debutPeriode: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}) },
      orderBy: { debutPeriode: "asc" },
    }),
    prisma.indiceRevision.findMany({ where: { serieId: serie.id }, orderBy: { createdAt: "desc" }, take: 50 }),
  ]);
  return {
    serie,
    observations: observations.map(versObservation),
    revisions: revisions.map((r) => ({ periode: r.periode, ancienneValeur: r.ancienneValeur.toString(), nouvelleValeur: r.nouvelleValeur.toString(), ancienStatut: r.ancienStatut, nouveauStatut: r.nouveauStatut, date: r.createdAt })),
  };
}

/** Valeur d'une série à une période donnée (« 2025-Q2 », « 2026-06 »). */
export async function valeurA(code: string, periode: string): Promise<(ObservationLue & { code: string; idbank: string; libelle: string }) | null> {
  const serie = await serieParCode(code);
  if (!serie) return null;
  const o = await prisma.indiceObservation.findUnique({ where: { serieId_periode: { serieId: serie.id, periode: periode.trim().toUpperCase() } } });
  return o ? { ...versObservation(o), code: serie.code, idbank: serie.idbank, libelle: serie.libelle } : null;
}

/** Derniers trimestres d'une série pour les formulaires (bail, révision, calculatrice) ; première synchronisation à la demande si la base est vide. */
export async function serieRecente(code: string, nb = 16): Promise<SerieIndice> {
  await initialiserSeriesDefaut();
  const serie = await prisma.indiceSerie.findFirst({ where: { code: code.trim().toUpperCase(), active: true } });
  if (!serie) throw new Error(`Indice ${code} inconnu ou inactif : voir la page Indices INSEE.`);
  const lire = () => prisma.indiceObservation.findMany({ where: { serieId: serie.id }, orderBy: { debutPeriode: "desc" }, take: nb });
  let observations = await lire();
  if (observations.length === 0) {
    const r = await synchroniserIndices({ declencheur: "premiere-utilisation", codes: [serie.code] });
    const detail = r.details.find((d) => d.idbank === serie.idbank);
    if (detail?.erreur) throw new Error(detail.erreur);
    observations = await lire();
    if (observations.length === 0) throw new Error(`Aucune valeur disponible pour ${serie.code} (série ${serie.idbank}).`);
  }
  const derniereSync = (await prisma.indiceSerie.findUnique({ where: { id: serie.id }, select: { derniereSync: true } }))?.derniereSync ?? serie.derniereSync;
  return {
    code: serie.code,
    libelle: serie.libelle,
    idbank: serie.idbank,
    frequence: serie.frequence,
    miseAJour: derniereSync?.toISOString() ?? null,
    observations: observations.reverse().map((o) => ({ periode: o.periode, trimestre: trimestreDepuisPeriode(o.periode) ?? libellePeriode(o.periode), valeur: o.valeur.toNumber(), valeurTexte: o.valeur.toString(), statut: o.statut })),
  };
}

export async function journalSynchronisations(nb = 10): Promise<IndiceSynchronisation[]> {
  return prisma.indiceSynchronisation.findMany({ orderBy: { debut: "desc" }, take: nb });
}

export async function derniereSynchronisation(): Promise<IndiceSynchronisation | null> {
  return prisma.indiceSynchronisation.findFirst({ orderBy: { debut: "desc" } });
}
