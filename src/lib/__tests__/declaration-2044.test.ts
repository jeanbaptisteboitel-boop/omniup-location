import { describe, expect, it } from "vitest";
import { construire2044, regimeLot, type Donnees2044 } from "../declaration-2044-calcul";
import { jourUTC } from "../dates";

const lots: Donnees2044["lots"] = [
  { id: 1, nom: "T2 – 2e étage", adresse: "5 rue des Tilleuls", codePostal: "76100", ville: "Rouen", type: "APPARTEMENT", meuble: false, immeubleId: 10 },
  { id: 2, nom: "Boutique", adresse: "5 rue des Tilleuls", codePostal: "76100", ville: "Rouen", type: "LOCAL_COMMERCIAL", meuble: false, immeubleId: 10 },
  { id: 3, nom: "Maison Bayeux", adresse: "1 rue du Port", codePostal: "14400", ville: "Bayeux", type: "MAISON", meuble: false, immeubleId: null },
  { id: 4, nom: "Studio meublé", adresse: "2 rue du Port", codePostal: "14400", ville: "Bayeux", type: "APPARTEMENT", meuble: true, immeubleId: null },
];
const immeubles: Donnees2044["immeubles"] = [{ id: 10, nom: "Résidence Les Tilleuls", adresse: "5 rue des Tilleuls", codePostal: "76100", ville: "Rouen" }];
const appelNu = { loyer: 600, charges: 60, montantTva: 0, total: 660 };
const appelTva = { loyer: 1000, charges: 100, montantTva: 220, total: 1320 };
const appelMeuble = { loyer: 500, charges: 50, montantTva: 0, total: 550 };

function donnees(extra: Partial<Donnees2044> = {}): Donnees2044 {
  return {
    annee: 2025,
    lots,
    immeubles,
    paiements: [
      { montant: 660, appel: appelNu, bail: { type: "NON_MEUBLE", lotId: 1 } },
      { montant: 660, appel: appelNu, bail: { type: "NON_MEUBLE", lotId: 1 } },
      { montant: 1320, appel: appelTva, bail: { type: "COMMERCIAL", lotId: 2 } },
      { montant: 900, appel: { loyer: 900, charges: 0, montantTva: 0, total: 900 }, bail: { type: "NON_MEUBLE", lotId: 3 } },
      { montant: 550, appel: appelMeuble, bail: { type: "MEUBLE", lotId: 4 } },
    ],
    baux: [
      { type: "NON_MEUBLE", lotId: 1 },
      { type: "COMMERCIAL", lotId: 2 },
      { type: "NON_MEUBLE", lotId: 3 },
      { type: "MEUBLE", lotId: 4 },
    ],
    depenses: [
      { date: jourUTC(2025, 3, 10), libelle: "Chauffe-eau", categorie: "REPARATION_ENTRETIEN", montant: 1250.5, fournisseur: "Plomberie Dupont", lotId: 1, immeubleId: null },
      { date: jourUTC(2025, 4, 2), libelle: "Ravalement", categorie: "AMELIORATION", montant: 3000, fournisseur: "Façades SA", lotId: 2, immeubleId: null },
      { date: jourUTC(2025, 10, 15), libelle: "Taxe foncière", categorie: "TAXE_FONCIERE", montant: 980, fournisseur: null, lotId: null, immeubleId: 10 },
      { date: jourUTC(2025, 1, 5), libelle: "Assurance PNO", categorie: "ASSURANCE_PNO", montant: 180, fournisseur: "Assureur", lotId: 3, immeubleId: null },
      { date: jourUTC(2025, 6, 1), libelle: "Honoraires gestion", categorie: "GESTION_LOCATIVE", montant: 300, fournisseur: null, lotId: 3, immeubleId: null },
      { date: jourUTC(2025, 2, 1), libelle: "Appel de fonds syndic", categorie: "COPROPRIETE", montant: 400, fournisseur: "Syndic", lotId: 1, immeubleId: null },
      { date: jourUTC(2025, 7, 1), libelle: "Divers", categorie: "AUTRE", montant: 50, fournisseur: null, lotId: 3, immeubleId: null },
      { date: jourUTC(2025, 8, 1), libelle: "Ménage studio", categorie: "REPARATION_ENTRETIEN", montant: 120, fournisseur: null, lotId: 4, immeubleId: null },
    ],
    echeances: [
      { date: jourUTC(2025, 1, 5), interets: 200, assurance: 20, emprunt: { id: 7, libelle: "Prêt Tilleuls", banque: "Crédit Agricole", dateDebut: jourUTC(2020, 1, 1), lotId: null, immeubleId: 10 } },
      { date: jourUTC(2025, 2, 5), interets: 199, assurance: 20, emprunt: { id: 7, libelle: "Prêt Tilleuls", banque: "Crédit Agricole", dateDebut: jourUTC(2020, 1, 1), lotId: null, immeubleId: 10 } },
    ],
    ...extra,
  };
}

