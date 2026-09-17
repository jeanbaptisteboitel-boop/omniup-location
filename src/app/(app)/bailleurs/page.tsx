import Link from "next/link";
import { prisma } from "@/lib/prisma";
import type { SearchParams } from "@/lib/params";
import { TYPES_PERSONNE, adresseSurUneLigne } from "@/lib/libelles";
import { ButtonLink, Card, EmptyState, PageHeader, Tableau, Td, Th } from "@/components/ui";
import { Flash } from "@/components/flash";
import { entiteCouranteId } from "@/lib/entite";

export const metadata = { title: "Bailleurs" };

export default async function BailleursPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const bailleurs = await prisma.bailleur.findMany({ where: { entiteId: await entiteCouranteId() }, orderBy: { nom: "asc" }, include: { _count: { select: { lots: true, immeubles: true } } } });
  return (
    <>
      <PageHeader titre="Bailleurs" sousTitre="Propriétaires (personnes physiques ou sociétés) au nom desquels les loyers sont appelés." actions={<ButtonLink href="/bailleurs/nouveau">Nouveau bailleur</ButtonLink>} />
      <Flash sp={sp} />
      {bailleurs.length === 0 ? (
        <EmptyState titre="Aucun bailleur" description="Créez le propriétaire des biens : son nom et son adresse figureront sur les avis d'échéance et les quittances." action={<ButtonLink href="/bailleurs/nouveau">Créer un bailleur</ButtonLink>} />
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
                    <Link href={`/bailleurs/${b.id}`} className="font-medium text-navy-800 hover:underline">{b.nom}</Link>
                    {b.representant && <span className="block text-xs text-slate-500">{b.representant}</span>}
                  </Td>
                  <Td>{TYPES_PERSONNE[b.typePersonne]}</Td>
                  <Td>{adresseSurUneLigne(b)}</Td>
                  <Td>
                    {b.email && <span className="block">{b.email}</span>}
                    {b.telephone && <span className="block text-slate-500">{b.telephone}</span>}
                  </Td>
                  <Td droite>{b._count.lots}</Td>
                </tr>
              ))}
            </tbody>
          </Tableau>
        </Card>
      )}
    </>
  );
}
