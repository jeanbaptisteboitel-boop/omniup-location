/**
 * Session signée (HMAC-SHA256 via Web Crypto : fonctionne dans le middleware Edge et côté serveur Node).
 * Activée uniquement si APP_PASSWORD est défini.
 */

export const COOKIE_SESSION = "omniup_session";
const DUREE_SESSION_S = 30 * 24 * 3600;

export function protectionActive(): boolean {
  return !!process.env.APP_PASSWORD;
}

function secret(): string {
  return process.env.APP_SECRET || process.env.APP_PASSWORD || "";
}

async function hmac(message: string): Promise<string> {
  const cle = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret()), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", cle, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function creerJeton(): Promise<{ valeur: string; maxAge: number }> {
  const expiration = Math.floor(Date.now() / 1000) + DUREE_SESSION_S;
  return { valeur: `${expiration}.${await hmac(`omniup|${expiration}`)}`, maxAge: DUREE_SESSION_S };
}

export async function verifierJeton(valeur: string | undefined): Promise<boolean> {
  if (!valeur) return false;
  const [exp, signature] = valeur.split(".");
  if (!exp || !signature) return false;
  const expiration = Number(exp);
  if (!Number.isFinite(expiration) || expiration < Math.floor(Date.now() / 1000)) return false;
  const attendu = await hmac(`omniup|${expiration}`);
  if (attendu.length !== signature.length) return false;
  let diff = 0;
  for (let i = 0; i < attendu.length; i++) diff |= attendu.charCodeAt(i) ^ signature.charCodeAt(i);
  return diff === 0;
}

/** Comparaison à temps constant du mot de passe saisi. */
export async function motDePasseValide(saisi: string): Promise<boolean> {
  const a = await hmac(`mdp|${saisi}`);
  const b = await hmac(`mdp|${process.env.APP_PASSWORD ?? ""}`);
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0 && !!process.env.APP_PASSWORD;
}
