import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { pdfContrat } from "@/lib/pdf/documents";
import { reponsePdf } from "@/lib/http";
import { entiteCouranteId } from "@/lib/entite";
import { includeLocataires } from "@/lib/locataires";

export const runtime = "nodejs";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const bail = await prisma.bail.findFirst({ where: { id: Number(id) || 0, entiteId: await entiteCouranteId() }, include: { lot: { include: { bailleur: true } }, locataires: includeLocataires } });
  if (!bail) return new Response("Bail introuvable", { status: 404 });
  return reponsePdf(`contrat-bail-${bail.id}.pdf`, req.nextUrl.searchParams.get("dl") === "1", () => pdfContrat(bail), `contrat du bail ${bail.id}`);
}
