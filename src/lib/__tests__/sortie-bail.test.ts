import { describe, expect, it } from "vitest";
import { dateLimiteRestitution, delaiRestitutionMois, etapesSortie, finPreavis, majorationRetard, preavisMois, soldeDepot } from "../sortie-bail";
import { jourUTC } from "../dates";
import { etatAssurance, doitRelancer, attestationCourante, JOURS_ALERTE_ASSURANCE } from "../assurances";

describe("préavis et congé", () => {
  it("applique le préavis légal selon le type de bail et l'auteur du congé", () => {
    expect(preavisMois("NON_MEUBLE", "LOCATAIRE")).toBe(3);
    expect(preavisMois("NON_MEUBLE", "LOCATAIRE", true)).toBe(1);
    expect(preavisMois("MEUBLE", "LOCATAIRE")).toBe(1);
    expect(preavisMois("MOBILITE", "LOCATAIRE")).toBe(1);
    expect(preavisMois("COMMERCIAL", "LOCATAIRE")).toBe(6);
    expect(preavisMois("NON_MEUBLE", "BAILLEUR")).toBe(6);
    expect(preavisMois("MEUBLE", "BAILLEUR")).toBe(3);
    expect(preavisMois("SAISONNIER", "LOCATAIRE")).toBe(0);
  });

  it("calcule la fin du préavis à compter de la réception du congé", () => {
    expect(finPreavis(jourUTC(2026, 9, 20), 3)).toEqual(jourUTC(2026, 12, 19));
    expect(finPreavis(jourUTC(2026, 1, 31), 1)).toEqual(jourUTC(2026, 2, 27));
  });
});

describe("restitution du dépôt de garantie", () => {
  it("retient un mois, deux mois si l'état des lieux n'est pas conforme", () => {
    expect(delaiRestitutionMois(true)).toBe(1);
    expect(delaiRestitutionMois(null)).toBe(1);
    expect(delaiRestitutionMois(false)).toBe(2);
    expect(dateLimiteRestitution(jourUTC(2026, 9, 30), true)).toEqual(jourUTC(2026, 10, 30));
    expect(dateLimiteRestitution(jourUTC(2026, 9, 30), false)).toEqual(jourUTC(2026, 11, 30));
  });

  it("majore de 10 % du loyer par mois de retard commencé", () => {
    const limite = jourUTC(2026, 10, 30);
    expect(majorationRetard(600, 600, limite, jourUTC(2026, 10, 30))).toBe(0);
    expect(majorationRetard(600, 600, limite, jourUTC(2026, 11, 2))).toBe(60);
    expect(majorationRetard(600, 600, limite, jourUTC(2026, 12, 30))).toBe(120);
    expect(majorationRetard(600, 600, limite, jourUTC(2027, 1, 5))).toBe(180);
    expect(majorationRetard(0, 600, limite, jourUTC(2027, 1, 5))).toBe(0);
  });

  it("calcule le décompte : dépôt encaissé, retenues, impayés, solde", () => {
    const bail = { depotGarantie: 600, depotRecuMontant: null, depotRecuLe: jourUTC(2026, 9, 1), depotRestitueMontant: null };
    const s = soldeDepot(bail, [{ libelle: "Remise en état", montant: 150 }, { libelle: "Ménage", montant: 80 }], 120);
    expect(s.recu).toBe(600);
    expect(s.retenues).toBe(230);
    expect(s.impayes).toBe(120);
    expect(s.restituable).toBe(250);
    expect(s.resteDuParLocataire).toBe(0);
    expect(s.aVerser).toBe(250);
  });

  it("signale une dette quand les retenues dépassent le dépôt, et déduit ce qui est déjà restitué", () => {
    const bail = { depotGarantie: 600, depotRecuMontant: 600, depotRecuLe: jourUTC(2026, 9, 1), depotRestitueMontant: 100 };
    const dette = soldeDepot(bail, [{ libelle: "Dégradations", montant: 900 }]);
    expect(dette.restituable).toBe(0);
    expect(dette.resteDuParLocataire).toBe(300);
    const partiel = soldeDepot(bail, [{ libelle: "Ménage", montant: 100 }]);
    expect(partiel.restituable).toBe(500);
    expect(partiel.restitue).toBe(100);
    expect(partiel.aVerser).toBe(400);
  });

  it("ne compte aucun dépôt tant qu'il n'a pas été encaissé", () => {
    expect(soldeDepot({ depotGarantie: 600, depotRecuLe: null }).recu).toBe(0);
  });

  it("suit les étapes de la sortie", () => {
    const etapes = etapesSortie({ congeRecuLe: jourUTC(2026, 9, 1), congeDateDepart: jourUTC(2026, 11, 30), etatLieuxSortieLe: null, dateFinEffective: null, statut: "SIGNE", depotRestitueLe: null, depotRecuLe: jourUTC(2026, 1, 1) });
    expect(etapes.map((e) => e.faite)).toEqual([true, false, false, false]);
  });
});

describe("assurance habitation", () => {
  const auj = jourUTC(2026, 9, 20);
  it("retient l'attestation dont l'échéance est la plus lointaine", () => {
    const a = { dateEcheance: jourUTC(2026, 12, 31) };
    const b = { dateEcheance: jourUTC(2027, 6, 30) };
    expect(attestationCourante([a, b])).toBe(b);
    expect(attestationCourante([])).toBeNull();
  });

  it("qualifie l'état : à jour, bientôt expirée, expirée, manquante", () => {
    expect(etatAssurance([], auj).statut).toBe("MANQUANTE");
    expect(etatAssurance([{ dateEcheance: jourUTC(2027, 6, 30) }], auj).statut).toBe("A_JOUR");
    expect(etatAssurance([{ dateEcheance: jourUTC(2026, 10, 10) }], auj).statut).toBe("BIENTOT_EXPIREE");
    expect(etatAssurance([{ dateEcheance: jourUTC(2026, 9, 10) }], auj).statut).toBe("EXPIREE");
    expect(etatAssurance([{ dateEcheance: jourUTC(2026, 9, 20) }], auj).jours).toBe(0);
    expect(etatAssurance([{ dateEcheance: jourUTC(2026, 9, 20 + JOURS_ALERTE_ASSURANCE) }], auj).statut).toBe("BIENTOT_EXPIREE");
  });

  it("relance un bail en cours, au plus tous les quinze jours", () => {
    const manquante = etatAssurance([], auj);
    expect(doitRelancer({ statut: "SIGNE", assuranceRelanceLe: null }, manquante, auj)).toBe(true);
    expect(doitRelancer({ statut: "TERMINE", assuranceRelanceLe: null }, manquante, auj)).toBe(false);
    expect(doitRelancer({ statut: "SIGNE", assuranceRelanceLe: jourUTC(2026, 9, 12) }, manquante, auj)).toBe(false);
    expect(doitRelancer({ statut: "SIGNE", assuranceRelanceLe: jourUTC(2026, 9, 1) }, manquante, auj)).toBe(true);
    expect(doitRelancer({ statut: "SIGNE", assuranceRelanceLe: null }, etatAssurance([{ dateEcheance: jourUTC(2028, 1, 1) }], auj), auj)).toBe(false);
  });
});
