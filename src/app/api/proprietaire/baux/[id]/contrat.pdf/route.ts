import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { pdfContrat } from "@/lib/pdf/documents";
import { reponseFichier } from "@/lib/http";
import { includeLocataires } from "@/lib/locataires";
import { bailleurConnecte } from "@/lib/proprietaire";

export const runtime = "nodejs";

/** Texte du contrat d'un bail (hors brouillon) d'un lot du bailleur connecté, en PDF. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const b = await bailleurConnecte();
  if (!b) return new Response("Authentification requise", { status: 401 });
  const { id } = await params;
  const bail = await prisma.bail.findFirst({ where: { id: Number(id) || 0, statut: { not: "BROUILLON" }, lot: { bailleurId: b.id } }, include: { lot: { include: { bailleur: true } }, locataires: includeLocataires } });
  if (!bail || !bail.texteContrat?.trim()) return new Response("Contrat introuvable", { status: 404 });
  const pdf = await pdfContrat(bail);
  return reponseFichier(pdf, "application/pdf", `contrat-bail-${bail.id}.pdf`, req.nextUrl.searchParams.get("dl") === "1");
}
