import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { pdfContrat } from "@/lib/pdf/documents";
import { reponsePdf } from "@/lib/http";
import { includeLocataires } from "@/lib/locataires";
import { locataireConnecte } from "@/lib/espace";

export const runtime = "nodejs";

/** Texte du contrat d'un bail du locataire connecté, en PDF. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const l = await locataireConnecte();
  if (!l) return new Response("Authentification requise", { status: 401 });
  const { id } = await params;
  const bail = await prisma.bail.findFirst({ where: { id: Number(id) || 0, statut: { not: "BROUILLON" }, locataires: { some: { id: l.id } } }, include: { lot: { include: { bailleur: true } }, locataires: includeLocataires } });
  if (!bail || !bail.texteContrat?.trim()) return new Response("Contrat introuvable", { status: 404 });
  return reponsePdf(`contrat-bail-${bail.id}.pdf`, req.nextUrl.searchParams.get("dl") === "1", () => pdfContrat(bail), `contrat du bail ${bail.id}`);
}
