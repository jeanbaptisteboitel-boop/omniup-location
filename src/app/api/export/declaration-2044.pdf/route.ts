import { NextRequest } from "next/server";
import { calculer2044 } from "@/lib/declaration-2044";
import { pdfDeclaration2044 } from "@/lib/pdf/declaration-2044";
import { reponsePdf } from "@/lib/http";
import { entiteCourante } from "@/lib/entite";

export const runtime = "nodejs";

/** État d'aide au remplissage de la déclaration 2044 pour une année de revenus. */
export async function GET(req: NextRequest) {
  const annee = Number(req.nextUrl.searchParams.get("annee")) || new Date().getFullYear() - 1;
  const entite = await entiteCourante();
  const r = await calculer2044(annee, entite.id);
  return reponsePdf(`aide-declaration-2044-${annee}.pdf`, req.nextUrl.searchParams.get("dl") === "1", () => pdfDeclaration2044(r, entite.nom), `aide 2044 ${annee}`);
}
