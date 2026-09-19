import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { jetonValide, lienAcces, soldeBail } from "../espace";

const auj = new Date(Date.UTC(2026, 8, 19));
const appel = (total: number, echeance: string, paiements: number[]) => ({ total, dateEcheance: new Date(echeance), paiements: paiements.map((montant) => ({ montant })) });

describe("espace locataire", () => {
  it("valide le format du jeton et construit le lien", () => {
    expect(jetonValide("a".repeat(64))).toBe(true);
    expect(jetonValide("A".repeat(64))).toBe(false);
    expect(jetonValide("abc")).toBe(false);
    expect(jetonValide(undefined)).toBe(false);
    expect(lienAcces("https://loc.exemple.fr", "f".repeat(64))).toBe(`https://loc.exemple.fr/espace/acces/${"f".repeat(64)}`);
  });
  it("calcule le solde dû et la part en retard", () => {
    const solde = soldeBail([appel(660, "2026-08-01T00:00:00Z", [660]), appel(660, "2026-09-01T00:00:00Z", [100]), appel(660, "2026-10-01T00:00:00Z", [])], auj);
    expect(solde.total).toBe(1220);
    expect(solde.enRetard).toBe(560);
    expect(solde.dus.map((d) => d.etat.statut)).toEqual(["EN_RETARD", "A_PAYER"]);
    expect(solde.lignes[0].etat.statut).toBe("PAYE");
  });
  it("solde nul quand tout est réglé", () => {
    const solde = soldeBail([appel(500, "2026-09-01T00:00:00Z", [200, 300])], auj);
    expect(solde.total).toBe(0);
    expect(solde.dus).toEqual([]);
  });
});
