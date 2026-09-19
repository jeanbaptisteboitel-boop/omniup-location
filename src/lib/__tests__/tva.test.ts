import { describe, expect, it } from "vitest";
import { montantTva, montantsMensuels, optionTvaEffective, problemeTauxTva, tauxTvaAutorises, usageHabitation } from "../tva";
import { calculerAppel, type BailPourAppels } from "../loyers";
import { verifierRegles } from "../bail-regles";
import { jourUTC } from "../dates";

describe("TVA sur les loyers", () => {
  it("réserve la TVA aux locaux hors habitation, au bon taux", () => {
    expect(usageHabitation("NON_MEUBLE")).toBe(true);
    expect(usageHabitation("MEUBLE")).toBe(true);
    expect(usageHabitation("MOBILITE")).toBe(true);
    expect(usageHabitation("COMMERCIAL")).toBe(false);
    expect(tauxTvaAutorises("NON_MEUBLE")).toEqual([]);
    expect(tauxTvaAutorises("COMMERCIAL")).toEqual([20]);
    expect(tauxTvaAutorises("PROFESSIONNEL")).toEqual([20]);
    expect(tauxTvaAutorises("SAISONNIER")).toEqual([10]);
  });

  it("n'applique l'option du lot que si l'immeuble a opté", () => {
    expect(optionTvaEffective({ optionTva: true, immeuble: null })).toBe(true);
    expect(optionTvaEffective({ optionTva: true, immeuble: { optionTva: true } })).toBe(true);
    expect(optionTvaEffective({ optionTva: true, immeuble: { optionTva: false } })).toBe(false);
    expect(optionTvaEffective({ optionTva: false, immeuble: { optionTva: true } })).toBe(false);
  });

  it("refuse un taux sur l'habitation, un taux étranger au type, ou un lot non soumis", () => {
    expect(problemeTauxTva("NON_MEUBLE", 20, true)).toMatch(/habitation/);
    expect(problemeTauxTva("COMMERCIAL", 10, true)).toMatch(/non applicable/);
    expect(problemeTauxTva("COMMERCIAL", 20, false)).toMatch(/pas soumis/);
    expect(problemeTauxTva("COMMERCIAL", 20, true)).toBeNull();
    expect(problemeTauxTva("SAISONNIER", 10, true)).toBeNull();
    expect(problemeTauxTva("NON_MEUBLE", 0, false)).toBeNull();
  });

  it("calcule la TVA au centime sur loyer + charges", () => {
    expect(montantTva(1100, 20)).toBe(220);
    expect(montantTva(333.33, 10)).toBe(33.33);
    expect(montantTva(100, 0)).toBe(0);
    expect(montantsMensuels({ loyerHC: 1000, charges: 100, tauxTva: 20 })).toEqual({ ht: 1100, tva: 220, ttc: 1320 });
    expect(montantsMensuels({ loyerHC: 600, charges: 60, tauxTva: 0 })).toEqual({ ht: 660, tva: 0, ttc: 660 });
  });

  it("intègre la TVA dans les appels de loyer, prorata compris", () => {
    const bail: BailPourAppels = { id: 1, type: "COMMERCIAL", statut: "SIGNE", dateDebut: jourUTC(2026, 9, 16), dateFin: jourUTC(2035, 9, 15), dateFinEffective: null, loyerHC: 1000, charges: 100, jourEcheance: 1, tauxTva: 20 };
    const plein = calculerAppel(bail, "2026-10");
    expect(plein.tauxTva).toBe(20);
    expect(plein.montantTva).toBe(220);
    expect(plein.total).toBe(1320);
    const prorata = calculerAppel(bail, "2026-09");
    expect(prorata.prorata).toBe(true);
    expect(prorata.loyer).toBe(500);
    expect(prorata.charges).toBe(50);
    expect(prorata.montantTva).toBe(110);
    expect(prorata.total).toBe(660);
    const sansTva = calculerAppel({ ...bail, tauxTva: 0 }, "2026-10");
    expect(sansTva.montantTva).toBe(0);
    expect(sansTva.total).toBe(1100);
  });

  it("contrôle la TVA dans les règles du bail", () => {
    const base = { dateDebut: jourUTC(2026, 10, 1), dateFin: jourUTC(2035, 9, 30), loyerHC: 1000, depotGarantie: 0, chargesForfait: false, motifMobilite: null };
    expect(verifierRegles({ ...base, type: "COMMERCIAL", tauxTva: 20, lotSoumisTva: true }).erreurs).toEqual({});
    expect(verifierRegles({ ...base, type: "COMMERCIAL", tauxTva: 20, lotSoumisTva: false }).erreurs.tauxTva).toMatch(/pas soumis/);
    expect(verifierRegles({ ...base, type: "NON_MEUBLE", dateFin: jourUTC(2029, 9, 30), tauxTva: 20, lotSoumisTva: true }).erreurs.tauxTva).toMatch(/habitation/);
    const sansTaux = verifierRegles({ ...base, type: "COMMERCIAL", tauxTva: 0, lotSoumisTva: true });
    expect(sansTaux.erreurs).toEqual({});
    expect(sansTaux.avertissements.some((a) => a.includes("sans TVA"))).toBe(true);
  });
});

