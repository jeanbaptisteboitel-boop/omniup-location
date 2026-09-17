import { describe, expect, it } from "vitest";
import { jourUTC, toISODate } from "../dates";
import { detecterColonnes, genererEcheancier, lignesVersEcheances, parseDateSouple, parserCSV, totauxParAnnee } from "../emprunts";
import { somme } from "../montants";

describe("genererEcheancier", () => {
  it("produit un tableau d'amortissement équilibré", () => {
    const e = genererEcheancier({ montant: 100000, tauxAnnuel: 3, dureeMois: 240, dateDebut: jourUTC(2026, 10, 5), assuranceMensuelle: 20 });
    expect(e).toHaveLength(240);
    expect(somme(e.map((l) => l.capital))).toBe(100000);
    expect(e[0].interets).toBe(250); // 100 000 × 3 % / 12
    expect(e[0].total).toBeCloseTo(554.6 + 20, 1);
    expect(e[239].capitalRestant).toBe(0);
    expect(toISODate(e[1].date)).toBe("2026-11-05");
  });

  it("gère un taux nul", () => {
    const e = genererEcheancier({ montant: 1200, tauxAnnuel: 0, dureeMois: 12, dateDebut: jourUTC(2026, 1, 1) });
    expect(e.every((l) => l.capital === 100 && l.interets === 0)).toBe(true);
  });

  it("totalise par année", () => {
    const e = genererEcheancier({ montant: 12000, tauxAnnuel: 2, dureeMois: 24, dateDebut: jourUTC(2026, 1, 1) });
    const t = totauxParAnnee(e, 2026);
    expect(t.interets).toBeGreaterThan(0);
    expect(t.capital + totauxParAnnee(e, 2027).capital).toBeCloseTo(12000, 1);
  });
});

describe("import CSV", () => {
  const csv = `Date échéance;Capital amorti;Intérêts;Assurance;Montant échéance;Capital restant dû
05/10/2026;"304,60";"250,00";"20,00";"574,60";"99 695,40"
05/11/2026;"305,36";"249,24";"20,00";"574,60";"99 390,04"
Total;;;;;`;

  it("détecte séparateur, colonnes et convertit les lignes", () => {
    const lignes = parserCSV(csv);
    expect(lignes[0]).toHaveLength(6);
    const mapping = detecterColonnes(lignes[0]);
    expect(mapping).toEqual({ date: 0, capital: 1, interets: 2, assurance: 3, total: 4, capitalRestant: 5 });
    const { echeances, erreurs } = lignesVersEcheances(lignes.slice(1), mapping);
    expect(erreurs).toEqual([]);
    expect(echeances).toHaveLength(2);
    expect(echeances[0].capital).toBe(304.6);
    expect(echeances[0].capitalRestant).toBe(99695.4);
    expect(toISODate(echeances[1].date)).toBe("2026-11-05");
  });

  it("déduit le capital à partir du total quand il manque", () => {
    const lignes = [["01/01/2027", "100", "500"]];
    const { echeances } = lignesVersEcheances(lignes, { date: 0, interets: 1, total: 2 });
    expect(echeances[0].capital).toBe(400);
  });

  it("lit les dates de plusieurs formats", () => {
    expect(toISODate(parseDateSouple("2027-03-05")!)).toBe("2027-03-05");
    expect(toISODate(parseDateSouple("5/3/27")!)).toBe("2027-03-05");
    expect(toISODate(parseDateSouple("03/2027")!)).toBe("2027-03-01");
    expect(toISODate(parseDateSouple(46000)!)).toBe("2025-12-09");
    expect(parseDateSouple("n/a")).toBeNull();
  });
});
