import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { COOKIE_PROPRIETAIRE, DUREE_SESSION_PROPRIETAIRE_S, jetonProprietaireValide } from "@/lib/proprietaire";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Lien d'accès personnel du bailleur : ouvre la session de l'espace propriétaire puis redirige vers l'accueil. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ jeton: string }> }) {
  const { jeton } = await params;
  const bailleur = jetonProprietaireValide(jeton) ? await prisma.bailleur.findUnique({ where: { accesJeton: jeton }, select: { id: true } }) : null;
  if (!bailleur) {
    return new NextResponse(null, { status: 302, headers: { Location: `/proprietaire/connexion?erreur=${encodeURIComponent("Ce lien d'accès n'est plus valable : demandez-en un nouveau à votre gestionnaire.")}` } });
  }
  await prisma.bailleur.update({ where: { id: bailleur.id }, data: { accesDernierLe: new Date() } });
  const reponse = new NextResponse(null, { status: 302, headers: { Location: "/proprietaire" } });
  reponse.cookies.set(COOKIE_PROPRIETAIRE, jeton, { httpOnly: true, sameSite: "lax", secure: req.nextUrl.protocol === "https:" || req.headers.get("x-forwarded-proto") === "https", path: "/", maxAge: DUREE_SESSION_PROPRIETAIRE_S });
  return reponse;
}
