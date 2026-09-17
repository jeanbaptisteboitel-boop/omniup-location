import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { idDepuis, type ParamsId, type SearchParams } from "@/lib/params";
import { aujourdhui, formatDate } from "@/lib/dates";
import { formatEuros, formatNombre, somme } from "@/lib/montants";
import { totauxParAnnee } from "@/lib/emprunts";
import { genererEcheancierEmprunt, supprimerEcheancier, supprimerEmprunt } from "@/actions/emprunts";
import { Button, ButtonLink, Card, CardBody, CardHeader, Infos, PageHeader, Tableau, Td, Th } from "@/components/ui";
import { ConfirmForm } from "@/components/confirm-form";
import { Flash } from "@/components/flash";

export default async function EmpruntPage({ params, searchParams }: { params: ParamsId; searchParams: SearchParams }) {
  const id = await idDepuis(params);
  const sp = await searchParams;
  const e = await prisma.emprunt.findUnique({ where: { id }, include: { lot: true, immeuble: true, echeances: { orderBy: { date: "asc" } } } });
  if (!e) notFound();
  const annees = Array.from(new Set(e.echeances.map((x) => x.date.getUTCFullYear()))).sort();
  const anneeCourante = aujourdhui().getUTCFullYear();
  const peutGenerer = e.tauxAnnuel !== null && !!e.dureeMois && !!e.dateDebut;

  return (
    <>
      <PageHeader
        titre={e.libelle}
        sousTitre={`${e.banque ?? "Banque non renseignée"}${e.reference ? ` · réf. ${e.reference}` : ""}`}
        retour={{ href: "/emprunts", libelle: "Emprunts" }}
        actions={
          <>
            <ButtonLink href={`/emprunts/${e.id}/import`}>Importer l'échéancier</ButtonLink>
            <ButtonLink href={`/emprunts/${e.id}/modifier`} variante="secondary">Modifier</ButtonLink>
            <ConfirmForm action={supprimerEmprunt} message={`Supprimer l'emprunt « ${e.libelle} » et son échéancier ?`}>
              <input type="hidden" name="id" value={e.id} />
              <Button type="submit" variante="danger">Supprimer</Button>
            </ConfirmForm>
          </>
        }
      />
      <Flash sp={sp} />
      <div className="space-y-6">
        <Card>
          <CardHeader titre="Caractéristiques" />
          <CardBody>
            <Infos
              colonnes={3}
              items={[
                { label: "Bien financé", valeur: e.lot ? <Link href={`/lots/${e.lot.id}`} className="text-navy-800 hover:underline">{e.lot.nom}</Link> : e.immeuble ? <Link href={`/immeubles/${e.immeuble.id}`} className="text-navy-800 hover:underline">{e.immeuble.nom}</Link> : null },
                { label: "Montant emprunté", valeur: formatEuros(e.montantInitial) },
                { label: "Taux annuel", valeur: e.tauxAnnuel !== null ? `${formatNombre(e.tauxAnnuel)} %` : null },
                { label: "Durée", valeur: e.dureeMois ? `${e.dureeMois} mois` : null },
                { label: "Première échéance", valeur: formatDate(e.dateDebut) || null },
                { label: "Assurance mensuelle", valeur: e.assuranceMensuelle !== null ? formatEuros(e.assuranceMensuelle) : null },
                { label: "Notes", valeur: e.notes },
              ]}
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            titre={`Échéancier (${e.echeances.length} échéances)`}
            description="Importez le tableau d'amortissement de la banque pour des intérêts exacts, ou générez un échéancier théorique à partir des caractéristiques."
            actions={
              <>
                <form action={genererEcheancierEmprunt} onSubmit={undefined}>
                  <input type="hidden" name="id" value={e.id} />
                  <Button type="submit" taille="sm" variante="secondary" disabled={!peutGenerer} title={peutGenerer ? undefined : "Renseignez taux, durée et date de première échéance"}>Générer l'échéancier théorique</Button>
                </form>
                {e.echeances.length > 0 && (
                  <ConfirmForm action={supprimerEcheancier} message="Supprimer toutes les échéances de cet emprunt ?">
                    <input type="hidden" name="id" value={e.id} />
                    <Button type="submit" taille="sm" variante="danger">Vider l'échéancier</Button>
                  </ConfirmForm>
                )}
              </>
            }
          />
          {e.echeances.length === 0 ? (
            <CardBody><p className="text-sm text-slate-500">Aucune échéance. {peutGenerer ? "Générez l'échéancier théorique ou importez celui de la banque." : "Complétez le taux, la durée et la date de première échéance pour générer un échéancier théorique, ou importez celui de la banque."}</p></CardBody>
          ) : (
            <>
              <CardBody>
                <p className="mb-2 text-sm font-semibold text-navy-900">Totaux par année</p>
                <Tableau>
                  <thead className="bg-slate-50"><tr><Th>Année</Th><Th droite>Capital remboursé</Th><Th droite>Intérêts</Th><Th droite>Assurance</Th><Th droite>Total payé</Th></tr></thead>
                  <tbody className="divide-y divide-slate-100">
                    {annees.map((a) => {
                      const t = totauxParAnnee(e.echeances, a);
                      return (
                        <tr key={a} className={a === anneeCourante ? "bg-navy-50/50 font-semibold" : ""}>
                          <Td>{a}</Td><Td droite>{formatEuros(t.capital)}</Td><Td droite>{formatEuros(t.interets)}</Td><Td droite>{formatEuros(t.assurance)}</Td><Td droite>{formatEuros(t.total)}</Td>
                        </tr>
                      );
                    })}
                    <tr className="bg-slate-50 font-semibold"><Td>Total</Td><Td droite>{formatEuros(somme(e.echeances.map((x) => x.capital)))}</Td><Td droite>{formatEuros(somme(e.echeances.map((x) => x.interets)))}</Td><Td droite>{formatEuros(somme(e.echeances.map((x) => x.assurance)))}</Td><Td droite>{formatEuros(somme(e.echeances.map((x) => x.total)))}</Td></tr>
                  </tbody>
                </Tableau>
              </CardBody>
              <details className="border-t border-slate-100">
                <summary className="cursor-pointer px-5 py-3 text-sm font-semibold text-navy-900">Voir le détail des échéances</summary>
                <div className="max-h-[32rem] overflow-auto">
                  <Tableau>
                    <thead className="sticky top-0 bg-slate-50"><tr><Th>Date</Th><Th droite>Capital</Th><Th droite>Intérêts</Th><Th droite>Assurance</Th><Th droite>Échéance</Th><Th droite>Capital restant dû</Th></tr></thead>
                    <tbody className="divide-y divide-slate-100">
                      {e.echeances.map((x) => (
                        <tr key={x.id}><Td>{formatDate(x.date)}</Td><Td droite>{formatEuros(x.capital)}</Td><Td droite>{formatEuros(x.interets)}</Td><Td droite>{formatEuros(x.assurance)}</Td><Td droite>{formatEuros(x.total)}</Td><Td droite>{x.capitalRestant !== null ? formatEuros(x.capitalRestant) : "—"}</Td></tr>
                      ))}
                    </tbody>
                  </Tableau>
                </div>
              </details>
            </>
          )}
        </Card>
      </div>
    </>
  );
}
