import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { includeAppel } from "@/lib/pdf/donnees";
import { pdfQuittance } from "@/lib/pdf/loyers";
import { numeroQuittance } from "@/lib/loyers";
import { reponseFichier } from "@/lib/http";
import { bailleurConnecte } from "@/lib/proprietaire";

export const runtime = "nodejs";

/** Quittance (paiement intégral) ou reçu (paiement partiel) d'un appel de loyer d'un lot du bailleur connecté. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const b = await bailleurConnecte();
  if (!b) return new Response("Authentification requise", { status: 401 });
  const { id } = await params;
  const appel = await prisma.appelLoyer.findFirst({ where: { id: Number(id) || 0, bail: { lot: { bailleurId: b.id } } }, include: includeAppel });
  if (!appel) return new Response("Appel de loyer introuvable", { status: 404 });
  if (appel.paiements.length === 0) return new Response("Aucun paiement enregistré pour cette échéance", { status: 400 });
  const pdf = await pdfQuittance(appel);
  return reponseFichier(pdf, "application/pdf", `quittance-${numeroQuittance(appel.id)}.pdf`, req.nextUrl.searchParams.get("dl") === "1");
}
