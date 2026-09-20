import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jetonValide } from "@/lib/espace";
import { COOKIE_CANDIDAT, DUREE_SESSION_CANDIDAT_S } from "@/lib/candidat";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Lien personnel d'un dossier de candidature : ouvre la session puis redirige vers l'espace candidat. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ jeton: string }> }) {
  const { jeton } = await params;
  const dossier = jetonValide(jeton) ? await prisma.dossierCandidature.findUnique({ where: { accesJeton: jeton }, select: { id: true } }) : null;
  if (!dossier) {
    return new NextResponse(null, { status: 302, headers: { Location: `/candidature/connexion?erreur=${encodeURIComponent("Ce lien n'est plus valable : demandez-en un nouveau au bailleur.")}` } });
  }
  await prisma.dossierCandidature.update({ where: { id: dossier.id }, data: { accesDernierLe: new Date() } });
  const reponse = new NextResponse(null, { status: 302, headers: { Location: "/candidature" } });
  reponse.cookies.set(COOKIE_CANDIDAT, jeton, {
    httpOnly: true,
    sameSite: "lax",
    secure: req.nextUrl.protocol === "https:" || req.headers.get("x-forwarded-proto") === "https",
    path: "/",
    maxAge: DUREE_SESSION_CANDIDAT_S,
  });
  return reponse;
}
