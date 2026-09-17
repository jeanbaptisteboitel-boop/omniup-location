import { NextRequest } from "next/server";
import { chargerCourrier } from "@/lib/pdf/donnees";
import { pdfCourrier } from "@/lib/pdf/documents";
import { reponseFichier } from "@/lib/http";

export const runtime = "nodejs";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const courrier = await chargerCourrier(Number(id) || 0);
  if (!courrier) return new Response("Courrier introuvable", { status: 404 });
  const pdf = await pdfCourrier(courrier);
  return reponseFichier(pdf, "application/pdf", `courrier-${courrier.id}.pdf`, req.nextUrl.searchParams.get("dl") === "1");
}
