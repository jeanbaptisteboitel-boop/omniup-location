import "server-only";
import { prisma } from "../prisma";
import { fetchSeries, type OptionsClient } from "./client";
import { libellePeriode } from "./periodes";

/** Contrôle des idbanks par un appel réel (lastNObservations=1) : libellé officiel, dernière valeur, série vivante. */

export type VerificationIdbank = {
  code: string;
  idbank: string;
  libelle: string;
  libelleInsee: string | null;
  frequence: string | null;
  dernierePeriode: string | null;
  derniereValeur: string | null;
  statut: string | null;
  ok: boolean;
  message: string;
};

export async function verifierIdbanks(options: { codes?: string[]; client?: OptionsClient } = {}): Promise<VerificationIdbank[]> {
  const series = await prisma.indiceSerie.findMany({
    where: { active: true, ...(options.codes?.length ? { code: { in: options.codes.map((c) => c.toUpperCase()) } } : {}) },
    orderBy: { code: "asc" },
  });
  const resultats: VerificationIdbank[] = [];
  for (const s of series) {
    try {
      const [r] = await fetchSeries([s.idbank], { lastNObservations: 1 }, options.client);
      if (!r) throw new Error("série absente de la réponse de l'INSEE");
      const o = r.observations[0] ?? null;
      const ok = !!r.titre && !!o;
      await prisma.indiceSerie.update({ where: { id: s.id }, data: { libelleInsee: r.titre ?? s.libelleInsee } });
      resultats.push({
        code: s.code,
        idbank: s.idbank,
        libelle: s.libelle,
        libelleInsee: r.titre,
        frequence: r.frequence,
        dernierePeriode: o?.periode ?? null,
        derniereValeur: o?.valeur ?? null,
        statut: o?.statut ?? null,
        ok,
        message: ok ? `dernière valeur ${libellePeriode(o!.periode)} = ${o!.valeur}${o!.statut === "P" ? " (provisoire)" : ""}` : "série sans observation ou sans libellé : idbank à vérifier",
      });
    } catch (e) {
      resultats.push({ code: s.code, idbank: s.idbank, libelle: s.libelle, libelleInsee: s.libelleInsee, frequence: null, dernierePeriode: null, derniereValeur: null, statut: null, ok: false, message: e instanceof Error ? e.message : String(e) });
    }
  }
  return resultats;
}

/** Vérifie un idbank isolé avant son enregistrement. */
export async function verifierIdbank(idbank: string, client?: OptionsClient): Promise<{ titre: string | null; frequence: string | null; base: string | null; dernierePeriode: string; derniereValeur: string }> {
  const [r] = await fetchSeries([idbank], { lastNObservations: 1 }, client);
  if (!r) throw new Error(`L'INSEE ne connaît pas la série ${idbank}.`);
  const o = r.observations[0];
  if (!o) throw new Error(`La série ${idbank} n'a aucune observation : idbank arrêté ou erroné.`);
  return { titre: r.titre, frequence: r.frequence, base: r.base, dernierePeriode: o.periode, derniereValeur: o.valeur };
}
