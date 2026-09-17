import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { lireFichier, urlTelechargement } from "@/lib/storage";
import { reponseFichier } from "@/lib/http";

export const runtime = "nodejs";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const d = await prisma.depense.findUnique({ where: { id: Number(id) || 0 } });
  if (!d || !d.justificatifChemin) return new Response("Justificatif introuvable", { status: 404 });
  const telecharger = req.nextUrl.searchParams.get("dl") === "1";
  const mime = d.justificatifMime ?? "application/octet-stream";
  const nom = d.justificatifNom ?? "justificatif";
  try {
    const url = await urlTelechargement(d.justificatifChemin, nom, mime, telecharger);
    if (url) return Response.redirect(url, 302);
    const contenu = await lireFichier(d.justificatifChemin);
    return reponseFichier(contenu, mime, nom, telecharger);
  } catch {
    return new Response("Fichier absent du stockage", { status: 404 });
  }
}
