import { listerSeries } from "@/lib/insee/lecture";

export const dynamic = "force-dynamic";

/** GET /api/insee/series : séries suivies avec leur dernière valeur (protégé par la session de l'application). */
export async function GET() {
  const series = await listerSeries();
  return Response.json({
    series: series.map((s) => ({
      code: s.code,
      idbank: s.idbank,
      libelle: s.libelle,
      libelleInsee: s.libelleInsee,
      frequence: s.frequence,
      unite: s.unite,
      base: s.base,
      active: s.active,
      dernierePeriode: s.derniere?.periode ?? null,
      derniereValeur: s.derniere?.valeur ?? null,
      statut: s.derniere?.statut ?? null,
      variationUnAn: s.variationUnAn,
      derniereSynchronisation: s.derniereSync,
      nbObservations: s.nbObservations,
    })),
  });
}
