import { NextRequest } from "next/server";
import { chargerCourrier } from "@/lib/pdf/donnees";
import { pdfCourrier } from "@/lib/pdf/documents";
import { reponsePdf } from "@/lib/http";
import { entiteCouranteId } from "@/lib/entite";

export const runtime = "nodejs";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const courrier = await chargerCourrier(Number(id) || 0);
  if (!courrier || courrier.bail.entiteId !== (await entiteCouranteId())) return new Response("Courrier introuvable", { status: 404 });
  return reponsePdf(`courrier-${courrier.id}.pdf`, req.nextUrl.searchParams.get("dl") === "1", () => pdfCourrier(courrier), `courrier ${courrier.id}`);
}
