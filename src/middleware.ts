import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_SESSION, protectionActive, verifierJeton } from "@/lib/session";

/** Protège l'application par mot de passe (APP_PASSWORD) lorsqu'elle est exposée sur Internet. */
export async function middleware(req: NextRequest) {
  if (!protectionActive()) return NextResponse.next();
  if (await verifierJeton(req.cookies.get(COOKIE_SESSION)?.value)) return NextResponse.next();
  if (req.nextUrl.pathname.startsWith("/api/")) return NextResponse.json({ erreur: "Authentification requise." }, { status: 401 });
  const url = req.nextUrl.clone();
  url.pathname = "/connexion";
  url.search = "";
  const suite = req.nextUrl.pathname + req.nextUrl.search;
  if (suite !== "/") url.searchParams.set("suite", suite);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|connexion|api/cron/).*)"],
};
