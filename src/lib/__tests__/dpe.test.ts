import { describe, expect, it } from "vitest";
import { dateExpiration, decenceEnergetique, etatDpe, loyerGele, SEUIL_CONSOMMATION_2023 } from "../dpe";

const vide = { dpeClasseEnergie: null, dpeClasseGes: null, dpeConsommation: null, dpeEmissions: null, dpeRealiseLe: null };
const auj = new Date(Date.UTC(2026, 8, 20));

describe("validité du DPE", () => {
  it("signale un DPE absent sans autre conséquence", () => {
    expect(etatDpe(vide, auj)).toBe("MANQUANT");
    expect(decenceEnergetique(vide, auj)).toBeNull();
    expect(loyerGele(vide)).toBe(false);
  });

  it("vaut dix ans à compter de sa réalisation", () => {
    const realiseLe = new Date(Date.UTC(2023, 4, 12));
    expect(dateExpiration(realiseLe).toISOString().slice(0, 10)).toBe("2033-05-12");
    expect(etatDpe({ ...vide, dpeClasseEnergie: "D", dpeRealiseLe: realiseLe }, auj)).toBe("VALIDE");
  });

  it("considère expiré un DPE réalisé avant la réforme du 1er juillet 2021", () => {
    expect(etatDpe({ ...vide, dpeClasseEnergie: "D", dpeRealiseLe: new Date(Date.UTC(2019, 2, 1)) }, auj)).toBe("EXPIRE");
    expect(etatDpe({ ...vide, dpeClasseEnergie: "D", dpeRealiseLe: new Date(Date.UTC(2021, 7, 1)) }, auj)).toBe("VALIDE");
  });

  it("expire dix ans après, même pour un DPE de la nouvelle génération", () => {
    expect(etatDpe({ ...vide, dpeClasseEnergie: "C", dpeRealiseLe: new Date(Date.UTC(2021, 7, 1)) }, new Date(Date.UTC(2032, 0, 1)))).toBe("EXPIRE");
  });
});

describe("décence énergétique", () => {
  it("interdit la classe G depuis 2025 et pas encore la classe F", () => {
    const g = decenceEnergetique({ ...vide, dpeClasseEnergie: "G" }, auj);
    expect(g).toMatchObject({ decent: false });
    const f = decenceEnergetique({ ...vide, dpeClasseEnergie: "F" }, auj);
    expect(f).toMatchObject({ decent: true });
    expect(f && "prochainPalier" in f && f.prochainPalier?.classe).toBe("F");
  });

  it("n'interdisait pas encore la classe G en 2024", () => {
    expect(decenceEnergetique({ ...vide, dpeClasseEnergie: "G" }, new Date(Date.UTC(2024, 5, 1)))).toMatchObject({ decent: true });
  });

  it("interdit une consommation supérieure au seuil, quelle que soit la classe", () => {
    const r = decenceEnergetique({ ...vide, dpeClasseEnergie: "F", dpeConsommation: SEUIL_CONSOMMATION_2023 + 10 }, auj);
    expect(r).toMatchObject({ decent: false });
    expect(decenceEnergetique({ ...vide, dpeClasseEnergie: "F", dpeConsommation: 400 }, auj)).toMatchObject({ decent: true });
  });

  it("laisse un logement performant sans échéance", () => {
    expect(decenceEnergetique({ ...vide, dpeClasseEnergie: "C" }, auj)).toEqual({ decent: true, prochainPalier: null });
  });

  it("annonce le palier 2034 pour un logement classé E", () => {
    const r = decenceEnergetique({ ...vide, dpeClasseEnergie: "E" }, auj);
    expect(r && "prochainPalier" in r && r.prochainPalier?.depuis.getUTCFullYear()).toBe(2034);
  });
});

describe("gel des loyers des passoires thermiques", () => {
  it("gèle le loyer des classes F et G uniquement", () => {
    expect(loyerGele({ ...vide, dpeClasseEnergie: "F" })).toBe(true);
    expect(loyerGele({ ...vide, dpeClasseEnergie: "G" })).toBe(true);
    expect(loyerGele({ ...vide, dpeClasseEnergie: "E" })).toBe(false);
    expect(loyerGele({ ...vide, dpeClasseEnergie: "A" })).toBe(false);
  });
});
