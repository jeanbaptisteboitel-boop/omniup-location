import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseSdmx } from "../parseur";

const fixture = (nom: string) => readFileSync(new URL(`../__fixtures__/${nom}`, import.meta.url), "utf8");

describe("parseSdmx", () => {
  it("lit une série trimestrielle avec ses attributs", () => {
    const [serie] = parseSdmx(fixture("irl-trimestriel.xml"));
    expect(serie.idbank).toBe("001515333");
    expect(serie.titre).toBe("Indice de référence des loyers - Ensemble - Base 4e trimestre 1998 - 100");
    expect(serie.frequence).toBe("T");
    expect(serie.base).toBe("1998-Q4");
    expect(serie.miseAJour).toBe("2026-07-11");
    expect(serie.observations).toHaveLength(5);
    expect(serie.observations[0]).toEqual({ periode: "2026-Q2", valeur: "147.10", statut: "A" });
    expect(typeof serie.observations[0].valeur).toBe("string");
  });
  it("lit une série mensuelle avec une valeur provisoire et ignore une observation sans valeur", () => {
    const [serie] = parseSdmx(fixture("bt01-mensuel-provisoire.xml"));
    expect(serie.frequence).toBe("M");
    expect(serie.observations.map((o) => [o.periode, o.valeur, o.statut])).toEqual([
      ["2026-06", "134.2", "P"],
      ["2026-05", "134.0", "A"],
      ["2026-04", "133.8", "A"],
    ]);
  });
  it("tolère une série sans observation", () => {
    const series = parseSdmx(fixture("serie-vide.xml"));
    expect(series).toHaveLength(1);
    expect(series[0].idbank).toBe("000000000");
    expect(series[0].observations).toEqual([]);
  });
  it("lit plusieurs séries dans une même réponse", () => {
    const series = parseSdmx(fixture("deux-series.xml"));
    expect(series.map((s) => s.idbank)).toEqual(["001532540", "001617112"]);
    expect(series[1].observations).toHaveLength(2);
  });
  it("renvoie une liste vide pour une réponse vide et signale un XML invalide", () => {
    expect(parseSdmx("")).toEqual([]);
    expect(parseSdmx("<rien/>")).toEqual([]);
    expect(() => parseSdmx("<a><b></a>")).toThrow(/illisible/);
  });
});
