import Link from "next/link";
import type { StatutBail } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { texteParam, type SearchParams } from "@/lib/params";
import { STATUTS_BAIL, TYPES_BAIL_COURT, nomComplet } from "@/lib/libelles";
import { formatDate } from "@/lib/dates";
import { formatEuros } from "@/lib/montants";
import { ButtonLink, Card, EmptyState, PageHeader, Tableau, Td, Th } from "@/components/ui";
import { Flash } from "@/components/flash";
import { BadgeStatutBail } from "@/components/baux/badge-statut";
import { entiteCouranteId } from "@/lib/entite";

export const metadata = { title: "Baux" };

const STATUTS: StatutBail[] = ["BROUILLON", "EN_SIGNATURE", "SIGNE", "TERMINE"];

export default async function BauxPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const filtre = texteParam(sp, "statut") as StatutBail | null;
  const statut = filtre && STATUTS.includes(filtre) ? filtre : null;
  const entiteId = await entiteCouranteId();
  const [baux, compteurs] = await Promise.all([
    prisma.bail.findMany({ where: { entiteId, ...(statut ? { statut } : {}) }, orderBy: [{ statut: "asc" }, { dateDebut: "desc" }], include: { lot: true, locataire: true } }),
    prisma.bail.groupBy({ by: ["statut"], where: { entiteId }, _count: { _all: true } }),
  ]);
  const nb = (s: StatutBail) => compteurs.find((c) => c.statut === s)?._count._all ?? 0;

  return (
    <>
      <PageHeader titre="Baux" sousTitre="Contrats de location reliant un lot et un locataire." actions={<ButtonLink href="/baux/nouveau">Nouveau bail</ButtonLink>} />
      <Flash sp={sp} />
      <nav className="mb-4 flex flex-wrap gap-2 text-sm">
        <Link href="/baux" className={`rounded-full px-3 py-1 ${!statut ? "bg-navy-800 text-white" : "bg-white text-navy-800 ring-1 ring-slate-200 hover:bg-slate-50"}`}>Tous ({baux.length && !statut ? baux.length : compteurs.reduce((a, c) => a + c._count._all, 0)})</Link>
        {STATUTS.map((s) => (
          <Link key={s} href={`/baux?statut=${s}`} className={`rounded-full px-3 py-1 ${statut === s ? "bg-navy-800 text-white" : "bg-white text-navy-800 ring-1 ring-slate-200 hover:bg-slate-50"}`}>
            {STATUTS_BAIL[s]} ({nb(s)})
          </Link>
        ))}
      </nav>
      {baux.length === 0 ? (
        <EmptyState titre="Aucun bail" description="Créez un bail pour relier un lot à un locataire : meublé, non meublé ou bail mobilité." action={<ButtonLink href="/baux/nouveau">Créer un bail</ButtonLink>} />
      ) : (
        <Card>
          <Tableau>
            <thead className="bg-slate-50"><tr><Th>Lot</Th><Th>Locataire</Th><Th>Type</Th><Th>Période</Th><Th droite>Loyer + charges</Th><Th>Statut</Th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {baux.map((b) => (
                <tr key={b.id} className="hover:bg-slate-50">
                  <Td><Link href={`/baux/${b.id}`} className="font-medium text-navy-800 hover:underline">{b.lot.nom}</Link><span className="block text-xs text-slate-500">{b.lot.codePostal} {b.lot.ville}</span></Td>
                  <Td><Link href={`/locataires/${b.locataire.id}`} className="hover:underline">{nomComplet(b.locataire)}</Link></Td>
                  <Td>{TYPES_BAIL_COURT[b.type]}</Td>
                  <Td>{formatDate(b.dateDebut)} → {formatDate(b.dateFinEffective ?? b.dateFin)}</Td>
                  <Td droite>{formatEuros(b.loyerHC)}{b.charges > 0 && <span className="block text-xs text-slate-500">+ {formatEuros(b.charges)}</span>}</Td>
                  <Td><BadgeStatutBail statut={b.statut} /></Td>
                </tr>
              ))}
            </tbody>
          </Tableau>
        </Card>
      )}
    </>
  );
}
