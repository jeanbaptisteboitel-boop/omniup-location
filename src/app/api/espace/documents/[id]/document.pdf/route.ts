import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { pdfDocumentGenere } from "@/lib/pdf/documents";
import { reponsePdf } from "@/lib/http";
import { locataireConnecte } from "@/lib/espace";

export const runtime = "nodejs";

/** Document (avenant, renouvellement, résiliation…) envoyé ou remis au locataire connecté. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const l = await locataireConnecte();
  if (!l) return new Response("Authentification requise", { status: 401 });
  const { id } = await params;
  const d = await prisma.documentGenere.findFirst({ where: { id: Number(id) || 0, dateEnvoi: { not: null }, bail: { locataires: { some: { id: l.id } } } } });
  if (!d) return new Response("Document introuvable", { status: 404 });
  return reponsePdf(`document-${d.id}.pdf`, req.nextUrl.searchParams.get("dl") === "1", () => pdfDocumentGenere(d), `document ${d.id}`);
}
