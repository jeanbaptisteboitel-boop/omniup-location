import { NextRequest } from "next/server";
import { synchroniserAppelsLoyer } from "@/lib/loyers-sync";
import { mailConfigure } from "@/lib/mail";
import { envoyerAvisNonEnvoyesSilencieux } from "@/actions/loyers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Génération planifiée des appels de loyer (à appeler chaque jour par une tâche planifiée,
 * un cron ou un scénario Make) : GET ou POST /api/cron/loyers?secret=CRON_SECRET
 * Avec AVIS_ENVOI_AUTO=true et l'envoi d'emails configuré (Resend ou SMTP), les avis nouvellement émis sont envoyés par email.
 */
async function executer(req: NextRequest): Promise<Response> {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const fourni = req.nextUrl.searchParams.get("secret") ?? req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    if (fourni !== secret) return Response.json({ erreur: "Secret invalide." }, { status: 401 });
  }
  const crees = await synchroniserAppelsLoyer();
  const auto = String(process.env.AVIS_ENVOI_AUTO ?? "").toLowerCase() === "true";
  let envois: { envoyes: number; erreurs: string[] } | null = null;
  if (auto && mailConfigure()) envois = await envoyerAvisNonEnvoyesSilencieux();
  return Response.json({ date: new Date().toISOString(), appelsEmis: crees.length, periodes: crees.map((c) => ({ bailId: c.bailId, periode: c.periode, total: c.total })), envoisAutomatiques: envois });
}

export async function GET(req: NextRequest) {
  return executer(req);
}

export async function POST(req: NextRequest) {
  return executer(req);
}

// Durée maximale d'exécution sur Vercel (rédaction IA, OCR, envois d'emails).
export const maxDuration = 300;
