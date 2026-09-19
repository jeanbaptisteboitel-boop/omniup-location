import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { entiteCouranteId } from "@/lib/entite";
import { pdfDocumentGenere } from "@/lib/pdf/documents";
import { reponsePdf } from "@/lib/http";

export const runtime = "nodejs";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const d = await prisma.documentGenere.findFirst({ where: { id: Number(id) || 0, entiteId: await entiteCouranteId() } });
  if (!d) return new Response("Document introuvable", { status: 404 });
  return reponsePdf(`${d.titre.replace(/[^\p{L}\p{N} _-]/gu, "").slice(0, 80) || "document"}.pdf`, req.nextUrl.searchParams.get("dl") === "1", () => pdfDocumentGenere(d), `document ${d.id}`);
}
