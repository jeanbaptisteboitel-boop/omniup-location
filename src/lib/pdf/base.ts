import "server-only";
import PDFDocument from "pdfkit";
import type { Bailleur, Locataire, Lot } from "@prisma/client";
import { adresseSurPlusieursLignes, nomComplet } from "../libelles";

export const NAVY = "#172c52";
export const GRIS = "#64748b";
export const TEXTE = "#0f172a";
export const CLAIR = "#eef2f9";
export const MARGE = 50;
export const LARGEUR = 595.28 - 2 * MARGE; // A4

/** Nettoie les caractères absents de l'encodage WinAnsi des polices standard. */
export function t(s: string): string {
  return s.replace(/ /g, " ").replace(/→/g, "->").replace(/[’]/g, "'").replace(/—/g, "-");
}

export type Doc = InstanceType<typeof PDFDocument>;

export function nouveauDocument(titre: string): { doc: Doc; fini: Promise<Buffer> } {
  const doc = new PDFDocument({ size: "A4", margin: MARGE, bufferPages: true, info: { Title: titre, Author: "OMNIUP Location" } });
  const fini = new Promise<Buffer>((resolve, reject) => {
    const morceaux: Buffer[] = [];
    doc.on("data", (c: Buffer) => morceaux.push(c));
    doc.on("end", () => resolve(Buffer.concat(morceaux)));
    doc.on("error", reject);
  });
  return { doc, fini };
}

/** Pied de page numéroté sur toutes les pages, puis clôture du document. */
export function finaliser(doc: Doc, fini: Promise<Buffer>, pied: string): Promise<Buffer> {
  const plage = doc.bufferedPageRange();
  for (let i = plage.start; i < plage.start + plage.count; i++) {
    doc.switchToPage(i);
    const bas = doc.page.margins.bottom;
    doc.page.margins.bottom = 0;
    doc.font("Helvetica").fontSize(7.5).fillColor(GRIS).text(t(`${pied} - page ${i - plage.start + 1}/${plage.count}`), MARGE, doc.page.height - 35, { width: LARGEUR, align: "center", lineBreak: false });
    doc.page.margins.bottom = bas;
  }
  doc.end();
  return fini;
}

export function paragraphe(doc: Doc, texte: string, options: PDFKit.Mixins.TextOptions & { taille?: number; couleur?: string; gras?: boolean } = {}): void {
  const { taille = 10, couleur = TEXTE, gras = false, ...reste } = options;
  doc.font(gras ? "Helvetica-Bold" : "Helvetica").fontSize(taille).fillColor(couleur).text(t(texte), MARGE, doc.y, { width: LARGEUR, ...reste });
}

export function titreSection(doc: Doc, texte: string): void {
  doc.moveDown(0.8);
  doc.font("Helvetica-Bold").fontSize(11).fillColor(NAVY).text(t(texte.toUpperCase()), MARGE, doc.y, { width: LARGEUR, characterSpacing: 0.5 });
  doc.moveTo(MARGE, doc.y + 2).lineTo(MARGE + LARGEUR, doc.y + 2).lineWidth(0.8).strokeColor(NAVY).stroke();
  doc.moveDown(0.6);
}

export function lignesBailleur(b: Bailleur | null): { nom: string; lignes: string[] } {
  if (!b) return { nom: "[Bailleur non renseigné]", lignes: ["Indiquez le bailleur dans la fiche du lot."] };
  return {
    nom: b.nom,
    lignes: [...(b.representant ? [`représenté(e) par ${b.representant}`] : []), ...adresseSurPlusieursLignes(b), ...(b.email ? [b.email] : []), ...(b.telephone ? [b.telephone] : [])],
  };
}

export function lignesLocataire(l: Locataire, lot: Lot): { nom: string; lignes: string[] } {
  return { nom: nomComplet(l), lignes: adresseSurPlusieursLignes(lot) };
}

/** En-tête : bailleur à gauche, titre et références à droite. */
export function enTete(doc: Doc, bailleur: { nom: string; lignes: string[] }, titre: string, references: string[]): void {
  const haut = MARGE;
  doc.font("Helvetica-Bold").fontSize(11).fillColor(NAVY).text(t(bailleur.nom), MARGE, haut, { width: 260 });
  doc.font("Helvetica").fontSize(9).fillColor(TEXTE);
  for (const l of bailleur.lignes) doc.text(t(l), MARGE, doc.y, { width: 260 });
  const yGauche = doc.y;

  doc.font("Helvetica-Bold").fontSize(17).fillColor(NAVY).text(t(titre), MARGE + 270, haut, { width: LARGEUR - 270, align: "right" });
  doc.font("Helvetica").fontSize(9).fillColor(GRIS);
  for (const r of references) doc.text(t(r), MARGE + 270, doc.y, { width: LARGEUR - 270, align: "right" });
  const yDroite = doc.y;

  doc.y = Math.max(yGauche, yDroite) + 18;
  doc.moveTo(MARGE, doc.y).lineTo(MARGE + LARGEUR, doc.y).lineWidth(1).strokeColor(NAVY).stroke();
  doc.moveDown(1);
}