describe("règles des baux commerciaux, professionnels et saisonniers", () => {
  const base = { loyerHC: 1000, depotGarantie: 0, chargesForfait: false, motifMobilite: null };
  it("bail commercial : 9 ans, ou dérogatoire de 3 ans au plus", () => {
    expect(verifierRegles({ ...base, type: "COMMERCIAL", dateDebut: jourUTC(2026, 1, 1), dateFin: jourUTC(2034, 12, 31) }).erreurs).toEqual({});
    const derogatoire = verifierRegles({ ...base, type: "COMMERCIAL", dateDebut: jourUTC(2026, 1, 1), dateFin: jourUTC(2027, 12, 31) });
    expect(derogatoire.erreurs).toEqual({});
    expect(derogatoire.avertissements.some((a) => a.includes("dérogatoire"))).toBe(true);
    expect(verifierRegles({ ...base, type: "COMMERCIAL", dateDebut: jourUTC(2026, 1, 1), dateFin: jourUTC(2030, 12, 31) }).erreurs.dateFin).toMatch(/9 ans/);
    expect(verifierRegles({ ...base, type: "COMMERCIAL", depotGarantie: 3000, dateDebut: jourUTC(2026, 1, 1), dateFin: jourUTC(2034, 12, 31) }).avertissements.some((a) => a.includes("deux termes"))).toBe(true);
  });
  it("bail professionnel : 6 ans au minimum", () => {
    expect(verifierRegles({ ...base, type: "PROFESSIONNEL", dateDebut: jourUTC(2026, 1, 1), dateFin: jourUTC(2031, 12, 31) }).erreurs).toEqual({});
    expect(verifierRegles({ ...base, type: "PROFESSIONNEL", dateDebut: jourUTC(2026, 1, 1), dateFin: jourUTC(2028, 12, 31) }).erreurs.dateFin).toMatch(/6 ans/);
  });
  it("location saisonnière : avertit au-delà de 90 jours et force le forfait de charges", () => {
    const courte = verifierRegles({ ...base, type: "SAISONNIER", chargesForfait: true, dateDebut: jourUTC(2026, 7, 1), dateFin: jourUTC(2026, 7, 14) });
    expect(courte.erreurs).toEqual({});
    expect(courte.avertissements).toEqual([]);
    const longue = verifierRegles({ ...base, type: "SAISONNIER", dateDebut: jourUTC(2026, 1, 1), dateFin: jourUTC(2026, 6, 30) });
    expect(longue.avertissements.some((a) => a.includes("90 jours"))).toBe(true);
    expect(longue.avertissements.some((a) => a.includes("forfait"))).toBe(true);
  });
  it("signale un lot dont l'usage ne correspond pas au bail", () => {
    const r = verifierRegles({ ...base, type: "COMMERCIAL", dateDebut: jourUTC(2026, 1, 1), dateFin: jourUTC(2034, 12, 31), lotType: "APPARTEMENT" });
    expect(r.avertissements.some((a) => a.includes("logement"))).toBe(true);
    const h = verifierRegles({ ...base, type: "NON_MEUBLE", dateDebut: jourUTC(2026, 1, 1), dateFin: jourUTC(2028, 12, 31), lotType: "LOCAL_COMMERCIAL" });
    expect(h.avertissements.some((a) => a.includes("local commercial"))).toBe(true);
  });
});
