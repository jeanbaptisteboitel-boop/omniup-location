import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { lireFichier, urlTelechargement } from "@/lib/storage";
import { reponseFichier } from "@/lib/http";
import { bailleurConnecte } from "@/lib/proprietaire";

export const runtime = "nodejs";

/** Exemplaire signé du contrat d'un bail d'un lot du bailleur connecté. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const b = await bailleurConnecte();
  if (!b) return new Response("Authentification requise", { status: 401 });
  const { id } = await params;
  const bail = await prisma.bail.findFirst({ where: { id: Number(id) || 0, statut: { not: "BROUILLON" }, lot: { bailleurId: b.id } }, select: { contratSigneChemin: true, contratSigneNom: true, contratSigneMime: true } });
  if (!bail?.contratSigneChemin) return new Response("Exemplaire signé introuvable", { status: 404 });
  const telecharger = req.nextUrl.searchParams.get("dl") === "1";
  try {
    const url = await urlTelechargement(bail.contratSigneChemin, bail.contratSigneNom ?? "contrat-signe.pdf", bail.contratSigneMime ?? "application/pdf", telecharger);
    if (url) return Response.redirect(url, 302);
    const contenu = await lireFichier(bail.contratSigneChemin);
    return reponseFichier(contenu, bail.contratSigneMime ?? "application/pdf", bail.contratSigneNom ?? "contrat-signe.pdf", telecharger);
  } catch {
    return new Response("Fichier absent du stockage", { status: 404 });
  }
}
