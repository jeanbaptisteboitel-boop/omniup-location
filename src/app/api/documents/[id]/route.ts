import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { lireFichier } from "@/lib/storage";
import { reponseFichier } from "@/lib/http";

export const runtime = "nodejs";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const doc = await prisma.document.findUnique({ where: { id: Number(id) || 0 } });
  if (!doc) return new Response("Document introuvable", { status: 404 });
  try {
    const contenu = await lireFichier(doc.chemin);
    return reponseFichier(contenu, doc.mimeType, doc.nomFichier, req.nextUrl.searchParams.get("dl") === "1");
  } catch {
    return new Response("Fichier absent du stockage", { status: 404 });
  }
}
