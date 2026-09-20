import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { lireFichier, urlTelechargement } from "@/lib/storage";
import { reponseFichier } from "@/lib/http";
import { entiteCouranteId } from "@/lib/entite";

export const runtime = "nodejs";

/** Pièce jointe d'un message de maintenance (gestionnaire : demande de l'entité de travail). */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string; messageId: string }> }) {
  const { id, messageId } = await params;
  const message = await prisma.messageMaintenance.findFirst({
    where: { id: Number(messageId) || 0, demandeId: Number(id) || 0, demande: { entiteId: await entiteCouranteId() } },
    select: { chemin: true, nomFichier: true, mimeType: true },
  });
  if (!message?.chemin) return new Response("Pièce jointe introuvable", { status: 404 });
  const nom = message.nomFichier ?? "piece-jointe";
  const type = message.mimeType ?? "application/octet-stream";
  const telecharger = req.nextUrl.searchParams.get("dl") === "1";
  try {
    const url = await urlTelechargement(message.chemin, nom, type, telecharger);
    if (url) return Response.redirect(url, 302);
    return reponseFichier(await lireFichier(message.chemin), type, nom, telecharger);
  } catch {
    return new Response("Fichier absent du stockage", { status: 404 });
  }
}
