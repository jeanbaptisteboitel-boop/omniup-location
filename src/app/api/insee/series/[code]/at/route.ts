import type { NextRequest } from "next/server";
import { valeurA } from "@/lib/insee/lecture";
import { analyserPeriode } from "@/lib/insee/periodes";

export const dynamic = "force-dynamic";

/** GET /api/insee/series/{code}/at?period=2025-Q2 : valeur d'une série à une période donnée. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const periode = req.nextUrl.searchParams.get("period") ?? req.nextUrl.searchParams.get("periode") ?? "";
  if (!analyserPeriode(periode)) return Response.json({ erreur: "Paramètre period attendu : AAAA-MM, AAAA-Qn ou AAAA." }, { status: 400 });
  const o = await valeurA(code, periode);
  if (!o) return Response.json({ erreur: `Aucune valeur de ${code.toUpperCase()} pour ${periode}.` }, { status: 404 });
  return Response.json({ code: o.code, idbank: o.idbank, libelle: o.libelle, periode: o.periode, libellePeriode: o.libelle, valeur: o.valeur, statut: o.statut, provisoire: o.statut === "P" });
}
