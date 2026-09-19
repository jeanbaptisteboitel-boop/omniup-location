import "server-only";
import { parseSdmx, type SerieSDMX } from "./parseur";

/**
 * Client du service web SDMX 2.1 de la Banque de données macroéconomiques (BDM) de l'INSEE :
 * accès libre, sans authentification (https://www.insee.fr/fr/information/2862759).
 * GET /series/sdmx/data/SERIES_BDM/{idbank1}+{idbank2}… — 400 idbanks au plus par requête.
 */

export const TAILLE_LOT = 400;
export const DELAI_MS = 30_000;
export const TENTATIVES = 3;
const USER_AGENT = "OMNIUP-Location/0.4 (gestion locative ; indices INSEE lus sur le service SDMX de la BDM)";

export class ErreurInsee extends Error {
  statut?: number;
  constructor(message: string, statut?: number) {
    super(message);
    this.name = "ErreurInsee";
    this.statut = statut;
  }
}

export type OptionsRequete = { startPeriod?: string; lastNObservations?: number };
/** Injection pour les tests : fonction fetch, attente entre deux tentatives, délai maximal. */
export type OptionsClient = { fetchImpl?: typeof fetch; pause?: (ms: number) => Promise<void>; delaiMs?: number };

/** Base du service (INSEE_URL permet de passer par un relais ou un serveur de test). */
export function baseInsee(): string {
  return (process.env.INSEE_URL ?? "").trim().replace(/\/+$/, "") || "https://bdm.insee.fr";
}

export function urlSeries(idbanks: string[], opts: OptionsRequete = {}, base = baseInsee()): string {
  const params = new URLSearchParams();
  if (opts.startPeriod) params.set("startPeriod", opts.startPeriod);
  if (opts.lastNObservations) params.set("lastNObservations", String(opts.lastNObservations));
  const q = params.toString();
  return `${base}/series/sdmx/data/SERIES_BDM/${idbanks.join("+")}${q ? `?${q}` : ""}`;
}

const attendre = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** Une requête ne doit pas être rejouée quand l'INSEE refuse la demande elle-même (idbank inconnu, paramètre invalide). */
function definitive(statut: number): boolean {
  return statut >= 400 && statut < 500 && statut !== 429;
}

/** Télécharge une URL avec un délai maximal et trois tentatives espacées de 1 s, 2 s puis 4 s. */
export async function telecharger(url: string, client: OptionsClient = {}): Promise<string> {
  const f = client.fetchImpl ?? fetch;
  const pause = client.pause ?? attendre;
  let derniere: Error | null = null;
  for (let tentative = 1; tentative <= TENTATIVES; tentative++) {
    try {
      const r = await f(url, { headers: { Accept: "application/xml", "User-Agent": USER_AGENT }, cache: "no-store", signal: AbortSignal.timeout(client.delaiMs ?? DELAI_MS) });
      if (r.ok) return await r.text();
      const corps = (await r.text().catch(() => "")).replace(/\s+/g, " ").trim().slice(0, 160);
      const e = new ErreurInsee(`Le service de l'INSEE a répondu « ${r.status} »${corps ? ` (${corps})` : ""}.`, r.status);
      if (definitive(r.status)) throw e;
      derniere = e;
    } catch (e) {
      if (e instanceof ErreurInsee && e.statut !== undefined && definitive(e.statut)) throw e;
      derniere = e instanceof Error ? e : new Error(String(e));
    }
    if (tentative < TENTATIVES) await pause(1000 * 2 ** (tentative - 1));
  }
  throw new ErreurInsee(`Service de l'INSEE injoignable après ${TENTATIVES} tentatives : ${derniere?.message ?? "erreur inconnue"}`);
}

/** Lit des séries par idbank (par lots de 400) et renvoie les séries analysées. */
export async function fetchSeries(idbanks: string[], opts: OptionsRequete = {}, client: OptionsClient = {}): Promise<SerieSDMX[]> {
  const uniques = Array.from(new Set(idbanks.map((i) => i.trim()).filter(Boolean)));
  const resultat: SerieSDMX[] = [];
  for (let i = 0; i < uniques.length; i += TAILLE_LOT) {
    const lot = uniques.slice(i, i + TAILLE_LOT);
    resultat.push(...parseSdmx(await telecharger(urlSeries(lot, opts), client)));
  }
  return resultat;
}
