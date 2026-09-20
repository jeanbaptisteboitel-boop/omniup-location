import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { lireFichier, urlTelechargement } from "@/lib/storage";
import { reponseFichier } from "@/lib/http";
import { entiteCouranteId } from "@/lib/entite";
import { exigerSession } from "@/lib/utilisateurs";

export const runtime = "nodejs";

/** Justificatif d'une candidature de l'entité courante (gestionnaire). */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await exigerSession();
  const { id } = await params;
  const piece = await prisma.pieceCandidature.findFirst({
    where: { id: Number(id) || 0, dossier: { candidature: { entiteId: await entiteCouranteId() } } },
  });
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
