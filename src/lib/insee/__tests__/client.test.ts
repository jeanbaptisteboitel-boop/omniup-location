import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { ErreurInsee, TAILLE_LOT, fetchSeries, telecharger, urlSeries } from "../client";

const xml = readFileSync(new URL("../__fixtures__/irl-trimestriel.xml", import.meta.url), "utf8");
const reponse = (corps: string, status = 200) => new Response(corps, { status });

describe("client INSEE", () => {
  it("construit l'URL du service SDMX", () => {
    expect(urlSeries(["001515333", "001532540"], { lastNObservations: 6 }, "https://bdm.insee.fr")).toBe("https://bdm.insee.fr/series/sdmx/data/SERIES_BDM/001515333+001532540?lastNObservations=6");
    expect(urlSeries(["001515333"], { startPeriod: "2000-Q1" }, "http://relais")).toBe("http://relais/series/sdmx/data/SERIES_BDM/001515333?startPeriod=2000-Q1");
  });

  it("envoie un User-Agent explicite et lit la réponse", async () => {
    const fetchImpl = vi.fn(async () => reponse(xml));
    const series = await fetchSeries(["001515333"], { lastNObservations: 1 }, { fetchImpl: fetchImpl as unknown as typeof fetch });
    expect(series[0].idbank).toBe("001515333");
    const [, init] = (fetchImpl.mock.calls as unknown as [string, RequestInit][])[0];
    expect((init.headers as Record<string, string>)["User-Agent"]).toMatch(/OMNIUP-Location/);
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it("découpe les idbanks par lots de 400 au plus", async () => {
    const idbanks = Array.from({ length: 850 }, (_, i) => String(i).padStart(9, "0"));
    const fetchImpl = vi.fn(async () => reponse("<r/>"));
    await fetchSeries(idbanks, {}, { fetchImpl: fetchImpl as unknown as typeof fetch });
    expect(fetchImpl).toHaveBeenCalledTimes(3);
    const premiere = String((fetchImpl.mock.calls as unknown as [string][])[0][0]);
    expect(premiere.split("+")).toHaveLength(TAILLE_LOT);
  });

  it("réessaie après une erreur serveur ou réseau, avec attente croissante", async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(reponse("KO", 503)).mockRejectedValueOnce(new TypeError("fetch failed")).mockResolvedValueOnce(reponse(xml));
    const pause = vi.fn(async (_ms: number) => {});
    const texte = await telecharger("http://relais/x", { fetchImpl: fetchImpl as unknown as typeof fetch, pause });
    expect(texte).toContain("001515333");
    expect(fetchImpl).toHaveBeenCalledTimes(3);
    expect(pause.mock.calls.map((c) => c[0])).toEqual([1000, 2000]);
  });

  it("abandonne après trois tentatives", async () => {
    const fetchImpl = vi.fn(async () => reponse("Service Unavailable", 503));
    await expect(telecharger("http://relais/x", { fetchImpl: fetchImpl as unknown as typeof fetch, pause: async () => {} })).rejects.toThrow(/injoignable après 3 tentatives/);
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });

  it("ne rejoue pas une requête refusée (idbank inconnu)", async () => {
    const fetchImpl = vi.fn(async () => reponse("No results found", 404));
    const pause = vi.fn(async () => {});
    await expect(telecharger("http://relais/x", { fetchImpl: fetchImpl as unknown as typeof fetch, pause })).rejects.toBeInstanceOf(ErreurInsee);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(pause).not.toHaveBeenCalled();
  });
});
