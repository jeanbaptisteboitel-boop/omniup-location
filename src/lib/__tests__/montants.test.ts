import { describe, expect, it } from "vitest";
import { arrondir2, montantEnLettres, nombreEnLettres, parseMontant, somme } from "../montants";

describe("parseMontant", () => {
  it("accepte les formats français et anglais", () => {
    expect(parseMontant("650,50")).toBe(650.5);
    expect(parseMontant("1 234,56 €")).toBe(1234.56);
    expect(parseMontant("1,234.56")).toBe(1234.56);
    expect(parseMontant("1234.5")).toBe(1234.5);
    expect(parseMontant("-12,5")).toBe(-12.5);
    expect(parseMontant("")).toBeNull();
    expect(parseMontant("abc")).toBeNull();
  });
});

describe("arrondir2 / somme", () => {
  it("arrondit sans artefacts flottants", () => {
    expect(arrondir2(0.1 + 0.2)).toBe(0.3);
    expect(arrondir2(1.005)).toBe(1.01);
    expect(somme([0.1, 0.2, 0.3])).toBe(0.6);
  });
});

describe("nombreEnLettres", () => {
  it("écrit les nombres en français", () => {
    expect(nombreEnLettres(0)).toBe("zéro");
    expect(nombreEnLettres(17)).toBe("dix-sept");
    expect(nombreEnLettres(21)).toBe("vingt et un");
    expect(nombreEnLettres(71)).toBe("soixante et onze");
    expect(nombreEnLettres(72)).toBe("soixante-douze");
    expect(nombreEnLettres(80)).toBe("quatre-vingts");
    expect(nombreEnLettres(81)).toBe("quatre-vingt-un");
    expect(nombreEnLettres(91)).toBe("quatre-vingt-onze");
    expect(nombreEnLettres(100)).toBe("cent");
    expect(nombreEnLettres(200)).toBe("deux cents");
    expect(nombreEnLettres(201)).toBe("deux cent un");
    expect(nombreEnLettres(1000)).toBe("mille");
    expect(nombreEnLettres(1999)).toBe("mille neuf cent quatre-vingt-dix-neuf");
    expect(nombreEnLettres(2000000)).toBe("deux millions");
  });
  it("écrit les montants avec centimes", () => {
    expect(montantEnLettres(650.5)).toBe("six cent cinquante euros et cinquante centimes");
    expect(montantEnLettres(1)).toBe("un euro");
    expect(montantEnLettres(1.01)).toBe("un euro et un centime");
  });
});
