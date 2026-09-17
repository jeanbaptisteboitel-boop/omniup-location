import Link from "next/link";
import type { CategorieDepense } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { entierParam, texteParam, type SearchParams } from "@/lib/params";
import { CATEGORIES_DEPENSE, options } from "@/lib/libelles";
import { aujourdhui, formatDate, jourUTC } from "@/lib/dates";
import { formatEuros, somme } from "@/lib/montants";
import { supprimerDepense } from "@/actions/depenses";
import { Badge, Button, ButtonLink, Card, CardBody, EmptyState, PageHeader, Tableau, Td, Th } from "@/components/ui";
import { ConfirmForm } from "@/components/confirm-form";
import { Flash } from "@/components/flash";
import { entiteCouranteId } from "@/lib/entite";

export const metadata = { title: "Dépenses" };

export default async function DepensesPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const anneeCourante = aujourdhui().getUTCFullYear();
  const annee = entierParam(sp, "annee") ?? anneeCourante;
  const categorie = texteParam(sp, "categorie") as CategorieDepense | null;
  const lotId = entierParam(sp, "lotId");
  const immeubleId = entierParam(sp, "immeubleId");

  const entiteId = await entiteCouranteId();
  const depenses = await prisma.depense.findMany({
    where: {
      entiteId,
      date: { gte: jourUTC(annee, 1, 1), lt: jourUTC(annee + 1, 1, 1) },
      ...(categorie && categorie in CATEGORIES_DEPENSE ? { categorie } : {}),
      ...(lotId ? { lotId } : {}),
      ...(immeubleId ? { immeubleId } : {}),
    },
    include: { lot: true, immeuble: true },
    orderBy: [{ date: "desc" }, { id: "desc" }],
  });
  const annees = await prisma.depense.findMany({ where: { entiteId }, select: { date: true }, distinct: ["date"] });
  const listeAnnees = Array.from(new Set([anneeCourante, ...annees.map((d) => d.date.getUTCFullYear())])).sort((a, b) => b - a);
  const total = somme(depenses.map((d) => d.montant));
  const parCategorie = (Object.keys(CATEGORIES_DEPENSE) as CategorieDepense[]).map((c) => ({ c, total: somme(depenses.filter((d) => d.categorie === c).map((d) => d.montant)) })).filter((x) => x.total > 0);

  return (
    <>
      <PageHeader titre="Dépenses" sousTitre="Réparations, entretien, gestion, copropriété, assurance PNO, taxe foncière… affectées bien par bien." actions={<ButtonLink href="/depenses/nouveau">Nouvelle dépense</ButtonLink>} />
      <Flash sp={sp} />

      <form method="get" className="mb-4 flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4 text-sm">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-500">Année</span>
          <select name="annee" defaultValue={annee} className="rounded-md border border-slate-300 px-3 py-2 text-sm">
            {listeAnnees.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-500">Catégorie</span>
          <select name="categorie" defaultValue={categorie ?? ""} className="rounded-md border border-slate-300 px-3 py-2 text-sm">
            <option value="">Toutes</option>
            {options(CATEGORIES_DEPENSE).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </label>
        {lotId && <input type="hidden" name="lotId" value={lotId} />}
        {immeubleId && <input type="hidden" name="immeubleId" value={immeubleId} />}
        <Button type="submit" variante="secondary">Filtrer</Button>
        {(lotId || immeubleId) && <Link href={`/depenses?annee=${annee}`} className="text-xs text-slate-500 underline">Tous les biens</Link>}
        <Link href={`/api/export/depenses.csv?annee=${annee}`} className="ml-auto text-xs text-navy-800 underline">Exporter l'année en CSV</Link>
      </form>

      {depenses.length === 0 ? (
        <EmptyState titre={`Aucune dépense en ${annee}`} description="Enregistrez les factures de travaux, charges de copropriété, assurance propriétaire non occupant, taxe foncière… avec leur justificatif." action={<ButtonLink href="/depenses/nouveau">Ajouter une dépense</ButtonLink>} />
      ) : (
        <div className="space-y-4">
          <Card>
            <CardBody className="flex flex-wrap gap-x-8 gap-y-2 text-sm">
              <span><span className="text-slate-500">Total {annee} :</span> <strong>{formatEuros(total)}</strong></span>
              {parCategorie.map((x) => (
                <span key={x.c}><span className="text-slate-500">{CATEGORIES_DEPENSE[x.c]} :</span> {formatEuros(x.total)}</span>
              ))}
            </CardBody>
          </Card>
          <Card>
            <Tableau>
              <thead className="bg-slate-50"><tr><Th>Date</Th><Th>Libellé</Th><Th>Catégorie</Th><Th>Bien</Th><Th>Fournisseur</Th><Th droite>Montant</Th><Th /></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {depenses.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50">
                    <Td>{formatDate(d.date)}</Td>
                    <Td>
                      <Link href={`/depenses/${d.id}/modifier`} className="font-medium text-navy-800 hover:underline">{d.libelle}</Link>
                      {d.justificatifChemin && <a href={`/api/depenses/${d.id}/justificatif`} target="_blank" rel="noopener" className="ml-2 text-xs text-slate-500 underline">justificatif</a>}
                    </Td>
                    <Td><Badge ton="bleu">{CATEGORIES_DEPENSE[d.categorie]}</Badge></Td>
                    <Td>{d.lot ? <Link href={`/lots/${d.lot.id}`} className="hover:underline">{d.lot.nom}</Link> : d.immeuble ? <Link href={`/immeubles/${d.immeuble.id}`} className="hover:underline">{d.immeuble.nom} <span className="text-xs text-slate-500">(immeuble)</span></Link> : "—"}</Td>
                    <Td>{d.fournisseur ?? "—"}</Td>
                    <Td droite>{formatEuros(d.montant)}</Td>
                    <Td droite>
                      <div className="flex justify-end gap-2">
                        <ButtonLink href={`/depenses/${d.id}/modifier`} taille="sm" variante="secondary">Modifier</ButtonLink>
                        <ConfirmForm action={supprimerDepense} message={`Supprimer la dépense « ${d.libelle} » ?`}>
                          <input type="hidden" name="id" value={d.id} />
                          <Button type="submit" taille="sm" variante="danger">Supprimer</Button>
                        </ConfirmForm>
                      </div>
                    </Td>
                  </tr>
                ))}
                <tr className="bg-slate-50 font-semibold"><Td /><Td>Total</Td><Td /><Td /><Td /><Td droite>{formatEuros(total)}</Td><Td /></tr>
              </tbody>
            </Tableau>
          </Card>
        </div>
      )}
    </>
  );
}
