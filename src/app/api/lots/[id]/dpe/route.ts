import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { lireFichier, urlTelechargement } from "@/lib/storage";
import { reponseFichier } from "@/lib/http";
import { entiteCouranteId } from "@/lib/entite";
import { exigerSession } from "@/lib/utilisateurs";

export const runtime = "nodejs";

/** Fichier du diagnostic de performance énergétique d'un lot de l'entité courante. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await exigerSession();
  const { id } = await params;
  const lot = await prisma.lot.findFirst({
    where: { id: Number(id) || 0, entiteId: await entiteCouranteId() },
    select: { dpeChemin: true, dpeNomFichier: true, dpeMimeType: true },
  });
  if (!lot?.dpeChemin) return new Response("Diagnostic introuvable", { status: 404 });
  const nom = lot.dpeNomFichier ?? "dpe.pdf";
  const mime = lot.dpeMimeType ?? "application/pdf";
  const telecharger = req.nextUrl.searchParams.get("dl") === "1";
  try {
    const url = await urlTelechargement(lot.dpeChemin, nom, mime, telecharger);
    if (url) return Response.redirect(url, 302);
    return reponseFichier(await lireFichier(lot.dpeChemin), mime, nom, telecharger);
  } catch {
    return new Response("Fichier absent du stockage", { status: 404 });
  }
}
