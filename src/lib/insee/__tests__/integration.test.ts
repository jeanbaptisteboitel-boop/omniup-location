import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { fetchSeries } from "../client";

/**
 * Test d'intégration contre le service réel de l'INSEE, exclu par défaut :
 * INSEE_INTEGRATION=1 npx vitest run src/lib/insee/__tests__/integration.test.ts
 */
describe.skipIf(!process.env.INSEE_INTEGRATION)("service SDMX de la BDM (réel)", () => {
  it("renvoie la dernière valeur de l'IRL avec son libellé officiel", async () => {
    const [serie] = await fetchSeries(["001515333"], { lastNObservations: 1 });
    expect(serie.idbank).toBe("001515333");
    expect(serie.titre?.toLowerCase()).toContain("indice de référence des loyers");
    expect(serie.observations).toHaveLength(1);
    expect(serie.observations[0].periode).toMatch(/^\d{4}-Q[1-4]$/);
  }, 60_000);
});
