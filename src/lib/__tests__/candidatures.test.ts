import { describe, expect, it } from "vitest";
import {
  apprecierTauxEffort,
  aPurger,
  avancementDossier,
  candidatureDeposable,
  categoriesAttendues,
  couvertureGarant,
  cumulGarantieInterdit,
  etatPieces,
  nomDossier,
  PIECES,
  pieceDe,
  piecesProposees,
  tauxEffort,
} from "../candidatures";

describe("liste limitative du décret du 5 novembre 2015", () => {
  it("ne propose aucune pièce hors de la liste", () => {
    expect(pieceDe("RELEVE_BANCAIRE")).toBeNull();
    expect(pieceDe("CARTE_VITALE")).toBeNull();
    expect(pieceDe("AVIS_IMPOSITION")).not.toBeNull();
  });

  it("n'a pas deux pièces portant le même code", () => {
    const codes = PIECES.map((p) => p.code);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it("propose les bulletins de salaire à un salarié, pas à un indépendant", () => {
    const salarie = piecesProposees("CDI").map((p) => p.code);
    const independant = piecesProposees("INDEPENDANT").map((p) => p.code);
    expect(salarie).toContain("BULLETINS_SALAIRE");
    expect(salarie).toContain("CONTRAT_TRAVAIL");
    expect(independant).not.toContain("BULLETINS_SALAIRE");
    expect(independant).toContain("BILANS");
    expect(independant).toContain("KBIS");
  });

  it("demande l'avis d'imposition quelle que soit la situation", () => {
    for (const s of ["CDI", "INDEPENDANT", "RETRAITE", "ETUDIANT", "SANS_EMPLOI"] as const) {
      expect(piecesProposees(s).map((p) => p.code)).toContain("AVIS_IMPOSITION");
    }
  });

  it("n'attend pas de justificatif d'activité d'un retraité ni d'un sans-emploi", () => {
    expect(categoriesAttendues("RETRAITE")).toEqual(["IDENTITE", "DOMICILE", "RESSOURCES"]);
    expect(categoriesAttendues("SANS_EMPLOI")).toEqual(["IDENTITE", "DOMICILE", "RESSOURCES"]);
    expect(categoriesAttendues("CDI")).toEqual(["IDENTITE", "DOMICILE", "ACTIVITE", "RESSOURCES"]);
  });

  it("limite la caution personne morale à son identification et à ses ressources", () => {
    const codes = piecesProposees(null, true).map((p) => p.code);
    expect(codes).toContain("KBIS_IDENTITE");
    expect(codes).not.toContain("QUITTANCES");
    expect(categoriesAttendues(null, true)).toEqual(["IDENTITE", "RESSOURCES"]);
  });
});

describe("couverture des pièces déposées", () => {
  const pieces = [
    { code: "CNI", statut: "VALIDEE" as const },
    { code: "QUITTANCES", statut: "DEPOSEE" as const },
    { code: "CONTRAT_TRAVAIL", statut: "REFUSEE" as const },
  ];

  it("ne compte pas une pièce refusée", () => {
    const etats = etatPieces("CDI", false, pieces);
    expect(etats.find((e) => e.categorie === "ACTIVITE")).toMatchObject({ deposees: 0, refusees: 1, couverte: false });
    expect(etats.find((e) => e.categorie === "IDENTITE")?.couverte).toBe(true);
  });

  it("signale les catégories manquantes", () => {
    const a = avancementDossier(
      { nom: "Martin", prenom: "Claire", raisonSociale: null, email: "c@x.fr", situation: "CDI", revenuMensuel: 2100, personneMorale: false },
      pieces,
    );
    expect(a.informations).toBe(true);
    expect(a.justificatifs).toBe(false);
    expect(a.manquantes).toEqual(["ACTIVITE", "RESSOURCES"]);
  });

  it("déclare le dossier complet quand chaque catégorie a une pièce", () => {
    const a = avancementDossier(
      { nom: "Martin", prenom: "Claire", raisonSociale: null, email: "c@x.fr", situation: "CDI", revenuMensuel: 2100, personneMorale: false },
      [
        { code: "CNI", statut: "VALIDEE" },
        { code: "QUITTANCES", statut: "DEPOSEE" },
        { code: "CONTRAT_TRAVAIL", statut: "DEPOSEE" },
        { code: "BULLETINS_SALAIRE", statut: "DEPOSEE" },
      ],
    );
    expect(a.complet).toBe(true);
  });

  it("exige les informations avant de considérer le dossier complet", () => {
    const a = avancementDossier(
      { nom: "Martin", prenom: "Claire", raisonSociale: null, email: "c@x.fr", situation: "CDI", revenuMensuel: null, personneMorale: false },
      [
        { code: "CNI", statut: "VALIDEE" },
        { code: "QUITTANCES", statut: "DEPOSEE" },
        { code: "CONTRAT_TRAVAIL", statut: "DEPOSEE" },
        { code: "BULLETINS_SALAIRE", statut: "DEPOSEE" },
      ],
    );
    expect(a.informations).toBe(false);
    expect(a.complet).toBe(false);
  });
});

describe("taux d'effort et garanties", () => {
  it("rapporte le loyer charges comprises aux revenus", () => {
    expect(tauxEffort(3000, 900)).toBe(30);
    expect(tauxEffort(2000, 900)).toBe(45);
    expect(tauxEffort(0, 900)).toBeNull();
  });

  it("apprécie trois fois le loyer comme confortable", () => {
    expect(apprecierTauxEffort(tauxEffort(2700, 900))?.ton).toBe("vert");
    expect(apprecierTauxEffort(tauxEffort(2400, 900))?.ton).toBe("orange");
    expect(apprecierTauxEffort(tauxEffort(1800, 900))?.ton).toBe("rouge");
  });

  it("mesure la couverture apportée par la caution", () => {
    expect(couvertureGarant(3600, 900)).toBe(4);
    expect(couvertureGarant(0, 900)).toBeNull();
  });

  it("interdit le cumul caution et assurance loyers impayés, sauf étudiant ou apprenti", () => {
    expect(cumulGarantieInterdit("PERSONNE_PHYSIQUE", true, "CDI")).toBe(true);
    expect(cumulGarantieInterdit("PERSONNE_PHYSIQUE", true, "ETUDIANT")).toBe(false);
    expect(cumulGarantieInterdit("PERSONNE_PHYSIQUE", true, "ALTERNANT")).toBe(false);
    expect(cumulGarantieInterdit("PERSONNE_PHYSIQUE", false, "CDI")).toBe(false);
    expect(cumulGarantieInterdit("VISALE", true, "CDI")).toBe(false);
  });
});

describe("remise et conservation", () => {
  it("n'autorise la remise que si tous les dossiers sont complets", () => {
    expect(candidatureDeposable([{ role: "CANDIDAT", complet: true }])).toBe(true);
    expect(candidatureDeposable([{ role: "CANDIDAT", complet: true }, { role: "GARANT", complet: false }])).toBe(false);
    expect(candidatureDeposable([{ role: "GARANT", complet: true }])).toBe(false);
    expect(candidatureDeposable([])).toBe(false);
  });

  it("signale les dossiers non retenus à détruire après trois mois", () => {
    const auj = new Date("2026-09-20T00:00:00Z");
    expect(aPurger({ statut: "REFUSEE", decisionLe: new Date("2026-06-01T00:00:00Z") }, auj)).toBe(true);
    expect(aPurger({ statut: "REFUSEE", decisionLe: new Date("2026-09-01T00:00:00Z") }, auj)).toBe(false);
    expect(aPurger({ statut: "CONCLUE", decisionLe: new Date("2026-01-01T00:00:00Z") }, auj)).toBe(false);
    expect(aPurger({ statut: "ACCEPTEE", decisionLe: new Date("2026-01-01T00:00:00Z") }, auj)).toBe(false);
  });

  it("nomme un dossier selon qu'il est une personne physique ou morale", () => {
    expect(nomDossier({ nom: "Martin", prenom: "Claire", raisonSociale: null, personneMorale: false })).toBe("Claire Martin");
    expect(nomDossier({ nom: "ACME", prenom: null, raisonSociale: "ACME SAS", personneMorale: true })).toBe("ACME SAS");
  });
});