describe("aide au remplissage de la 2044", () => {
  it("détermine le régime d'un lot d'après ses baux", () => {
    expect(regimeLot({ meuble: false }, [{ type: "NON_MEUBLE", lotId: 1 }])).toBe("FONCIER");
    expect(regimeLot({ meuble: false }, [{ type: "MEUBLE", lotId: 1 }, { type: "NON_MEUBLE", lotId: 1 }])).toBe("FONCIER");
    expect(regimeLot({ meuble: true }, [{ type: "SAISONNIER", lotId: 1 }])).toBe("BIC");
    expect(regimeLot({ meuble: true }, [])).toBe("BIC");
    expect(regimeLot({ meuble: false }, [])).toBe("FONCIER");
  });

  it("ventile recettes et charges par immeuble, hors charges récupérables et TVA", () => {
    const r = construire2044(donnees());
    expect(r.colonnes.map((c) => c.nom)).toEqual(["Maison Bayeux", "Résidence Les Tilleuls"]);
    const tilleuls = r.colonnes[1];
    expect(tilleuls.numero).toBe(2);
    expect(tilleuls.lots.map((l) => l.id)).toEqual([1, 2]);
    expect(tilleuls.nombreLocaux).toBe(2);
    expect(tilleuls.lignes["211"]).toBe(2200); // 600 + 600 + 1000 HT
    expect(tilleuls.chargesRecuperables).toBe(220);
    expect(tilleuls.tvaCollectee).toBe(220);
    expect(tilleuls.lignes["222"]).toBe(40);
    expect(tilleuls.lignes["224"]).toBe(4250.5);
    expect(tilleuls.lignes["227"]).toBe(980);
    expect(tilleuls.lignes["229"]).toBe(400);
    expect(tilleuls.lignes["250"]).toBe(439);
    expect(tilleuls.lignes["215"]).toBe(2200);
    expect(tilleuls.lignes["240"]).toBe(40 + 4250.5 + 980 + 400);
    expect(tilleuls.lignes["263"]).toBe(2200 - 5670.5 - 439);
    expect(tilleuls.cases["224"]).toBe(4251);
    expect(tilleuls.cases["263"]).toBe(2200 - (40 + 4251 + 980 + 400) - 439);
    expect(tilleuls.travaux).toHaveLength(2);
    expect(tilleuls.interets).toEqual([{ emprunt: "Prêt Tilleuls", banque: "Crédit Agricole", dateDebut: jourUTC(2020, 1, 1), interets: 399, assurance: 40, bien: "Résidence Les Tilleuls" }]);
    expect(tilleuls.notes.some((n) => n.includes("local commercial"))).toBe(true);
    expect(tilleuls.notes.some((n) => n.includes("TVA collectée"))).toBe(true);
    const bayeux = r.colonnes[0];
    expect(bayeux.lignes["211"]).toBe(900);
    expect(bayeux.lignes["221"]).toBe(300);
    expect(bayeux.lignes["223"]).toBe(180);
    expect(bayeux.lignes["222"]).toBe(20);
    expect(bayeux.lignes["263"]).toBe(900 - 500);
    expect(r.depensesNonAffectees).toEqual([{ date: jourUTC(2025, 7, 1), libelle: "Divers", montant: 50, bien: "Maison Bayeux" }]);
  });

  it("écarte les locations meublées (BIC) avec leurs dépenses", () => {
    const r = construire2044(donnees());
    expect(r.horsChamp.lots).toEqual([{ id: 4, nom: "Studio meublé", loyers: 550, depenses: 120 }]);
    expect(r.horsChamp.loyers).toBe(550);
  });

  it("calcule le déficit et sa répartition entre revenu global et revenus fonciers (intérêts inférieurs aux revenus)", () => {
    const r = construire2044(donnees());
    expect(r.resultat.ligne420).toBe(400 + (2200 - 5671 - 439));
    expect(r.resultat.ligne420).toBe(-3510);
    expect(r.resultat.cases).toEqual({ "4BC": 3510, "4BB": 0 });
    expect(r.microFoncier.eligible).toBe(true);
    expect(r.microFoncier.recettesBrutes).toBe(3100);
    expect(r.microFoncier.revenuNetMicro).toBe(2170);
  });

  it("plafonne l'imputation sur le revenu global à 10 700 € et reporte le surplus", () => {
    const r = construire2044(donnees({ depenses: [{ date: jourUTC(2025, 3, 10), libelle: "Toiture", categorie: "REPARATION_ENTRETIEN", montant: 20000, fournisseur: null, lotId: 3, immeubleId: null }], echeances: [] }));
    expect(r.resultat.ligne420).toBe(3100 - 60 - 20000);
    expect(r.resultat.cases["4BC"]).toBe(10700);
    expect(r.resultat.cases["4BB"]).toBe(16960 - 10700);
  });

  it("isole la part du déficit provenant des intérêts d'emprunt", () => {
    const r = construire2044(donnees({ depenses: [], echeances: [{ date: jourUTC(2025, 1, 5), interets: 5000, assurance: 0, emprunt: { id: 9, libelle: "Prêt", banque: null, dateDebut: null, lotId: 3, immeubleId: null } }] }));
    // Bayeux : 900 de loyers, 20 de forfait, 5000 d'intérêts ; Tilleuls : 2200 de loyers, 40 de forfait.
    expect(r.resultat.ligne431).toBe(3100);
    expect(r.resultat.ligne432).toBe(5000);
    expect(r.resultat.ligne433).toBe(60);
    expect(r.resultat.cases).toEqual({ "4BC": 60, "4BB": 5000 - 3100 });
    expect(r.resultat.etapes.some((e) => e.ligne === "438")).toBe(true);
  });

  it("déclare un bénéfice en case 4BA", () => {
    const r = construire2044(donnees({ depenses: [], echeances: [] }));
    expect(r.resultat.cases).toEqual({ "4BA": 3100 - 60 });
  });
});
