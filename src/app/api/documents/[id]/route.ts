import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { lireFichier, urlTelechargement } from "@/lib/storage";
import { reponseFichier } from "@/lib/http";
import { entiteCouranteId } from "@/lib/entite";

export const runtime = "nodejs";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const doc = await prisma.document.findUnique({ where: { id: Number(id) || 0 }, include: { locataire: { select: { entiteId: true } } } });
  if (!doc || doc.locataire.entiteId !== (await entiteCouranteId())) return new Response("Document introuvable", { status: 404 });
  const telecharger = req.nextUrl.searchParams.get("dl") === "1";
  try {
    const url = await urlTelechargement(doc.chemin, doc.nomFichier, doc.mimeType, telecharger);
    if (url) return Response.redirect(url, 302);
    const contenu = await lireFichier(doc.chemin);
    return reponseFichier(contenu, doc.mimeType, doc.nomFichier, telecharger);
  } catch {
    return new Response("Fichier absent du stockage", { status: 404 });
  }
}
