import { describe, expect, it } from "vitest";
import { ajouterMois, differenceMois, finMois, formatDate, formatPeriode, joursDansMois, jourUTC, parseDateISO, periodeDe, periodeSuivante, toISODate } from "../dates";

describe("dates", () => {
  it("parse et formate les dates ISO sans décalage", () => {
    const d = parseDateISO("2026-09-01")!;
    expect(d.toISOString()).toBe("2026-09-01T00:00:00.000Z");
    expect(toISODate(d)).toBe("2026-09-01");
    expect(formatDate(d)).toBe("01/09/2026");
    expect(parseDateISO("2026-02-30")).toBeNull();
    expect(parseDateISO("abc")).toBeNull();
  });

  it("gère les périodes mensuelles", () => {
    expect(periodeDe(jourUTC(2026, 9, 17))).toBe("2026-09");
    expect(periodeSuivante("2026-12")).toBe("2027-01");
    expect(toISODate(finMois("2024-02"))).toBe("2024-02-29");
    expect(joursDansMois("2026-09")).toBe(30);
    expect(formatPeriode("2026-09")).toBe("Septembre 2026");
  });

  it("ajoute des mois en bornant le jour", () => {
    expect(toISODate(ajouterMois(jourUTC(2026, 1, 31), 1))).toBe("2026-02-28");
    expect(toISODate(ajouterMois(jourUTC(2026, 9, 1), 36))).toBe("2029-09-01");
    expect(differenceMois(jourUTC(2026, 9, 1), jourUTC(2027, 7, 1))).toBe(10);
    expect(differenceMois(jourUTC(2026, 9, 15), jourUTC(2027, 7, 1))).toBe(9);
  });
});
