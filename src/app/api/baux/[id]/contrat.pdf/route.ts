import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { pdfContrat } from "@/lib/pdf/documents";
import { reponseFichier } from "@/lib/http";

export const runtime = "nodejs";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const bail = await prisma.bail.findUnique({ where: { id: Number(id) || 0 }, include: { lot: { include: { bailleur: true } }, locataire: true } });
  if (!bail) return new Response("Bail introuvable", { status: 404 });
  const pdf = await pdfContrat(bail);
  return reponseFichier(pdf, "application/pdf", `contrat-bail-${bail.id}.pdf`, req.nextUrl.searchParams.get("dl") === "1");
}
