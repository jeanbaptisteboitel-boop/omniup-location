import { NextRequest } from "next/server";
import { chargerAppel } from "@/lib/pdf/donnees";
import { pdfAvisEcheance } from "@/lib/pdf/loyers";
import { numeroAppel } from "@/lib/loyers";
import { reponsePdf } from "@/lib/http";
import { entiteCouranteId } from "@/lib/entite";

export const runtime = "nodejs";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const appel = await chargerAppel(Number(id) || 0);
  if (!appel || appel.bail.entiteId !== (await entiteCouranteId())) return new Response("Appel de loyer introuvable", { status: 404 });
  return reponsePdf(`avis-echeance-${numeroAppel(appel.id)}.pdf`, req.nextUrl.searchParams.get("dl") === "1", () => pdfAvisEcheance(appel), `avis d'échéance ${appel.id}`);
}
