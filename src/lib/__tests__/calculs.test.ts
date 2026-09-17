import { describe, expect, it } from "vitest";
import { appliquerPourcentage, capaciteEmprunt, capitalPourMensualite, coutCredit, emolumentsNotaire, fraisNotaire, loyerMaximal, mensualite, pretInFine, rentabilite, revisionLoyerIndice, tauxEffort, variationPourcentage } from "../calculs";

describe("pourcentages", () => {
  it("calcule variations, application et taux d'effort", () => {
    expect(variationPourcentage(600, 618)).toBe(3);
    expect(appliquerPourcentage(600, 3)).toBe(618);
    expect(appliquerPourcentage(600, -10)).toBe(540);
    expect(tauxEffort(660, 2000)).toBe(33);
    expect(loyerMaximal(3000, 33)).toBe(990);
  });
});

describe("frais de notaire", () => {
  it("applique le barème des émoluments par tranches", () => {
    // 6 500 × 3,87 % + 10 500 × 1,596 % + 43 000 × 1,064 % + 140 000 × 0,799 %
    expect(emolumentsNotaire(200000)).toBe(1995.25);
  });
  it("estime les frais dans l'ancien et le neuf", () => {
    const ancien = fraisNotaire({ prix: 200000, debours: 1000 });
    expect(ancien.droitsMutation).toBe(11613.3); // 5,80665 %
    expect(ancien.total).toBeGreaterThan(14000);
    expect(ancien.pourcentage).toBeGreaterThan(7);
    const neuf = fraisNotaire({ prix: 200000, neuf: true, debours: 1000 });
    expect(neuf.droitsMutation).toBe(1430);
    expect(neuf.total).toBeLessThan(ancien.total);
    const majore = fraisNotaire({ prix: 200000, tauxDepartemental: 5, debours: 1000 });
    expect(majore.droitsMutation).toBe(12637);
  });
});

describe("emprunt", () => {
  it("calcule mensualité, capital et coût", () => {
    expect(mensualite(100000, 3, 240)).toBe(554.6);
    expect(capitalPourMensualite(554.6, 3, 240)).toBeCloseTo(100000, -1);
    const c = coutCredit(100000, 3, 240, { tauxAnnuelPct: 0.3 });
    expect(c.assuranceMensuelle).toBe(25);
    expect(c.totalInterets).toBe(33104);
    expect(c.coutTotal).toBe(39104);
    expect(mensualite(12000, 0, 12)).toBe(1000);
  });
  it("calcule une capacité d'emprunt à 35 % assurance comprise", () => {
    const c = capaciteEmprunt({ revenusMensuels: 3000, tauxAnnuelPct: 3, dureeMois: 240, assuranceTauxAnnuelPct: 0.3 });
    expect(c.mensualiteMax).toBe(1050);
    expect(c.capital).toBeGreaterThan(180000);
    expect(c.capital).toBeLessThan(190000);
  });
  it("calcule un prêt in fine", () => {
    const p = pretInFine(100000, 3, 120, 20, 2);
    expect(p.interetsMensuels).toBe(250);
    expect(p.totalInterets).toBe(30000);
    expect(p.capitalARembourser).toBe(100000);
    expect(p.epargneMensuelleNecessaire).toBeLessThan(833.34);
    expect(p.epargneMensuelleNecessaire).toBeGreaterThan(700);
  });
});

describe("révision de loyer", () => {
  it("applique l'indice et un plafond éventuel", () => {
    const r = revisionLoyerIndice(600, 145.87, 148.2);
    expect(r.nouveauLoyer).toBe(609.58);
    expect(r.variationIndicePct).toBe(1.6);
    const plafonnee = revisionLoyerIndice(1000, 100, 105, 3.5);
    expect(plafonnee.nouveauLoyer).toBe(1035);
    expect(plafonnee.plafonne).toBe(true);
    expect(revisionLoyerIndice(600, 0, 1).nouveauLoyer).toBe(600);
  });
});

describe("rentabilité", () => {
  it("calcule brute, nette et cash-flow", () => {
    const r = rentabilite({ prix: 150000, fraisAcquisition: 12000, travaux: 8000, loyerMensuelHC: 650, taxeFonciere: 900, assurancePNO: 150, chargesNonRecuperablesAnnuelles: 400, gestionPct: 7, vacanceSemaines: 2, mensualiteCredit: 700 });
    expect(r.rentabiliteBrutePct).toBe(5.2);
    expect(r.loyerAnnuelEncaisse).toBe(7500);
    expect(r.fraisGestion).toBe(525);
    expect(r.revenuNetAnnuel).toBe(5525);
    expect(r.rentabiliteNettePct).toBe(3.25);
    expect(r.cashFlowMensuel).toBe(-239.58);
  });
});
