import "server-only";
import { prisma } from "./prisma";
import { jourUTC } from "./dates";
import { construire2044, type Resultat2044 } from "./declaration-2044-calcul";

/** Charge les données de l'année pour l'entité et construit l'état d'aide au remplissage de la 2044. */
export async function calculer2044(annee: number, entiteId: number): Promise<Resultat2044 & { annees: number[] }> {
  const debut = jourUTC(annee, 1, 1);
  const fin = jourUTC(annee + 1, 1, 1);
  const [lots, immeubles, paiements, baux, depenses, echeances, premierPaiement, premiereDepense] = await Promise.all([
    prisma.lot.findMany({ where: { entiteId }, select: { id: true, nom: true, adresse: true, codePostal: true, ville: true, type: true, meuble: true, immeubleId: true } }),
    prisma.immeuble.findMany({ where: { entiteId }, select: { id: true, nom: true, adresse: true, codePostal: true, ville: true } }),
    prisma.paiement.findMany({
      where: { date: { gte: debut, lt: fin }, appel: { bail: { entiteId } } },
      select: { montant: true, appel: { select: { loyer: true, charges: true, montantTva: true, total: true, bail: { select: { type: true, lotId: true } } } } },
    }),
    prisma.bail.findMany({
      where: { entiteId, statut: { in: ["SIGNE", "TERMINE"] }, dateDebut: { lt: fin }, OR: [{ dateFinEffective: null, dateFin: { gte: debut } }, { dateFinEffective: { gte: debut } }] },
      select: { type: true, lotId: true },
    }),
    prisma.depense.findMany({ where: { entiteId, date: { gte: debut, lt: fin } }, orderBy: { date: "asc" }, select: { date: true, libelle: true, categorie: true, montant: true, fournisseur: true, lotId: true, immeubleId: true } }),
    prisma.echeanceEmprunt.findMany({
      where: { date: { gte: debut, lt: fin }, emprunt: { entiteId } },
      select: { date: true, interets: true, assurance: true, emprunt: { select: { id: true, libelle: true, banque: true, dateDebut: true, lotId: true, immeubleId: true } } },
    }),
    prisma.paiement.findMany({ where: { appel: { bail: { entiteId } } }, select: { date: true }, orderBy: { date: "asc" }, take: 1 }),
    prisma.depense.findMany({ where: { entiteId }, select: { date: true }, orderBy: { date: "asc" }, take: 1 }),
  ]);
  const resultat = construire2044({
    annee,
    lots,
    immeubles,
    paiements: paiements.map((p) => ({ montant: p.montant, appel: { loyer: p.appel.loyer, charges: p.appel.charges, montantTva: p.appel.montantTva, total: p.appel.total }, bail: p.appel.bail })),
    baux,
    depenses,
    echeances,
  });
  const anneeCourante = new Date().getFullYear();
  const premiere = Math.min(anneeCourante - 1, premierPaiement[0]?.date.getUTCFullYear() ?? anneeCourante, premiereDepense[0]?.date.getUTCFullYear() ?? anneeCourante);
  const annees: number[] = [];
  for (let a = anneeCourante; a >= premiere; a--) annees.push(a);
  return { ...resultat, annees };
}
