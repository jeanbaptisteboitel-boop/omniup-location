import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { lireFichier, urlTelechargement } from "@/lib/storage";
import { reponseFichier } from "@/lib/http";
import { bailleurConnecte, whereDepensesDuBailleur } from "@/lib/proprietaire";

export const runtime = "nodejs";

/** Justificatif (facture) d'une dépense d'un lot ou d'un immeuble du bailleur connecté. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const b = await bailleurConnecte();
  if (!b) return new Response("Authentification requise", { status: 401 });
  const { id } = await params;
  const d = await prisma.depense.findFirst({ where: { id: Number(id) || 0, ...whereDepensesDuBailleur(b.id) } });
  if (!d?.justificatifChemin) return new Response("Justificatif introuvable", { status: 404 });
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
