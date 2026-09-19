import type { NextRequest } from "next/server";
import { historiqueSerie } from "@/lib/insee/lecture";

export const dynamic = "force-dynamic";

/** GET /api/insee/series/{code}?from=2020-Q1&to=2026-Q4 : historique d'une série (bornes facultatives, périodes INSEE). */
export async function GET(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const h = await historiqueSerie(code, { from: req.nextUrl.searchParams.get("from"), to: req.nextUrl.searchParams.get("to") });
  if (!h) return Response.json({ erreur: `Indice ${code} inconnu.` }, { status: 404 });
  return Response.json({
    code: h.serie.code,
    idbank: h.serie.idbank,
    libelle: h.serie.libelle,
    libelleInsee: h.serie.libelleInsee,
    frequence: h.serie.frequence,
    base: h.serie.base,
    active: h.serie.active,
    observations: h.observations.map((o) => ({ periode: o.periode, libelle: o.libelle, valeur: o.valeur, statut: o.statut })),
  });
}
