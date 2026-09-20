import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { lireFichier, urlTelechargement } from "@/lib/storage";
import { reponseFichier } from "@/lib/http";
import { entiteCouranteId } from "@/lib/entite";

export const runtime = "nodejs";

/** Pièce jointe d'un ticket d'assistance de l'entité courante. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const t = await prisma.ticket.findFirst({ where: { id: Number(id) || 0, entiteId: await entiteCouranteId() } });
  if (!t?.chemin) return new Response("Pièce jointe introuvable", { status: 404 });
  const nom = t.nomFichier ?? "piece-jointe";
  const mime = t.mimeType ?? "application/octet-stream";
  const telecharger = req.nextUrl.searchParams.get("dl") === "1";
  try {
    const url = await urlTelechargement(t.chemin, nom, mime, telecharger);
    if (url) return Response.redirect(url, 302);
    return reponseFichier(await lireFichier(t.chemin), mime, nom, telecharger);
  } catch {
    return new Response("Fichier absent du stockage", { status: 404 });
  }
}
