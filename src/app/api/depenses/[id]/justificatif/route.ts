import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { lireFichier } from "@/lib/storage";
import { reponseFichier } from "@/lib/http";

export const runtime = "nodejs";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const d = await prisma.depense.findUnique({ where: { id: Number(id) || 0 } });
  if (!d || !d.justificatifChemin) return new Response("Justificatif introuvable", { status: 404 });
  try {
    const contenu = await lireFichier(d.justificatifChemin);
    return reponseFichier(contenu, d.justificatifMime ?? "application/octet-stream", d.justificatifNom ?? "justificatif", req.nextUrl.searchParams.get("dl") === "1");
  } catch {
    return new Response("Fichier absent du stockage", { status: 404 });
  }
}