/** Bloc destinataire (nom + adresse), décalé à droite comme sur un courrier. */
export function blocDestinataire(doc: Doc, destinataire: { nom: string; lignes: string[] }): void {
  const x = MARGE + 270;
  doc.font("Helvetica-Bold").fontSize(10.5).fillColor(TEXTE).text(t(destinataire.nom), x, doc.y, { width: LARGEUR - 270 });
  doc.font("Helvetica").fontSize(10);
  for (const l of destinataire.lignes) doc.text(t(l), x, doc.y, { width: LARGEUR - 270 });
  doc.moveDown(1.2);
}

/** Tableau à deux colonnes libellé / montant. */
export function tableauMontants(doc: Doc, lignes: { libelle: string; montant: string; gras?: boolean; detail?: string }[]): void {
  const colMontant = 130;
  for (const l of lignes) {
    const y = doc.y;
    const h = l.detail ? 30 : 20;
    if (l.gras) doc.rect(MARGE, y, LARGEUR, h).fillColor(CLAIR).fill();
    doc.font(l.gras ? "Helvetica-Bold" : "Helvetica").fontSize(10).fillColor(TEXTE).text(t(l.libelle), MARGE + 8, y + 5, { width: LARGEUR - colMontant - 16, lineBreak: false });
    if (l.detail) doc.font("Helvetica").fontSize(8).fillColor(GRIS).text(t(l.detail), MARGE + 8, y + 17, { width: LARGEUR - colMontant - 16, lineBreak: false });
    doc.font(l.gras ? "Helvetica-Bold" : "Helvetica").fontSize(10).fillColor(TEXTE).text(t(l.montant), MARGE + LARGEUR - colMontant - 8, y + 5, { width: colMontant, align: "right", lineBreak: false });
    doc.moveTo(MARGE, y + h).lineTo(MARGE + LARGEUR, y + h).lineWidth(0.5).strokeColor("#cbd5e1").stroke();
    doc.y = y + h;
  }
  doc.moveDown(0.8);
}

/** Tableau clé / valeur sur une colonne. */
export function tableauCles(doc: Doc, lignes: [string, string][]): void {
  for (const [k, v] of lignes) {
    const y = doc.y;
    doc.font("Helvetica-Bold").fontSize(9.5).fillColor(GRIS).text(t(k), MARGE, y, { width: 170, lineBreak: false });
    doc.font("Helvetica").fontSize(10).fillColor(TEXTE).text(t(v), MARGE + 175, y, { width: LARGEUR - 175 });
    doc.y = Math.max(doc.y, y + 14);
  }
  doc.moveDown(0.6);
}

/** Rendu d'un texte structuré : « # » titre, « ## » sous-titre, « - » liste, paragraphes. */
export function texteStructure(doc: Doc, texte: string): void {
  for (const brute of texte.split(/\r?\n/)) {
    const l = brute.trimEnd();
    if (l.startsWith("# ")) {
      doc.moveDown(0.4);
      doc.font("Helvetica-Bold").fontSize(15).fillColor(NAVY).text(t(l.slice(2).trim()), MARGE, doc.y, { width: LARGEUR, align: "center" });
      doc.moveDown(0.6);
    } else if (l.startsWith("## ")) {
      doc.moveDown(0.7);
      doc.font("Helvetica-Bold").fontSize(11.5).fillColor(NAVY).text(t(l.slice(3).trim()), MARGE, doc.y, { width: LARGEUR });
      doc.moveDown(0.25);
    } else if (l.startsWith("### ")) {
      doc.moveDown(0.5);
      doc.font("Helvetica-Bold").fontSize(10.5).fillColor(TEXTE).text(t(l.slice(4).trim()), MARGE, doc.y, { width: LARGEUR });
      doc.moveDown(0.2);
    } else if (/^\s*[-*•]\s+/.test(l)) {
      const contenu = l.replace(/^\s*[-*•]\s+/, "");
      const y = doc.y;
      doc.font("Helvetica").fontSize(10).fillColor(TEXTE).text("•", MARGE + 6, y, { lineBreak: false });
      doc.text(t(contenu), MARGE + 18, y, { width: LARGEUR - 18, align: "justify", paragraphGap: 2 });
    } else if (l.trim() === "") {
      doc.moveDown(0.5);
    } else {
      doc.font("Helvetica").fontSize(10).fillColor(TEXTE).text(t(l.replace(/\*\*/g, "")), MARGE, doc.y, { width: LARGEUR, align: "justify", paragraphGap: 2 });
    }
  }
}
