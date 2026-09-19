import { describe, expect, it } from "vitest";
import { emailsLocataires, formuleAppel, identificationLocataires, joindre, libelleLocataires, nomsLocataires, valeurParLocataire } from "../locataires";

const claire = { civilite: "Mme", prenom: "Claire", nom: "Martin", email: "claire@example.org", dateNaissance: new Date(Date.UTC(1991, 2, 14)), adresse: "4 allée des Tilleuls", codePostal: "14000", ville: "Caen" };
const paul = { civilite: "M.", prenom: "Paul", nom: "Durand", email: " paul@example.org ", dateNaissance: null, adresse: "4 allée des Tilleuls", codePostal: "14000", ville: "Caen" };
const sansCivilite = { civilite: null, prenom: "Alex", nom: "Petit", email: null };

describe("locataires d'un bail", () => {
  it("joint les noms", () => {
    expect(joindre([])).toBe("");
    expect(joindre(["A"])).toBe("A");
    expect(joindre(["A", "B"])).toBe("A et B");
    expect(joindre(["A", "B", "C"])).toBe("A, B et C");
    expect(nomsLocataires([claire, paul])).toBe("Mme Claire Martin et M. Paul Durand");
  });
  it("liste les emails distincts et nettoyés", () => {
    expect(emailsLocataires([claire, paul, sansCivilite, { email: "claire@example.org" }])).toEqual(["claire@example.org", "paul@example.org"]);
    expect(emailsLocataires([sansCivilite])).toEqual([]);
  });
  it("formule d'appel", () => {
    expect(formuleAppel([claire])).toBe("Mme Martin");
    expect(formuleAppel([claire, paul])).toBe("Mme Martin et M. Durand");
    expect(formuleAppel([claire, sansCivilite])).toBe("Madame, Monsieur");
    expect(formuleAppel([])).toBe("Madame, Monsieur");
  });
  it("libellés au pluriel", () => {
    expect(libelleLocataires(1)).toBe("le locataire");
    expect(libelleLocataires(2, true)).toBe("Les locataires");
  });
  it("identification pour les contrats", () => {
    expect(identificationLocataires([claire, paul])).toBe(
      "Mme Claire Martin, née le 14/03/1991, demeurant 4 allée des Tilleuls, 14000 Caen, email claire@example.org ; M. Paul Durand, demeurant 4 allée des Tilleuls, 14000 Caen, email paul@example.org",
    );
  });
  it("valeur commune ou détaillée par locataire", () => {
    expect(valeurParLocataire([claire, paul], (l) => `${l.nom.length}`)).toBe("6");
    expect(valeurParLocataire([claire, paul], (l) => l.prenom)).toBe("Claire (Mme Claire Martin) ; Paul (M. Paul Durand)");
    expect(valeurParLocataire([claire, sansCivilite], (l) => ("email" in l && l.email ? String(l.email) : ""))).toBe("claire@example.org (Mme Claire Martin)");
    expect(valeurParLocataire([sansCivilite], () => "")).toBe("");
  });
});
