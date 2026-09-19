import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { appelsDuLot, bailEnCours, encaisseSurAnnee, jetonProprietaireValide, lienAccesProprietaire, soldeAppels } from "../proprietaire";

const auj = new Date(Date.UTC(2026, 8, 19));
const jour = (iso: string) => new Date(`${iso}T00:00:00Z`);
const appel = (periode: string, total: number, echeance: string, paiements: { date: string; montant: number }[]) => ({ periode, total, dateEcheance: jour(echeance), paiements: paiements.map((p) => ({ date: jour(p.date), montant: p.montant })) });

describe("espace propriétaire", () => {
  it("valide le format du jeton et construit le lien", () => {
    expect(jetonProprietaireValide("b".repeat(64))).toBe(true);
    expect(jetonProprietaireValide("B".repeat(64))).toBe(false);
    expect(jetonProprietaireValide("")).toBe(false);
    expect(jetonProprietaireValide(null)).toBe(false);
    expect(lienAccesProprietaire("https://loc.exemple.fr", "f".repeat(64))).toBe(`https://loc.exemple.fr/proprietaire/acces/${"f".repeat(64)}`);
  });
  it("retient le bail signé comme bail en cours", () => {
    expect(bailEnCours([{ statut: "TERMINE" as const }, { statut: "SIGNE" as const }])?.statut).toBe("SIGNE");
    expect(bailEnCours([{ statut: "TERMINE" as const }, { statut: "EN_SIGNATURE" as const }])).toBeNull();
    expect(bailEnCours([])).toBeNull();
  });
  it("calcule le reste dû et la part en retard", () => {
    const solde = soldeAppels([appel("2026-08", 660, "2026-08-01", [{ date: "2026-08-03", montant: 660 }]), appel("2026-09", 660, "2026-09-01", [{ date: "2026-09-02", montant: 100 }]), appel("2026-10", 660, "2026-10-01", [])], auj);
    expect(solde.total).toBe(1220);
    expect(solde.enRetard).toBe(560);
    expect(solde.dus.map((d) => d.etat.statut)).toEqual(["EN_RETARD", "A_PAYER"]);
    expect(solde.lignes[0].etat.statut).toBe("PAYE");
  });
  it("somme les paiements de l'année civile et fusionne les appels des baux du lot", () => {
    const lot = {
      baux: [
        { appels: [appel("2026-01", 500, "2026-01-01", [{ date: "2025-12-28", montant: 500 }]), appel("2026-02", 500, "2026-02-01", [{ date: "2026-02-01", montant: 200 }, { date: "2026-02-15", montant: 300 }])] },
        { appels: [appel("2025-12", 480, "2025-12-01", [{ date: "2025-12-01", montant: 480 }])] },
      ],
    };
    expect(encaisseSurAnnee(lot, 2026)).toBe(500);
    expect(encaisseSurAnnee(lot, 2025)).toBe(980);
    expect(appelsDuLot(lot).map((x) => x.appel.periode)).toEqual(["2026-02", "2026-01", "2025-12"]);
  });
});
