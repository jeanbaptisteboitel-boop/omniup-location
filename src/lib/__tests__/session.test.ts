import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { analyserJeton, creerJeton, motDePasseValide, protectionActive } from "../session";

describe("session signée", () => {
  beforeEach(() => {
    process.env.APP_SECRET = "secret-de-test";
    delete process.env.APP_PASSWORD;
  });
  afterEach(() => {
    delete process.env.APP_SECRET;
    delete process.env.APP_PASSWORD;
    vi.useRealTimers();
  });

  it("protection active dès qu'un secret ou un mot de passe principal est défini", () => {
    expect(protectionActive()).toBe(true);
    delete process.env.APP_SECRET;
    expect(protectionActive()).toBe(false);
    process.env.APP_PASSWORD = "mdp";
    expect(protectionActive()).toBe(true);
  });

  it("jeton du compte principal : deux parties, sans identifiant", async () => {
    const { valeur, maxAge } = await creerJeton();
    expect(valeur.split(".")).toHaveLength(2);
    expect(maxAge).toBe(30 * 24 * 3600);
    const jeton = await analyserJeton(valeur);
    expect(jeton?.utilisateurId).toBeNull();
    expect(jeton?.expiration).toBeGreaterThan(Math.floor(Date.now() / 1000));
  });

  it("jeton d'un utilisateur : identifiant signé", async () => {
    const { valeur } = await creerJeton(12);
    expect(valeur.startsWith("u12.")).toBe(true);
    expect((await analyserJeton(valeur))?.utilisateurId).toBe(12);
  });

  it("refuse un jeton falsifié, signé avec un autre secret, ou mal formé", async () => {
    const { valeur } = await creerJeton(12);
    expect(await analyserJeton(valeur.replace("u12.", "u13."))).toBeNull();
    expect(await analyserJeton(valeur.slice(0, -1) + (valeur.endsWith("0") ? "1" : "0"))).toBeNull();
    process.env.APP_SECRET = "autre-secret";
    expect(await analyserJeton(valeur)).toBeNull();
    expect(await analyserJeton("abc")).toBeNull();
    expect(await analyserJeton("")).toBeNull();
    expect(await analyserJeton(undefined)).toBeNull();
  });

  it("refuse un jeton expiré", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-19T10:00:00Z"));
    const { valeur } = await creerJeton(3);
    vi.setSystemTime(new Date("2026-10-19T10:00:01Z"));
    expect(await analyserJeton(valeur)).toBeNull();
    vi.setSystemTime(new Date("2026-10-01T10:00:00Z"));
    expect((await analyserJeton(valeur))?.utilisateurId).toBe(3);
  });

  it("mot de passe principal : comparaison exacte, refusé s'il n'est pas défini", async () => {
    expect(await motDePasseValide("secret")).toBe(false);
    process.env.APP_PASSWORD = "secret";
    expect(await motDePasseValide("secret")).toBe(true);
    expect(await motDePasseValide("Secret")).toBe(false);
    expect(await motDePasseValide("")).toBe(false);
  });
});
