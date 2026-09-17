import { describe, expect, it } from "vitest";
import { remplirModele, variablesUtilisees, VARIABLES_MODELE } from "../modeles";
import { MODELES_DEFAUT } from "../modeles-defaut";

describe("remplirModele", () => {
  it("remplace les variables connues et signale les manquantes", () => {
    const texte = remplirModele("Loyer : {{bail.loyerHC}} pour {{ locataire.nomComplet }} ; {{bailleur.iban}} ; {{inconnue}}", { "bail.loyerHC": "600,00 €", "locataire.nomComplet": "Mme Claire Martin" });
    expect(texte).toBe("Loyer : 600,00 € pour Mme Claire Martin ; [À COMPLÉTER : IBAN du bailleur] ; [À COMPLÉTER : inconnue]");
  });
  it("liste les variables d'un contenu", () => {
    expect(variablesUtilisees("{{a.b}} {{a.b}} {{c}}")).toEqual(["a.b", "c"]);
  });
  it("les modèles par défaut n'utilisent que des variables documentées", () => {
    const connues = new Set(VARIABLES_MODELE.map((v) => v.cle));
    for (const m of MODELES_DEFAUT) {
      for (const v of variablesUtilisees(m.contenu)) expect(connues.has(v), `${m.code} : ${v}`).toBe(true);
      expect(m.contenu.trim().startsWith("# "), `${m.code} : titre`).toBe(true);
    }
    expect(new Set(MODELES_DEFAUT.map((m) => m.code)).size).toBe(MODELES_DEFAUT.length);
    expect(MODELES_DEFAUT.length).toBeGreaterThanOrEqual(26);
  });
});
