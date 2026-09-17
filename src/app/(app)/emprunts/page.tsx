import Link from "next/link";
import { prisma } from "@/lib/prisma";
import type { SearchParams } from "@/lib/params";
import { aujourdhui } from "@/lib/dates";
import { formatEuros, somme } from "@/lib/montants";
import { ButtonLink, Card, EmptyState, PageHeader, Tableau, Td, Th } from "@/components/ui";
import { Flash } from "@/components/flash";
import { entiteCouranteId } from "@/lib/entite";

export const metadata = { title: "Emprunts" };

export default async function EmpruntsPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const annee = aujourdhui().getUTCFullYear();
  const emprunts = await prisma.emprunt.findMany({ where: { entiteId: await entiteCouranteId() }, orderBy: { libelle: "asc" }, include: { lot: true, immeuble: true, echeances: { select: { date: true, interets: true, assurance: true } } } });
  return (
    <>
      <PageHeader titre="Emprunts" sousTitre="Prêts immobiliers et leurs échéanciers, pour constater les intérêts et l'assurance emprunteur déductibles." actions={<ButtonLink href="/emprunts/nouveau">Nouvel emprunt</ButtonLink>} />
      <Flash sp={sp} />
      {emprunts.length === 0 ? (
        <EmptyState titre="Aucun emprunt" description="Créez un emprunt puis importez le tableau d'amortissement de la banque (CSV, Excel, PDF) ou générez un échéancier théorique." action={<ButtonLink href="/emprunts/nouveau">Créer un emprunt</ButtonLink>} />
      ) : (
        <Card>
          <Tableau>
            <thead className="bg-slate-50"><tr><Th>Libellé</Th><Th>Banque</Th><Th>Bien financé</Th><Th droite>Montant initial</Th><Th droite>Échéances</Th><Th droite>Intérêts {annee}</Th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {emprunts.map((e) => {
                const deLAnnee = e.echeances.filter((x) => x.date.getUTCFullYear() === annee);
                return (
                  <tr key={e.id} className="hover:bg-slate-50">
                    <Td><Link href={`/emprunts/${e.id}`} className="font-medium text-navy-800 hover:underline">{e.libelle}</Link>{e.reference && <span className="block text-xs text-slate-500">{e.reference}</span>}</Td>
                    <Td>{e.banque ?? "—"}</Td>
                    <Td>{e.lot ? <Link href={`/lots/${e.lot.id}`} className="hover:underline">{e.lot.nom}</Link> : e.immeuble ? <Link href={`/immeubles/${e.immeuble.id}`} className="hover:underline">{e.immeuble.nom}</Link> : "—"}</Td>
                    <Td droite>{formatEuros(e.montantInitial)}</Td>
                    <Td droite>{e.echeances.length || <span className="text-amber-700">à importer</span>}</Td>
                    <Td droite>{deLAnnee.length ? formatEuros(somme(deLAnnee.map((x) => x.interets))) : "—"}</Td>
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
