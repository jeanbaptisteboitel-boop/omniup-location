import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { includeAppel } from "@/lib/pdf/donnees";
import { pdfQuittance } from "@/lib/pdf/loyers";
import { numeroQuittance } from "@/lib/loyers";
import { reponsePdf } from "@/lib/http";
import { locataireConnecte } from "@/lib/espace";

export const runtime = "nodejs";

/** Quittance (paiement intégral) ou reçu (paiement partiel) d'un appel de loyer du locataire connecté. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const l = await locataireConnecte();
  if (!l) return new Response("Authentification requise", { status: 401 });
  const { id } = await params;
  const appel = await prisma.appelLoyer.findFirst({ where: { id: Number(id) || 0, bail: { locataires: { some: { id: l.id } } } }, include: includeAppel });
  if (!appel) return new Response("Appel de loyer introuvable", { status: 404 });
  if (appel.paiements.length === 0) return new Response("Aucun paiement enregistré pour cette échéance", { status: 400 });
  return reponsePdf(`quittance-${numeroQuittance(appel.id)}.pdf`, req.nextUrl.searchParams.get("dl") === "1", () => pdfQuittance(appel), `quittance ${appel.id}`);
}
