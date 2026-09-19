import "server-only";
import { formatDate, formatDateLongue, aujourdhui } from "../dates";
import { formatEuros, formatNombre } from "../montants";
import { CATEGORIES_DEPENSE, TYPES_LOT } from "../libelles";
import { ABATTEMENT_MICRO_FONCIER, LIBELLES_2044, LIGNES_2044, LIGNES_A_COMPLETER, PLAFOND_DEFICIT_REVENU_GLOBAL, SEUIL_MICRO_FONCIER, type Ligne2044, type Resultat2044 } from "../declaration-2044-calcul";
import { GRIS, NAVY, MARGE, LARGEUR, finaliser, nouveauDocument, paragraphe, tableauCles, tableauMontants, titreSection } from "./base";

const SOUS_TOTAUX: Ligne2044[] = ["215", "240", "261", "263"];
const euros = (x: number) => `${formatNombre(x, 0)} €`;

/** État d'aide au remplissage de la déclaration 2044 : une section par immeuble, puis le report sur la 2042. */
export async function pdfDeclaration2044(r: Resultat2044, entite: string): Promise<Buffer> {
  const { doc, fini } = nouveauDocument(`Aide à la déclaration 2044 - revenus ${r.annee}`);
  doc.font("Helvetica-Bold").fontSize(18).fillColor(NAVY).text(`Aide à la déclaration des revenus fonciers ${r.annee}`, MARGE, MARGE, { width: LARGEUR });
  doc.font("Helvetica").fontSize(10).fillColor(GRIS).text(`Formulaire n° 2044 (régime réel) · ${entite} · établi le ${formatDateLongue(aujourdhui())}`, MARGE, doc.y + 4, { width: LARGEUR });
  doc.moveDown(1);
  paragraphe(doc, "Montants en euros entiers, comme sur le formulaire. Périmètre : locations nues (revenus fonciers) ; les locations meublées relèvent des BIC. Les provisions sur charges récupérables et la TVA collectée sont écartées.", { taille: 9, couleur: GRIS });

  titreSection(doc, "Synthèse");
  tableauMontants(doc, [
    { libelle: "215 · Total des recettes brutes", montant: euros(r.totalCases["215"]) },
    { libelle: "240 · Total des frais et charges", montant: euros(r.totalCases["240"]) },
    { libelle: "250 · Intérêts d'emprunt", montant: euros(r.totalCases["250"]) },
    { libelle: "420 · Résultat foncier (bénéfice ou déficit)", montant: euros(r.resultat.ligne420), gras: true },
    ...(r.resultat.cases["4BA"] !== undefined ? [{ libelle: "Report 2042 · case 4BA (bénéfice)", montant: euros(r.resultat.cases["4BA"]), gras: true }] : []),
    ...(r.resultat.cases["4BC"] !== undefined ? [{ libelle: `Report 2042 · case 4BC (déficit imputable sur le revenu global, limite ${formatNombre(PLAFOND_DEFICIT_REVENU_GLOBAL, 0)} €)`, montant: euros(r.resultat.cases["4BC"]), gras: true }] : []),
    ...(r.resultat.cases["4BB"] !== undefined ? [{ libelle: "Report 2042 · case 4BB (déficit reportable sur les revenus fonciers, 10 ans)", montant: euros(r.resultat.cases["4BB"]), gras: true }] : []),
  ]);
  if (r.resultat.etapes.length > 1) {
    paragraphe(doc, "Calcul de la répartition du déficit (cadre 430 à 442) :", { gras: true, taille: 9.5 });
    tableauMontants(doc, r.resultat.etapes.map((e) => ({ libelle: `${e.ligne} · ${e.libelle}`, montant: euros(e.montant) })));
  }

  for (const c of r.colonnes) {
    doc.addPage();
    titreSection(doc, `Immeuble ${c.numero} · ${c.nom}`);
    tableauCles(doc, [
      ["Adresse", c.adresse],
      ["Lots", c.lots.map((l) => `${l.nom} (${TYPES_LOT[l.type].toLowerCase()})`).join(", ")],
      ["Locaux loués dans l'année", `${c.nombreLocaux} (forfait ligne 222 : ${euros(c.cases["222"])})`],
      ["Charges récupérables encaissées", `${formatEuros(c.chargesRecuperables)} (non retenues)`],
      ...(c.tvaCollectee > 0 ? [["TVA collectée", `${formatEuros(c.tvaCollectee)} (hors revenus fonciers)`] as [string, string]] : []),
    ]);
    tableauMontants(
      doc,
      LIGNES_2044.map((l) => ({
        libelle: `${l} · ${LIBELLES_2044[l]}${LIGNES_A_COMPLETER.includes(l) && c.cases[l] === 0 ? " (à compléter le cas échéant)" : ""}`,
        montant: euros(c.cases[l]),
        gras: SOUS_TOTAUX.includes(l),
      })),
    );
    if (c.travaux.length) {
      paragraphe(doc, "Rubrique 400 · paiement des travaux (ligne 224)", { gras: true, taille: 9.5 });
      tableauMontants(doc, c.travaux.map((t) => ({ libelle: `${formatDate(t.date)} · ${t.libelle} · ${t.fournisseur ?? "[entrepreneur à préciser]"}`, detail: `${t.bien} · ${CATEGORIES_DEPENSE[t.categorie]}`, montant: formatEuros(t.montant) })));
    }
    if (c.interets.length) {
      paragraphe(doc, "Rubrique 410 · intérêts d'emprunt (ligne 250)", { gras: true, taille: 9.5 });
      tableauMontants(doc, c.interets.map((e) => ({ libelle: `${e.emprunt} · ${e.banque ?? "[organisme prêteur à préciser]"}${e.dateDebut ? ` · prêt du ${formatDate(e.dateDebut)}` : ""}`, detail: `intérêts ${formatEuros(e.interets)} + assurance ${formatEuros(e.assurance)}`, montant: formatEuros(e.interets + e.assurance) })));
    }
    for (const n of c.notes) paragraphe(doc, `Point de vigilance : ${n}`, { taille: 8.5, couleur: GRIS });
  }

  doc.addPage();
  titreSection(doc, "Régime micro-foncier");
  if (r.microFoncier.eligible) {
    tableauMontants(doc, [
      { libelle: `Recettes brutes (seuil ${formatNombre(SEUIL_MICRO_FONCIER, 0)} €)`, montant: euros(r.microFoncier.recettesBrutes) },
      { libelle: `Revenu net au micro-foncier (abattement ${Math.round(ABATTEMENT_MICRO_FONCIER * 100)} %, case 4BE)`, montant: euros(r.microFoncier.revenuNetMicro) },
      { libelle: "Revenu net au régime réel (2044)", montant: euros(r.microFoncier.revenuNetReel), gras: true },
    ]);
    paragraphe(doc, r.microFoncier.revenuNetReel < r.microFoncier.revenuNetMicro ? "Le régime réel est plus favorable cette année ; l'option pour le réel engage pour trois ans." : "Le micro-foncier est plus favorable cette année : aucune 2044 à remplir, le total des recettes se déclare en case 4BE.", { taille: 9 });
  } else {
    paragraphe(doc, `Recettes brutes de ${euros(r.microFoncier.recettesBrutes)} : au-delà du seuil de ${formatNombre(SEUIL_MICRO_FONCIER, 0)} €, le régime réel s'impose.`, { taille: 9 });
  }
  if (r.horsChamp.lots.length) {
    titreSection(doc, "Hors champ : locations meublées (BIC)");
    tableauMontants(doc, r.horsChamp.lots.map((l) => ({ libelle: l.nom, detail: `${formatEuros(l.depenses)} de dépenses`, montant: formatEuros(l.loyers) })));
  }
  if (r.depensesNonAffectees.length) {
    titreSection(doc, "Dépenses à affecter à la main");
    tableauMontants(doc, r.depensesNonAffectees.map((d) => ({ libelle: `${formatDate(d.date)} · ${d.libelle}${d.bien ? ` · ${d.bien}` : ""}`, montant: formatEuros(d.montant) })));
  }
  doc.moveDown(1);
  paragraphe(doc, "État d'aide au remplissage établi à partir des paiements encaissés dans l'année et des dépenses saisies à leur date. Les lignes 212, 213, 214, 224bis, 225, 226, 228, 230 et 262 dépendent d'éléments inconnus de l'application. Vérifiez chaque montant avant de le reporter ; cet état ne remplace ni la notice du formulaire ni l'appréciation du déclarant.", { taille: 8.5, couleur: GRIS });
  return finaliser(doc, fini, `Aide à la déclaration 2044 - revenus ${r.annee} - ${entite}`);
}
