import "server-only";
import { headers } from "next/headers";

/**
 * Cloudflare Turnstile : protection anti-robots des formulaires publics (demande de lien d'accès, connexion).
 * Active dès que TURNSTILE_SITE_KEY et TURNSTILE_SECRET_KEY sont renseignées ; sinon les formulaires restent utilisables sans contrôle.
 */

export function turnstileConfigure(): boolean {
  return !!(process.env.TURNSTILE_SITE_KEY && process.env.TURNSTILE_SECRET_KEY);
}

export function turnstileSiteKey(): string | null {
  return turnstileConfigure() ? process.env.TURNSTILE_SITE_KEY! : null;
}

/** Vérifie le jeton renvoyé par le widget (champ cf-turnstile-response) ; renvoie null si tout va bien, sinon un message. */
export async function verifierTurnstile(fd: FormData): Promise<string | null> {
  if (!turnstileConfigure()) return null;
  const jeton = String(fd.get("cf-turnstile-response") ?? "").trim();
  if (!jeton) return "Merci de valider le contrôle anti-robots avant d'envoyer le formulaire.";
  const h = await headers();
  const ip = (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || h.get("x-real-ip") || undefined;
  try {
    const r = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret: process.env.TURNSTILE_SECRET_KEY, response: jeton, ...(ip ? { remoteip: ip } : {}) }),
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    const corps = (await r.json()) as { success?: boolean; "error-codes"?: string[] };
    if (!corps.success) return "Le contrôle anti-robots a échoué : rechargez la page et réessayez.";
    return null;
  } catch {
    return "Le contrôle anti-robots est momentanément indisponible : réessayez dans quelques instants.";
  }
}
