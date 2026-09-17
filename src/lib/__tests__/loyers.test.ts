import { describe, expect, it } from "vitest";
import { jourUTC, toISODate } from "../dates";
import { calculerAppel, etatAppel, finLocation, periodesAGenerer, type BailPourAppels } from "../loyers";

const bail: BailPourAppels = {
  id: 1,
  type: "NON_MEUBLE",
  statut: "SIGNE",
  dateDebut: jourUTC(2026, 9, 15),
  dateFin: jourUTC(2029, 9, 14),
  dateFinEffective: null,
  loyerHC: 600,
  charges: 60,
  jourEcheance: 1,
};

describe("periodesAGenerer", () => {
  it("ne génère rien pour un brouillon", () => {
    expect(periodesAGenerer({ ...bail, statut: "BROUILLON" }, jourUTC(2026, 9, 17), 10)).toEqual([]);
  });

  it("génère du mois de début jusqu'au mois courant, puis le suivant 10 jours avant", () => {
    expect(periodesAGenerer(bail, jourUTC(2026, 9, 17), 10)).toEqual(["2026-09"]);
    expect(periodesAGenerer(bail, jourUTC(2026, 9, 21), 10)).toEqual(["2026-09", "2026-10"]);
    expect(periodesAGenerer(bail, jourUTC(2027, 1, 5), 10)).toEqual(["2026-09", "2026-10", "2026-11", "2026-12", "2027-01"]);
  });

  it("continue après la date de fin d'un bail reconduit tacitement, mais s'arrête pour un bail mobilité", () => {
    expect(periodesAGenerer(bail, jourUTC(2029, 10, 25), 10)).toContain("2029-11");
    const mobilite: BailPourAppels = { ...bail, type: "MOBILITE", dateDebut: jourUTC(2026, 9, 1), dateFin: jourUTC(2027, 2, 28) };
    const p = periodesAGenerer(mobilite, jourUTC(2027, 6, 1), 10);
    expect(p[p.length - 1]).toBe("2027-02");
  });

  it("s'arrête à la date de fin effective d'un bail clôturé", () => {
    const termine: BailPourAppels = { ...bail, statut: "TERMINE", dateFinEffective: jourUTC(2026, 11, 10) };
    expect(periodesAGenerer(termine, jourUTC(2027, 3, 1), 10)).toEqual(["2026-09", "2026-10", "2026-11"]);
    expect(finLocation(termine)?.toISOString()).toBe("2026-11-10T00:00:00.000Z");
  });
});

describe("calculerAppel", () => {
  it("calcule un prorata temporis le premier mois", () => {
    const a = calculerAppel(bail, "2026-09");
    expect(a.prorata).toBe(true);
    expect(toISODate(a.debutPeriode)).toBe("2026-09-15");
    expect(toISODate(a.finPeriode)).toBe("2026-09-30");
    expect(a.loyer).toBe(320); // 600 × 16/30
    expect(a.charges).toBe(32);
    expect(a.total).toBe(352);
    expect(toISODate(a.dateEcheance)).toBe("2026-09-15");
  });

  it("calcule un mois plein avec échéance au jour choisi", () => {
    const a = calculerAppel({ ...bail, jourEcheance: 5 }, "2026-10");
    expect(a.prorata).toBe(false);
    expect(a.total).toBe(660);
    expect(toISODate(a.dateEcheance)).toBe("2026-10-05");
  });

  it("borne le jour d'échéance au dernier jour du mois", () => {
    const a = calculerAppel({ ...bail, jourEcheance: 31 }, "2027-02");
    expect(toISODate(a.dateEcheance)).toBe("2027-02-28");
  });

  it("calcule un prorata le dernier mois d'un bail clôturé", () => {
    const termine: BailPourAppels = { ...bail, statut: "TERMINE", dateFinEffective: jourUTC(2026, 11, 10) };
    const a = calculerAppel(termine, "2026-11");
    expect(a.prorata).toBe(true);
    expect(a.loyer).toBe(200); // 600 × 10/30
  });
});

describe("etatAppel", () => {
  const appel = { total: 660, dateEcheance: jourUTC(2026, 10, 1), paiements: [] as { montant: number }[] };
  it("distingue à payer, partiel, retard et payé", () => {
    expect(etatAppel(appel, jourUTC(2026, 9, 25)).statut).toBe("A_PAYER");
    expect(etatAppel({ ...appel, paiements: [{ montant: 300 }] }, jourUTC(2026, 9, 25)).statut).toBe("PARTIEL");
    expect(etatAppel({ ...appel, paiements: [{ montant: 300 }] }, jourUTC(2026, 10, 2)).statut).toBe("EN_RETARD");
    expect(etatAppel(appel, jourUTC(2026, 10, 2)).statut).toBe("EN_RETARD");
    const paye = etatAppel({ ...appel, paiements: [{ montant: 300 }, { montant: 360 }] }, jourUTC(2026, 12, 1));
    expect(paye.statut).toBe("PAYE");
    expect(paye.reste).toBe(0);
  });
});
