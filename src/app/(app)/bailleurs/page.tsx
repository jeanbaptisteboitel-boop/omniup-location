import Link from "next/link";
import { prisma } from "@/lib/prisma";
import type { SearchParams } from "@/lib/params";
import { TYPES_PERSONNE, adresseSurUneLigne } from "@/lib/libelles";
import { ButtonLink, Card, EmptyState, PageHeader, Tableau, TableauPied, Td, Th } from "@/components/ui";
import { Flash } from "@/components/flash";
import { entiteCouranteId } from "@/lib/entite";

export const metadata = { title: "Bailleurs" };

const pluriel = (n: number) => (n > 1 ? "s" : "");

export default async function BailleursPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const bailleurs = await prisma.bailleur.findMany({ where: { entiteId: await entiteCouranteId() }, orderBy: { nom: "asc" }, include: { _count: { select: { lots: true, immeubles: true } } } });
  return (
    <>
      <PageHeader titre="Bailleurs" sousTitre="Propriétaires au nom desquels les baux et quittances sont émis." actions={<ButtonLink href="/bailleurs/nouveau">Nouveau bailleur</ButtonLink>} />
      <Flash sp={sp} />
      {bailleurs.length === 0 ? (
        <EmptyState titre="Aucun bailleur" description="Créez le propriétaire des biens : son nom et son adresse figureront sur les avis d'échéance et les quittances." action={<ButtonLink href="/bailleurs/nouveau">Nouveau bailleur</ButtonLink>} />
      ) : (
        <Card>
          <Tableau>
            <thead className="bg-slate-50">
              <tr>
                <Th>Nom</Th>
                <Th>Type</Th>
                <Th>Adresse</Th>
                <Th>Contact</Th>
                <Th droite>Lots</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {bailleurs.map((b) => (
                <tr key={b.id} className="hover:bg-slate-50">
                  <Td>
                    <Link href={`/bailleurs/${b.id}`} className="whitespace-nowrap font-semibold text-navy-900 hover:underline">{b.nom}</Link>
                    {b.representant && <span className="block text-xs text-slate-500">{b.representant}</span>}
                  </Td>
                  <Td className="text-slate-600">{TYPES_PERSONNE[b.typePersonne]}</Td>
                  <Td className="text-slate-600">{adresseSurUneLigne(b)}</Td>
                  <Td className="text-slate-600">
                    {b.email || b.telephone ? (
                      <>
                        {b.email && <span className="block">{b.email}</span>}
                        {b.telephone && <span className="block">{b.telephone}</span>}
                      </>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </Td>
                  <Td droite>{b._count.lots}</Td>
                </tr>
              ))}
            </tbody>
          </Tableau>
          <TableauPied>
            {bailleurs.length} bailleur{pluriel(bailleurs.length)} · page 1 sur 1
          </TableauPied>
        </Card>
      )}
    </>
  );
}
