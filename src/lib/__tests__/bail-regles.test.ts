import { describe, expect, it } from "vitest";
import { jourUTC, toISODate } from "../dates";
import { dateFinParDefaut, dureeEnMois, verifierRegles } from "../bail-regles";

describe("dateFinParDefaut", () => {
  it("propose 3 ans pour un bail vide, 6 ans pour une société, 1 an meublé, 6 mois mobilité", () => {
    const debut = jourUTC(2026, 9, 1);
    expect(toISODate(dateFinParDefaut("NON_MEUBLE", debut))).toBe("2029-08-31");
    expect(toISODate(dateFinParDefaut("NON_MEUBLE", debut, true))).toBe("2032-08-31");
    expect(toISODate(dateFinParDefaut("MEUBLE", debut))).toBe("2027-08-31");
    expect(toISODate(dateFinParDefaut("MOBILITE", debut))).toBe("2027-02-28");
    expect(dureeEnMois(debut, dateFinParDefaut("MOBILITE", debut))).toBe(6);
  });
});

describe("verifierRegles", () => {
  const base = { dateDebut: jourUTC(2026, 9, 1), loyerHC: 600, chargesForfait: false, motifMobilite: null };

  it("bloque un dépôt de garantie trop élevé", () => {
    const r = verifierRegles({ ...base, type: "NON_MEUBLE", dateFin: jourUTC(2029, 8, 31), depotGarantie: 700 });
    expect(r.erreurs.depotGarantie).toContain("1 mois");
    const ok = verifierRegles({ ...base, type: "MEUBLE", dateFin: jourUTC(2027, 8, 31), depotGarantie: 1200 });
    expect(ok.erreurs).toEqual({});
  });

  it("applique les règles du bail mobilité", () => {
    const r = verifierRegles({ ...base, type: "MOBILITE", dateFin: jourUTC(2027, 8, 31), depotGarantie: 100, chargesForfait: true });
    expect(r.erreurs.dateFin).toContain("10 mois");
    expect(r.erreurs.depotGarantie).toBeDefined();
    expect(r.erreurs.motifMobilite).toBeDefined();
    const ok = verifierRegles({ ...base, type: "MOBILITE", dateFin: jourUTC(2027, 2, 28), depotGarantie: 0, chargesForfait: true, motifMobilite: "Stage" });
    expect(ok.erreurs).toEqual({});
  });

  it("refuse une date de fin antérieure au début", () => {
    const r = verifierRegles({ ...base, type: "MEUBLE", dateFin: jourUTC(2026, 8, 1), depotGarantie: 0 });
    expect(r.erreurs.dateFin).toBeDefined();
  });

  it("avertit sans bloquer sur les durées courtes et le forfait de charges en logement vide", () => {
    const r = verifierRegles({ ...base, type: "NON_MEUBLE", dateFin: jourUTC(2027, 8, 31), depotGarantie: 600, chargesForfait: true });
    expect(r.erreurs).toEqual({});
    expect(r.avertissements.length).toBe(2);
  });
});
