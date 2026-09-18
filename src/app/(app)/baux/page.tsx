import Link from "next/link";
import type { StatutBail } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { texteParam, type SearchParams } from "@/lib/params";
import { TYPES_BAIL_COURT, nomComplet } from "@/lib/libelles";
import { formatDate } from "@/lib/dates";
import { formatEuros } from "@/lib/montants";
import { ButtonLink, Card, Filtres, PageHeader, Segments, Tableau, TableauPied, Td, Th } from "@/components/ui";
import { Flash } from "@/components/flash";
import { BadgeStatutBail, STATUTS_BAIL_COURT } from "@/components/baux/badge-statut";
import { entiteCouranteId } from "@/lib/entite";

export const metadata = { title: "Baux" };

const STATUTS: StatutBail[] = ["SIGNE", "EN_SIGNATURE", "BROUILLON", "TERMINE"];

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
  const total = compteurs.reduce((a, c) => a + c._count._all, 0);
  const pluriel = (n: number, un: string, plusieurs: string) => `${n} ${n > 1 ? plusieurs : un}`;
  const resume = `${pluriel(nb("SIGNE"), "bail signé", "baux signés")} · ${nb("EN_SIGNATURE")} en signature · ${pluriel(nb("BROUILLON"), "brouillon", "brouillons")}`;

  return (
    <>
      <PageHeader titre="Baux" sousTitre={resume} actions={<ButtonLink href="/baux/nouveau">Nouveau bail</ButtonLink>} />
      <Flash sp={sp} />
      <Filtres>
        <Segments items={[{ href: "/baux", libelle: "Tous", actif: !statut }, ...STATUTS.map((s) => ({ href: `/baux?statut=${s}`, libelle: STATUTS_BAIL_COURT[s], actif: statut === s }))]} />
      </Filtres>
      <Card>
        <Tableau>
          <thead className="bg-slate-50">
            <tr><Th>Lot</Th><Th>Locataire</Th><Th>Type</Th><Th>Début</Th><Th>Fin</Th><Th droite>Loyer CC</Th><Th>Statut</Th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {baux.map((b) => (
              <tr key={b.id} className="hover:bg-slate-50">
                <Td className="whitespace-nowrap"><Link href={`/baux/${b.id}`} className="font-semibold text-navy-900 hover:underline">{b.lot.nom}</Link></Td>
                <Td className="whitespace-nowrap text-slate-600"><Link href={`/locataires/${b.locataire.id}`} className="hover:underline">{nomComplet(b.locataire)}</Link></Td>
                <Td className="whitespace-nowrap text-slate-600">{TYPES_BAIL_COURT[b.type]}</Td>
                <Td className="whitespace-nowrap text-slate-600 tabular-nums">{formatDate(b.dateDebut)}</Td>
                <Td className="whitespace-nowrap text-slate-600 tabular-nums">{formatDate(b.dateFinEffective ?? b.dateFin)}</Td>
                <Td droite className="whitespace-nowrap font-semibold">{formatEuros(b.loyerHC + b.charges)}</Td>
                <Td><BadgeStatutBail statut={b.statut} /></Td>
              </tr>
            ))}
          </tbody>
        </Tableau>
        {baux.length === 0 && (
          <div className="px-6 py-10 text-center">
            <p className="text-base font-bold text-navy-900">{total === 0 ? "Aucun bail" : "Aucun bail dans cette catégorie"}</p>
            <p className="mx-auto mt-1.5 max-w-[420px] text-sm text-slate-500">{total === 0 ? "Créez un bail pour relier un lot à un locataire : meublé, non meublé ou bail mobilité." : "Créez un bail depuis un lot vacant et un locataire candidat."}</p>
            {total === 0 && <div className="mt-4"><ButtonLink href="/baux/nouveau">Nouveau bail</ButtonLink></div>}
          </div>
        )}
        <TableauPied>{pluriel(baux.length, "bail", "baux")} · page 1 sur 1</TableauPied>
      </Card>
    </>
  );
}
