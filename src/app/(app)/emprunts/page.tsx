import Link from "next/link";
import { prisma } from "@/lib/prisma";
import type { SearchParams } from "@/lib/params";
import { aujourdhui } from "@/lib/dates";
import { formatEuros, formatNombre, somme } from "@/lib/montants";
import { Badge, ButtonLink, Card, EmptyState, PageHeader, Tableau, TableauPied, Td, Th } from "@/components/ui";
import { Flash } from "@/components/flash";
import { mensualiteDe } from "@/components/emprunts/calculs";
import { entiteCouranteId } from "@/lib/entite";

export const metadata = { title: "Emprunts" };

export default async function EmpruntsPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const auj = aujourdhui();
  const annee = auj.getUTCFullYear();
  const emprunts = await prisma.emprunt.findMany({ where: { entiteId: await entiteCouranteId() }, orderBy: { libelle: "asc" }, include: { lot: true, immeuble: true, echeances: { orderBy: { date: "asc" }, select: { date: true, interets: true, assurance: true, total: true } } } });
  const pluriel = emprunts.length > 1 ? "s" : "";
  return (
    <>
      <PageHeader titre="Emprunts" sousTitre="Les intérêts et l'assurance sont déductibles des revenus fonciers." actions={<ButtonLink href="/emprunts/nouveau">Nouvel emprunt</ButtonLink>} />
      <Flash sp={sp} />
      {emprunts.length === 0 ? (
        <EmptyState titre="Aucun emprunt" description="Créez un emprunt puis importez le tableau d'amortissement de la banque (CSV, Excel, PDF ou photo) ou générez un échéancier théorique." action={<ButtonLink href="/emprunts/nouveau">Nouvel emprunt</ButtonLink>} />
      ) : (
        <Card>
          <Tableau>
            <thead className="bg-slate-50">
              <tr>
                <Th>Prêt</Th>
                <Th>Immeuble / lot</Th>
                <Th droite>Capital</Th>
                <Th droite>Taux</Th>
                <Th droite>Mensualité</Th>
                <Th droite>Intérêts {annee}</Th>
                <Th>Échéancier</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {emprunts.map((e) => {
                const deLAnnee = e.echeances.filter((x) => x.date.getUTCFullYear() === annee);
                const mensualite = mensualiteDe(e, auj);
                return (
                  <tr key={e.id} className="hover:bg-slate-50">
                    <Td>
                      <Link href={`/emprunts/${e.id}`} className="font-semibold text-navy-900 hover:underline">{e.libelle}</Link>
                      <span className="block text-xs text-slate-500">{e.banque ?? "Banque non renseignée"}{e.reference ? ` · ${e.reference}` : ""}</span>
                    </Td>
                    <Td className="text-slate-600">{e.lot ? <Link href={`/lots/${e.lot.id}`} className="hover:underline">{e.lot.nom}</Link> : e.immeuble ? <Link href={`/immeubles/${e.immeuble.id}`} className="hover:underline">{e.immeuble.nom}</Link> : "—"}</Td>
                    <Td droite>{formatEuros(e.montantInitial)}</Td>
                    <Td droite>{e.tauxAnnuel !== null ? `${formatNombre(e.tauxAnnuel)} %` : "—"}</Td>
                    <Td droite>{mensualite !== null ? formatEuros(mensualite) : "—"}</Td>
                    <Td droite className="font-semibold">{deLAnnee.length ? formatEuros(somme(deLAnnee.map((x) => x.interets))) : "—"}</Td>
                    <Td>{e.echeances.length ? <Badge ton="vert">{e.echeances.length} échéances importées</Badge> : <Badge ton="orange">À importer</Badge>}</Td>
                  </tr>
                );
              })}
            </tbody>
          </Tableau>
          <TableauPied>{emprunts.length} emprunt{pluriel} · page 1 sur 1</TableauPied>
        </Card>
      )}
    </>
  );
}
