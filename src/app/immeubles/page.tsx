import Link from "next/link";
import { prisma } from "@/lib/prisma";
import type { SearchParams } from "@/lib/params";
import { adresseSurUneLigne } from "@/lib/libelles";
import { ButtonLink, Card, EmptyState, PageHeader, Tableau, Td, Th } from "@/components/ui";
import { Flash } from "@/components/flash";

export const metadata = { title: "Immeubles" };

export default async function ImmeublesPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const immeubles = await prisma.immeuble.findMany({ orderBy: { nom: "asc" }, include: { bailleur: true, _count: { select: { lots: true, depenses: true } } } });
  return (
    <>
      <PageHeader
        titre="Immeubles"
        sousTitre="Regroupement facultatif de plusieurs lots (copropriété, immeuble entier). Les dépenses communes (toiture, taxe foncière globale…) peuvent y être affectées."
        actions={<ButtonLink href="/immeubles/nouveau">Nouvel immeuble</ButtonLink>}
      />
      <Flash sp={sp} />
      {immeubles.length === 0 ? (
        <EmptyState titre="Aucun immeuble" description="Un immeuble n'est nécessaire que si vous gérez plusieurs lots dans un même bâtiment. Les maisons et appartements isolés se créent directement dans « Lots »." action={<ButtonLink href="/immeubles/nouveau">Créer un immeuble</ButtonLink>} />
      ) : (
        <Card>
          <Tableau>
            <thead className="bg-slate-50"><tr><Th>Nom</Th><Th>Adresse</Th><Th>Bailleur</Th><Th droite>Lots</Th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {immeubles.map((i) => (
                <tr key={i.id} className="hover:bg-slate-50">
                  <Td><Link href={`/immeubles/${i.id}`} className="font-medium text-navy-800 hover:underline">{i.nom}</Link></Td>
                  <Td>{adresseSurUneLigne(i)}</Td>
                  <Td>{i.bailleur ? <Link href={`/bailleurs/${i.bailleur.id}`} className="hover:underline">{i.bailleur.nom}</Link> : <span className="text-slate-400">—</span>}</Td>
                  <Td droite>{i._count.lots}</Td>
                </tr>
              ))}
            </tbody>
          </Tableau>
        </Card>
      )}
    </>
  );
}
