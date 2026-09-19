import { NextRequest } from "next/server";
import { synchroniserIndices } from "@/lib/insee/sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Synchronisation planifiée des indices INSEE (quotidienne, 9 h 30 heure de Paris via vercel.json) :
 * GET ou POST /api/cron/indices?secret=CRON_SECRET (ou en-tête Authorization: Bearer).
 * Un échec isolé du service de l'INSEE est journalisé sans faire échouer l'exécution.
 */
async function executer(req: NextRequest): Promise<Response> {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const fourni = req.nextUrl.searchParams.get("secret") ?? req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    if (fourni !== secret) return Response.json({ erreur: "Secret invalide." }, { status: 401 });
  }
  const r = await synchroniserIndices({ declencheur: "cron" });
  return Response.json({ date: new Date().toISOString(), journalId: r.id, seriesInterrogees: r.seriesInterrogees, observationsCreees: r.observationsCreees, observationsMisesAJour: r.observationsMisesAJour, erreurs: r.erreurs, alertes: r.alertes, details: r.details });
}

export async function GET(req: NextRequest) {
  return executer(req);
}

export async function POST(req: NextRequest) {
  return executer(req);
}

export const maxDuration = 300;
