import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { formatDate, formatPeriode, jourUTC } from "@/lib/dates";
import { MODES_PAIEMENT } from "@/lib/libelles";
import { arrondir2 } from "@/lib/montants";
import { numeroAppel } from "@/lib/loyers";
import { reponseCSV, versCSV } from "@/lib/csv";
import { includeLocataires, nomsLocataires } from "@/lib/locataires";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const annee = Number(req.nextUrl.searchParams.get("annee")) || new Date().getFullYear();
  const paiements = await prisma.paiement.findMany({
    where: { date: { gte: jourUTC(annee, 1, 1), lt: jourUTC(annee + 1, 1, 1) } },
    include: { appel: { include: { bail: { include: { lot: { include: { bailleur: true } }, locataires: includeLocataires } } } } },
    orderBy: { date: "asc" },
  });
  const csv = versCSV(
    ["Date", "Bien", "Bailleur", "Locataire", "Période", "N° appel", "Mode", "Référence", "Montant", "Part loyer HT", "Part charges HT", "Part TVA", "Taux TVA"],
    paiements.map((p) => {
      const partLoyer = p.appel.total > 0 ? arrondir2(p.montant * (p.appel.loyer / p.appel.total)) : p.montant;
      const partTva = p.appel.total > 0 ? arrondir2(p.montant * (p.appel.montantTva / p.appel.total)) : 0;
      return [formatDate(p.date), p.appel.bail.lot.nom, p.appel.bail.lot.bailleur?.nom ?? "", nomsLocataires(p.appel.bail.locataires), formatPeriode(p.appel.periode), numeroAppel(p.appel.id), MODES_PAIEMENT[p.mode], p.reference, p.montant, partLoyer, arrondir2(p.montant - partLoyer - partTva), partTva, p.appel.tauxTva];
    }),
  );
  return reponseCSV(csv, `encaissements-${annee}.csv`);
}
