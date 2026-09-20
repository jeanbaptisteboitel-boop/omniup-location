import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { lireFichier, urlTelechargement } from "@/lib/storage";
import { reponseFichier } from "@/lib/http";
import { dossierConnecte } from "@/lib/candidat";

export const runtime = "nodejs";

/** Justificatif déposé par le candidat connecté : il ne peut relire que les pièces de son propre dossier. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const d = await dossierConnecte();
  if (!d) return new Response("Authentification requise", { status: 401 });
  const { id } = await params;
  const piece = await prisma.pieceCandidature.findFirst({ where: { id: Number(id) || 0, dossierId: d.id } });
  if (!piece) return new Response("Justificatif introuvable", { status: 404 });
  const telecharger = req.nextUrl.searchParams.get("dl") === "1";
  try {
    const url = await urlTelechargement(piece.chemin, piece.nomFichier, piece.mimeType, telecharger);
    if (url) return Response.redirect(url, 302);
    return reponseFichier(await lireFichier(piece.chemin), piece.mimeType, piece.nomFichier, telecharger);
  } catch {
    return new Response("Fichier absent du stockage", { status: 404 });
  }
}
