import Link from "next/link";
import { prisma } from "@/lib/prisma";
import type { SearchParams } from "@/lib/params";
import { TYPES_LOT, nomComplet } from "@/lib/libelles";
import { formatEuros } from "@/lib/montants";
import { Badge, ButtonLink, Card, EmptyState, PageHeader, Tableau, Td, Th } from "@/components/ui";
import { Flash } from "@/components/flash";
import { entiteCouranteId } from "@/lib/entite";

export const metadata = { title: "Lots" };

export default async function LotsPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const lots = await prisma.lot.findMany({
    where: { entiteId: await entiteCouranteId() },
    orderBy: [{ ville: "asc" }, { nom: "asc" }],
    include: { bailleur: true, immeuble: true, baux: { where: { statut: "SIGNE" }, include: { locataire: true }, orderBy: { dateDebut: "desc" }, take: 1 } },
  });
  return (
    <>
      <PageHeader titre="Lots" sousTitre="Appartements et maisons mis en location." actions={<ButtonLink href="/lots/nouveau">Nouveau lot</ButtonLink>} />
      <Flash sp={sp} />
      {lots.length === 0 ? (
        <EmptyState titre="Aucun lot" description="Créez vos lots d'appartements et de maisons : chaque lot pourra ensuite recevoir un bail." action={<ButtonLink href="/lots/nouveau">Créer un lot</ButtonLink>} />
      ) : (
        <Card>
          <Tableau>
            <thead className="bg-slate-50">
              <tr><Th>Désignation</Th><Th>Type</Th><Th>Adresse</Th><Th>Bailleur</Th><Th>Occupation</Th><Th droite>Loyer</Th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {lots.map((l) => {
                const bail = l.baux[0];
                return (
                  <tr key={l.id} className="hover:bg-slate-50">
                    <Td>
                      <Link href={`/lots/${l.id}`} className="font-medium text-navy-800 hover:underline">{l.nom}</Link>
                      {l.immeuble && <span className="block text-xs text-slate-500">{l.immeuble.nom}</span>}
                    </Td>
                    <Td>{TYPES_LOT[l.type]}{l.meuble && <span className="block text-xs text-slate-500">Meublé</span>}</Td>
                    <Td>{l.adresse}<span className="block text-slate-500">{l.codePostal} {l.ville}</span></Td>
                    <Td>{l.bailleur?.nom ?? <span className="text-slate-400">—</span>}</Td>
                    <Td>{bail ? <Badge ton="vert">{nomComplet(bail.locataire)}</Badge> : <Badge ton="gris">Vacant</Badge>}</Td>
                    <Td droite>{bail ? formatEuros(bail.loyerHC) : l.loyerIndicatif ? <span className="text-slate-500">{formatEuros(l.loyerIndicatif)}</span> : "—"}</Td>
                  </tr>
                );
              })}
            </tbody>
          </Tableau>
        </Card>
      )}
    </>
  );
}
