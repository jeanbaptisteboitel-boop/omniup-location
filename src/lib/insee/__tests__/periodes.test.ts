import { describe, expect, it } from "vitest";
import { analyserPeriode, debutPeriode, finPeriode, libellePeriode, periodeDecalee, periodeDepuisTrimestre, periodeUnAnAvant, periodesEcoulees, startPeriodPour, trimestreDepuisPeriode, trimestrePlus } from "../periodes";

describe("périodes INSEE", () => {
  it("analyse les formats mensuel, trimestriel, semestriel et annuel", () => {
    expect(analyserPeriode("2026-06")).toEqual({ frequence: "M", annee: 2026, rang: 6 });
    expect(analyserPeriode("2026-Q2")).toEqual({ frequence: "Q", annee: 2026, rang: 2 });
    expect(analyserPeriode("2026-S1")).toEqual({ frequence: "S", annee: 2026, rang: 1 });
    expect(analyserPeriode("2026")).toEqual({ frequence: "A", annee: 2026, rang: 1 });
    expect(analyserPeriode("2026-13")).toBeNull();
    expect(analyserPeriode("T2 2026")).toBeNull();
    expect(analyserPeriode(null)).toBeNull();
  });
  it("calcule le premier jour et la fin exclusive", () => {
    expect(debutPeriode("2026-06")?.toISOString()).toBe("2026-06-01T00:00:00.000Z");
    expect(debutPeriode("2026-Q3")?.toISOString()).toBe("2026-07-01T00:00:00.000Z");
    expect(debutPeriode("2026")?.toISOString()).toBe("2026-01-01T00:00:00.000Z");
    expect(finPeriode("2026-Q4")?.toISOString()).toBe("2027-01-01T00:00:00.000Z");
    expect(finPeriode("2026-12")?.toISOString()).toBe("2027-01-01T00:00:00.000Z");
  });
  it("décale les périodes et remonte d'un an", () => {
    expect(periodeDecalee("2026-Q1", -1)).toBe("2025-Q4");
    expect(periodeDecalee("2026-01", -2)).toBe("2025-11");
    expect(periodeDecalee("2026", 3)).toBe("2029");
    expect(periodeUnAnAvant("2026-Q2")).toBe("2025-Q2");
    expect(periodeUnAnAvant("2026-06")).toBe("2025-06");
    expect(periodeUnAnAvant("n'importe quoi")).toBeNull();
  });
  it("compte les périodes entièrement écoulées", () => {
    expect(periodesEcoulees("2026-Q2", new Date("2026-09-19T00:00:00Z"))).toBe(0);
    expect(periodesEcoulees("2026-Q2", new Date("2026-10-01T00:00:00Z"))).toBe(1);
    expect(periodesEcoulees("2026-Q2", new Date("2027-01-15T00:00:00Z"))).toBe(2);
    expect(periodesEcoulees("2026-Q2", new Date("2027-04-01T00:00:00Z"))).toBe(3);
    expect(periodesEcoulees("2026-06", new Date("2026-09-19T00:00:00Z"))).toBe(2);
  });
  it("libellés et conversions de trimestres", () => {
    expect(libellePeriode("2026-06")).toBe("juin 2026");
    expect(libellePeriode("2026-Q2")).toBe("T2 2026");
    expect(libellePeriode("2026-S2")).toBe("2e semestre 2026");
    expect(libellePeriode("2026")).toBe("2026");
    expect(trimestreDepuisPeriode("2026-Q2")).toBe("T2 2026");
    expect(trimestreDepuisPeriode("2026-06")).toBeNull();
    expect(periodeDepuisTrimestre("T2 2026")).toBe("2026-Q2");
    expect(trimestrePlus("T2 2025", 1)).toBe("T2 2026");
    expect(trimestrePlus("T4 2023", -3)).toBe("T4 2020");
    expect(startPeriodPour("M", 2000)).toBe("2000-01");
    expect(startPeriodPour("Q", 2000)).toBe("2000-Q1");
    expect(startPeriodPour("A", 2000)).toBe("2000");
  });
});
