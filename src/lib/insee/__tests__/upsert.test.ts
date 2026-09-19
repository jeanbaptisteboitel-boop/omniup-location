import { describe, expect, it } from "vitest";
import { memeValeur, planifierUpsert } from "../upsert";

const recues = [
  { periode: "2026-Q2", valeur: "147.10", statut: "P" },
  { periode: "2026-Q1", valeur: "146.55", statut: "A" },
  { periode: "2025-Q4", valeur: "146.00", statut: "A" },
];

describe("planifierUpsert", () => {
  it("compare les valeurs en numérique exact", () => {
    expect(memeValeur("147.10", "147.1")).toBe(true);
    expect(memeValeur("147.10", "147.11")).toBe(false);
    expect(memeValeur("abc", "abc")).toBe(true);
  });
  it("insère tout quand la base est vide", () => {
    const plan = planifierUpsert([], recues);
    expect(plan.aCreer.map((o) => o.periode)).toEqual(["2026-Q2", "2026-Q1", "2025-Q4"]);
    expect(plan.aCreer[0].debutPeriode.toISOString()).toBe("2026-04-01T00:00:00.000Z");
    expect(plan.aMettreAJour).toEqual([]);
    expect(plan.inchangees).toBe(0);
  });
  it("met à jour une valeur révisée ou passée de provisoire à définitive, et journalise l'ancienne valeur", () => {
    const existantes = [
      { periode: "2026-Q2", valeur: "147.1", statut: "P" },
      { periode: "2026-Q1", valeur: "146.5", statut: "A" },
      { periode: "2025-Q4", valeur: "146", statut: "A" },
    ];
    const plan = planifierUpsert(existantes, [{ periode: "2026-Q2", valeur: "147.10", statut: "A" }, { periode: "2026-Q1", valeur: "146.55", statut: "A" }, { periode: "2025-Q4", valeur: "146.00", statut: "A" }]);
    expect(plan.aCreer).toEqual([]);
    expect(plan.aMettreAJour.map((m) => [m.periode, m.ancienne.valeur, m.nouvelle.valeur, m.ancienne.statut, m.nouvelle.statut])).toEqual([
      ["2026-Q2", "147.1", "147.10", "P", "A"],
      ["2026-Q1", "146.5", "146.55", "A", "A"],
    ]);
    expect(plan.inchangees).toBe(1);
  });
  it("est idempotent : une seconde synchronisation identique n'écrit rien", () => {
    const premiere = planifierUpsert([], recues);
    const enBase = premiere.aCreer.map((o) => ({ periode: o.periode, valeur: o.valeur, statut: o.statut }));
    const seconde = planifierUpsert(enBase, recues);
    expect(seconde.aCreer).toEqual([]);
    expect(seconde.aMettreAJour).toEqual([]);
    expect(seconde.inchangees).toBe(3);
  });
  it("ignore les périodes ou valeurs illisibles et les doublons", () => {
    const plan = planifierUpsert([], [{ periode: "n/a", valeur: "1", statut: null }, { periode: "2026-Q2", valeur: "x", statut: null }, { periode: "2026-Q1", valeur: "1", statut: null }, { periode: "2026-Q1", valeur: "2", statut: null }]);
    expect(plan.ignorees).toEqual(["n/a", "2026-Q2"]);
    expect(plan.aCreer).toHaveLength(1);
  });
});
