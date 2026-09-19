/**
 * Session signée (HMAC-SHA256 via Web Crypto : fonctionne dans le middleware Edge et côté serveur Node).
 * Active dès qu'un mot de passe principal (APP_PASSWORD) ou un secret de session (APP_SECRET, comptes utilisateurs) est défini.
 * Deux formes de jeton : « u12.expiration.signature » pour un utilisateur, « expiration.signature » pour le mot de passe principal.
 */

export const COOKIE_SESSION = "omniup_session";
const DUREE_SESSION_S = 30 * 24 * 3600;

export function protectionActive(): boolean {
  return !!(process.env.APP_PASSWORD || process.env.APP_SECRET);
}

export function motDePassePrincipalDefini(): boolean {
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

function egal(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export type JetonSession = { utilisateurId: number | null; expiration: number };

/** Jeton d'un utilisateur (identifiant fourni) ou du compte principal. */
export async function creerJeton(utilisateurId?: number): Promise<{ valeur: string; maxAge: number }> {
  const expiration = Math.floor(Date.now() / 1000) + DUREE_SESSION_S;
  if (utilisateurId) return { valeur: `u${utilisateurId}.${expiration}.${await hmac(`omniup|u|${utilisateurId}|${expiration}`)}`, maxAge: DUREE_SESSION_S };
  return { valeur: `${expiration}.${await hmac(`omniup|${expiration}`)}`, maxAge: DUREE_SESSION_S };
}

/** Contenu d'un jeton valide (signature et date), sinon null. */
export async function analyserJeton(valeur: string | undefined | null): Promise<JetonSession | null> {
  if (!valeur) return null;
  const parties = valeur.split(".");
  let utilisateurId: number | null = null;
  let exp: string;
  let signature: string;
  let message: string;
  if (parties.length === 3 && /^u\d+$/.test(parties[0])) {
    utilisateurId = Number(parties[0].slice(1));
    [, exp, signature] = parties;
    message = `omniup|u|${utilisateurId}|${exp}`;
  } else if (parties.length === 2) {
    [exp, signature] = parties;
    message = `omniup|${exp}`;
  } else {
    return null;
  }
  const expiration = Number(exp);
  if (!/^\d+$/.test(exp) || !Number.isFinite(expiration) || expiration < Math.floor(Date.now() / 1000)) return null;
  if (!egal(await hmac(message), signature)) return null;
  return { utilisateurId, expiration };
}

export async function verifierJeton(valeur: string | undefined): Promise<boolean> {
  return (await analyserJeton(valeur)) !== null;
}

/** Comparaison à temps constant du mot de passe principal saisi. */
export async function motDePasseValide(saisi: string): Promise<boolean> {
  const a = await hmac(`mdp|${saisi}`);
  const b = await hmac(`mdp|${process.env.APP_PASSWORD ?? ""}`);
  return egal(a, b) && !!process.env.APP_PASSWORD;
}
