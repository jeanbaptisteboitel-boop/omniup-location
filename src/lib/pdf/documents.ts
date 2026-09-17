import "server-only";
import type { Bailleur, Locataire, Lot } from "@prisma/client";
import { formatDate } from "../dates";
import { TYPES_BAIL } from "../libelles";
import { enTete, finaliser, lignesBailleur, lignesLocataire, nouveauDocument, texteStructure, blocDestinataire, paragraphe } from "./base";

/** Contrat de bail à partir du texte structuré enregistré. */
export async function pdfContrat(bail: { type: keyof typeof TYPES_BAIL; texteContrat: string | null; dateDebut: Date; lot: Lot & { bailleur: Bailleur | null }; locataire: Locataire }): Promise<Buffer> {
  const { doc, fini } = nouveauDocument(`Contrat de location - ${bail.lot.nom}`);
  const texte = bail.texteContrat?.trim() || `# ${TYPES_BAIL[bail.type]}\n\n[Le texte du contrat n'a pas encore été rédigé.]`;
  texteStructure(doc, texte);
  return finaliser(doc, fini, `${TYPES_BAIL[bail.type]} - ${bail.lot.nom} - prise d'effet le ${formatDate(bail.dateDebut)}`);
}

/** Courrier au locataire (révision de loyer, relance…). */
export async function pdfCourrier(courrier: { objet: string; contenu: string; createdAt: Date; bail: { lot: Lot & { bailleur: Bailleur | null }; locataire: Locataire } }): Promise<Buffer> {
  const { doc, fini } = nouveauDocument(courrier.objet);
  const bailleur = courrier.bail.lot.bailleur;
  const contenu = courrier.contenu.trim();
  // Si le texte comporte déjà un en-tête complet (coordonnées, objet), on le rend tel quel ; sinon on ajoute l'en-tête.
  const dejaEnTete = /^objet\s*:/im.test(contenu) && bailleur !== null && contenu.includes(bailleur.nom);
  if (!dejaEnTete) {
    enTete(doc, lignesBailleur(bailleur), "COURRIER", [`Le ${formatDate(courrier.createdAt)}`]);
    blocDestinataire(doc, lignesLocataire(courrier.bail.locataire, courrier.bail.lot));
    paragraphe(doc, `Objet : ${courrier.objet}`, { gras: true });
    doc.moveDown(0.8);
  }
  texteStructure(doc, contenu);
  return finaliser(doc, fini, `${courrier.objet} - ${bailleur?.nom ?? ""}`);
}
