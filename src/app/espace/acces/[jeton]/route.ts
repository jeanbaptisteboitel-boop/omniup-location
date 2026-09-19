import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { COOKIE_ESPACE, DUREE_SESSION_ESPACE_S, jetonValide } from "@/lib/espace";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Lien d'accès personnel du locataire : ouvre la session de l'espace locataire puis redirige vers l'accueil. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ jeton: string }> }) {
  const { jeton } = await params;
  const locataire = jetonValide(jeton) ? await prisma.locataire.findUnique({ where: { accesJeton: jeton }, select: { id: true } }) : null;
  if (!locataire) {
    return new NextResponse(null, { status: 302, headers: { Location: `/espace/connexion?erreur=${encodeURIComponent("Ce lien d'accès n'est plus valable : demandez-en un nouveau à votre bailleur.")}` } });
  }
  await prisma.locataire.update({ where: { id: locataire.id }, data: { accesDernierLe: new Date() } });
  const reponse = new NextResponse(null, { status: 302, headers: { Location: "/espace" } });
  reponse.cookies.set(COOKIE_ESPACE, jeton, { httpOnly: true, sameSite: "lax", secure: req.nextUrl.protocol === "https:" || req.headers.get("x-forwarded-proto") === "https", path: "/", maxAge: DUREE_SESSION_ESPACE_S });
  return reponse;
}
