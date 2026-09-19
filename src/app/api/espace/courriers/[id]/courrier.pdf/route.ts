import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { includeCourrier } from "@/lib/pdf/donnees";
import { pdfCourrier } from "@/lib/pdf/documents";
import { reponsePdf } from "@/lib/http";
import { locataireConnecte } from "@/lib/espace";

export const runtime = "nodejs";

/** Courrier envoyé ou remis au locataire connecté. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const l = await locataireConnecte();
  if (!l) return new Response("Authentification requise", { status: 401 });
  const { id } = await params;
  const courrier = await prisma.courrier.findFirst({ where: { id: Number(id) || 0, dateEnvoi: { not: null }, bail: { locataires: { some: { id: l.id } } } }, include: includeCourrier });
  if (!courrier) return new Response("Courrier introuvable", { status: 404 });
  return reponsePdf(`courrier-${courrier.id}.pdf`, req.nextUrl.searchParams.get("dl") === "1", () => pdfCourrier(courrier), `courrier ${courrier.id}`);
}
