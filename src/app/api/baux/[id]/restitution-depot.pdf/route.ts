import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { pdfRestitutionDepot } from "@/lib/pdf/sortie";
import { reponsePdf } from "@/lib/http";
import { entiteCouranteId } from "@/lib/entite";
import { includeLocataires } from "@/lib/locataires";
import { aujourdhui } from "@/lib/dates";
import { soldeBail } from "@/lib/espace";

export const runtime = "nodejs";

/** Décompte de restitution du dépôt de garantie (lettre remise au locataire à son départ). */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const bail = await prisma.bail.findFirst({
    where: { id: Number(id) || 0, entiteId: await entiteCouranteId() },
    include: { lot: { include: { bailleur: true } }, locataires: includeLocataires, retenuesDepot: { orderBy: { createdAt: "asc" } }, appels: { include: { paiements: true } } },
  });
  if (!bail) return new Response("Bail introuvable", { status: 404 });
  const impayes = soldeBail(bail.appels, aujourdhui()).total;
  return reponsePdf(`restitution-depot-bail-${bail.id}.pdf`, req.nextUrl.searchParams.get("dl") === "1", () => pdfRestitutionDepot(bail, impayes), `restitution du dépôt ${bail.id}`);
}
