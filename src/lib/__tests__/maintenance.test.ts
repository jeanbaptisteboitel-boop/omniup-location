import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import type { StatutMaintenance, UrgenceMaintenance } from "@prisma/client";
import { compterDemandes, compterNonLues, comparerDemandes, estOuverte, reponseNonLue, transitionAutorisee, trierDemandes } from "../maintenance";

const le = (jour: number, heure = 0) => new Date(Date.UTC(2026, 8, jour, heure));

const demande = (ref: string, urgence: UrgenceMaintenance, jour: number, statut: StatutMaintenance = "NOUVELLE") => ({ ref, urgence, statut, createdAt: le(jour) });

describe("tri des demandes de maintenance", () => {
  it("classe les plus urgentes d'abord, puis les plus récentes", () => {
    const demandes = [
      demande("normale ancienne", "NORMALE", 1),
      demande("urgente récente", "URGENTE", 10),
      demande("très urgente", "TRES_URGENTE", 2),
      demande("normale récente", "NORMALE", 12),
      demande("urgente ancienne", "URGENTE", 3),
    ];
    expect(trierDemandes(demandes).map((d) => d.ref)).toEqual(["très urgente", "urgente récente", "urgente ancienne", "normale récente", "normale ancienne"]);
  });
  it("ne modifie pas le tableau d'origine", () => {
    const demandes = [demande("a", "NORMALE", 1), demande("b", "TRES_URGENTE", 2)];
    trierDemandes(demandes);
    expect(demandes.map((d) => d.ref)).toEqual(["a", "b"]);
  });
  it("départage deux demandes de même urgence par la date", () => {
    expect(comparerDemandes(demande("a", "URGENTE", 5), demande("b", "URGENTE", 6))).toBeGreaterThan(0);
    expect(comparerDemandes(demande("a", "TRES_URGENTE", 1), demande("b", "NORMALE", 30))).toBeLessThan(0);
  });
});

describe("compteurs", () => {
  it("sépare les demandes en cours des demandes clôturées", () => {
    const c = compterDemandes([
      demande("1", "NORMALE", 1, "NOUVELLE"),
      demande("2", "URGENTE", 2, "PRISE_EN_COMPTE"),
      demande("3", "TRES_URGENTE", 3, "PLANIFIEE"),
      demande("4", "TRES_URGENTE", 4, "RESOLUE"),
      demande("5", "URGENTE", 5, "REFUSEE"),
      demande("6", "NORMALE", 6, "NOUVELLE"),
    ]);
    expect(c).toEqual({ total: 6, ouvertes: 4, nouvelles: 2, urgentes: 2, cloturees: 2 });
  });
  it("renvoie des compteurs nuls sans demande", () => {
    expect(compterDemandes([])).toEqual({ total: 0, ouvertes: 0, nouvelles: 0, urgentes: 0, cloturees: 0 });
  });
  it("reconnaît les statuts encore ouverts", () => {
    expect(["NOUVELLE", "PRISE_EN_COMPTE", "PLANIFIEE"].every((s) => estOuverte(s as StatutMaintenance))).toBe(true);
    expect(["RESOLUE", "REFUSEE"].some((s) => estOuverte(s as StatutMaintenance))).toBe(false);
  });
});

describe("transitions de statut", () => {
  it("autorise la progression normale d'une demande", () => {
    expect(transitionAutorisee("NOUVELLE", "PRISE_EN_COMPTE")).toBe(true);
    expect(transitionAutorisee("PRISE_EN_COMPTE", "PLANIFIEE")).toBe(true);
    expect(transitionAutorisee("PLANIFIEE", "RESOLUE")).toBe(true);
    expect(transitionAutorisee("NOUVELLE", "REFUSEE")).toBe(true);
  });
  it("interdit de revenir en arrière ou de passer d'un statut clos à l'autre", () => {
    expect(transitionAutorisee("PRISE_EN_COMPTE", "NOUVELLE")).toBe(false);
    expect(transitionAutorisee("RESOLUE", "REFUSEE")).toBe(false);
    expect(transitionAutorisee("REFUSEE", "PLANIFIEE")).toBe(false);
    expect(transitionAutorisee("RESOLUE", "RESOLUE")).toBe(false);
  });
  it("permet de rouvrir une demande clôturée", () => {
    expect(transitionAutorisee("RESOLUE", "PRISE_EN_COMPTE")).toBe(true);
    expect(transitionAutorisee("REFUSEE", "PRISE_EN_COMPTE")).toBe(true);
  });
});

describe("réponses non lues du locataire", () => {
  const message = (auteur: "LOCATAIRE" | "GESTIONNAIRE", jour: number, heure = 0) => ({ auteur, createdAt: le(jour, heure) });

  it("signale une réponse du gestionnaire postérieure à la dernière lecture", () => {
    expect(reponseNonLue({ luLocataireLe: le(5), messages: [message("LOCATAIRE", 4), message("GESTIONNAIRE", 6)] })).toBe(true);
  });
  it("ne signale rien quand la réponse a déjà été lue", () => {
    expect(reponseNonLue({ luLocataireLe: le(7), messages: [message("GESTIONNAIRE", 6)] })).toBe(false);
  });
  it("ignore les messages du locataire lui-même", () => {
    expect(reponseNonLue({ luLocataireLe: le(5), messages: [message("LOCATAIRE", 9)] })).toBe(false);
  });
  it("signale une réponse jamais lue", () => {
    expect(reponseNonLue({ luLocataireLe: null, messages: [message("GESTIONNAIRE", 1)] })).toBe(true);
  });
  it("compte les demandes concernées", () => {
    const demandes = [
      { luLocataireLe: le(5), messages: [message("GESTIONNAIRE", 6)] },
      { luLocataireLe: le(8), messages: [message("GESTIONNAIRE", 6), message("LOCATAIRE", 9)] },
      { luLocataireLe: null, messages: [] },
      { luLocataireLe: null, messages: [message("GESTIONNAIRE", 2), message("GESTIONNAIRE", 3)] },
    ];
    expect(compterNonLues(demandes)).toBe(2);
  });
});
