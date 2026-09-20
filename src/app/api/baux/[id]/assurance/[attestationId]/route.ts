import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { lireFichier, urlTelechargement } from "@/lib/storage";
import { reponseFichier } from "@/lib/http";
import { entiteCouranteId } from "@/lib/entite";

export const runtime = "nodejs";

/** Attestation d'assurance d'un bail de l'entité courante (gestionnaire). */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string; attestationId: string }> }) {
  const { id, attestationId } = await params;
  const a = await prisma.attestationAssurance.findFirst({
    where: { id: Number(attestationId) || 0, bailId: Number(id) || 0, bail: { entiteId: await entiteCouranteId() } },
  });
  if (!a?.chemin) return new Response("Attestation introuvable", { status: 404 });
  const nom = a.nomFichier ?? "attestation-assurance.pdf";
  const mime = a.mimeType ?? "application/pdf";
  const telecharger = req.nextUrl.searchParams.get("dl") === "1";
  try {
    const url = await urlTelechargement(a.chemin, nom, mime, telecharger);
    if (url) return Response.redirect(url, 302);
    return reponseFichier(await lireFichier(a.chemin), mime, nom, telecharger);
  } catch {
    return new Response("Fichier absent du stockage", { status: 404 });
  }
}
