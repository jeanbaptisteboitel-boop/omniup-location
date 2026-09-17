import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { formatDate, jourUTC } from "@/lib/dates";
import { CATEGORIES_DEPENSE } from "@/lib/libelles";
import { reponseCSV, versCSV } from "@/lib/csv";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const annee = Number(req.nextUrl.searchParams.get("annee")) || new Date().getFullYear();
  const depenses = await prisma.depense.findMany({ where: { date: { gte: jourUTC(annee, 1, 1), lt: jourUTC(annee + 1, 1, 1) } }, include: { lot: true, immeuble: true }, orderBy: { date: "asc" } });
  const csv = versCSV(
    ["Date", "Libellé", "Catégorie", "Bien", "Type de bien", "Fournisseur", "Montant TTC", "Justificatif", "Notes"],
    depenses.map((d) => [formatDate(d.date), d.libelle, CATEGORIES_DEPENSE[d.categorie], d.lot?.nom ?? d.immeuble?.nom ?? "", d.lot ? "Lot" : "Immeuble", d.fournisseur, d.montant, d.justificatifNom ? "oui" : "non", d.notes]),
  );
  return reponseCSV(csv, `depenses-${annee}.csv`);
}
