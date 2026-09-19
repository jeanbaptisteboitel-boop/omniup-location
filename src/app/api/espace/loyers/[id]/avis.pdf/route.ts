import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { includeAppel } from "@/lib/pdf/donnees";
import { pdfAvisEcheance } from "@/lib/pdf/loyers";
import { numeroAppel } from "@/lib/loyers";
import { reponsePdf } from "@/lib/http";
import { locataireConnecte } from "@/lib/espace";

export const runtime = "nodejs";

/** Avis d'échéance d'un appel de loyer d'un bail du locataire connecté. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const l = await locataireConnecte();
  if (!l) return new Response("Authentification requise", { status: 401 });
  const { id } = await params;
  const appel = await prisma.appelLoyer.findFirst({ where: { id: Number(id) || 0, bail: { locataires: { some: { id: l.id } } } }, include: includeAppel });
  if (!appel) return new Response("Appel de loyer introuvable", { status: 404 });
  return reponsePdf(`avis-echeance-${numeroAppel(appel.id)}.pdf`, req.nextUrl.searchParams.get("dl") === "1", () => pdfAvisEcheance(appel), `avis d'échéance ${appel.id}`);
}
