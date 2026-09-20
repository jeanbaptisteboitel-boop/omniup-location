import { NextRequest } from "next/server";
import { relancerAssurances } from "@/lib/assurances-relance";
import { origineApplication } from "@/lib/espace";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Relance planifiée des attestations d'assurance habitation :
 * GET ou POST /api/cron/assurances?secret=CRON_SECRET (Vercel transmet le secret en en-tête Authorization).
 */
async function executer(req: NextRequest): Promise<Response> {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const fourni = req.nextUrl.searchParams.get("secret") ?? req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    if (fourni !== secret) return Response.json({ erreur: "Secret invalide." }, { status: 401 });
  }
  const r = await relancerAssurances(await origineApplication());
  return Response.json({ date: new Date().toISOString(), ...r });
}

export async function GET(req: NextRequest) {
  return executer(req);
}

export async function POST(req: NextRequest) {
  return executer(req);
}

export const maxDuration = 300;
