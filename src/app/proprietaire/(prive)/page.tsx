import Link from "next/link";
import type { SearchParams } from "@/lib/params";
import { exigerBailleur, lotsDuBailleur, resumerPatrimoine } from "@/lib/proprietaire";
import { adresseSurUneLigne } from "@/lib/libelles";
import { nomsLocataires } from "@/lib/locataires";
import { aujourdhui, formatDate } from "@/lib/dates";
import { formatEuros } from "@/lib/montants";
import { Badge, ButtonLink, Card, CardHeader, EmptyState, PageHeader, Stat, Tableau, TableauPied, Td, Th } from "@/components/ui";
import { Flash } from "@/components/flash";
import { montantsMensuels } from "@/lib/tva";

export const metadata = { title: "Espace propriétaire" };
export const dynamic = "force-dynamic";

const pluriel = (n: number, un: string, plusieurs: string) => `${n} ${n > 1 ? plusieurs : un}`;

export default async function ProprietaireAccueil({ searchParams }: { searchParams: SearchParams }) {
  const b = await exigerBailleur();
  const sp = await searchParams;
  const auj = aujourdhui();
  const annee = auj.getUTCFullYear();
  const lots = await lotsDuBailleur(b.id);
  const r = resumerPatrimoine(lots, annee, auj);
  const detailResteDu = r.resteDu > 0 ? (r.enRetard > 0 ? `dont ${formatEuros(r.enRetard)} en retard` : "échéances à venir, aucun retard") : "tous les loyers appelés sont réglés";
  return (
    <>
      <PageHeader
        titre="Vos biens"
        sousTitre={`${b.nom} · ${pluriel(lots.length, "lot", "lots")} · situation au ${formatDate(auj)}`}
        actions={<ButtonLink href="/proprietaire/synthese" variante="secondary">Synthèse {annee}</ButtonLink>}
      />
      <Flash sp={sp} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Stat libelle={`Loyers encaissés en ${annee}`} valeur={formatEuros(r.encaisse)} detail="paiements reçus sur l'année civile, charges comprises" ton="cyan" />
        <Stat libelle="Reste dû" valeur={formatEuros(r.resteDu)} detail={detailResteDu} ton={r.resteDu > 0 ? (r.enRetard > 0 ? "rouge" : "orange") : "vert"} />
        <Stat libelle="Lots" valeur={String(lots.length)} detail={`${pluriel(r.loues, "loué", "loués")} · ${pluriel(r.vacants, "vacant", "vacants")}`} />
      </div>

      {lots.length === 0 ? (
        <EmptyState className="mt-6" titre="Aucun bien" description="Votre gestionnaire n'a pas encore rattaché de lot à votre compte." />
      ) : (
        <Card className="mt-6">
          <CardHeader titre="Vos lots" description="Locataires en place, loyer du bail en cours et reste dû, tous baux confondus." />
          <Tableau>
            <thead className="bg-slate-50">
              <tr>
                <Th>Lot</Th>
                <Th>Adresse</Th>
                <Th>Locataires</Th>
                <Th droite>Loyer charges comprises</Th>
                <Th droite>Reste dû</Th>
                <Th />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {r.lignes.map(({ lot, bail, solde }) => (
                <tr key={lot.id} className="hover:bg-slate-50">
                  <Td>
                    <Link href={`/proprietaire/lots/${lot.id}`} className="font-semibold text-navy-900 hover:underline">{lot.nom}</Link>
                    {lot.immeuble && <span className="block text-xs text-slate-500">{lot.immeuble.nom}</span>}
                  </Td>
                  <Td className="text-slate-600">{adresseSurUneLigne(lot)}</Td>
                  <Td className="text-slate-600">
                    {bail ? (
                      <>
                        {nomsLocataires(bail.locataires)}
                        <span className="block text-xs text-slate-500">depuis le {formatDate(bail.dateDebut)}</span>
                      </>
                    ) : (
                      <Badge ton="orange">Vacant</Badge>
                    )}
                  </Td>
                  <Td droite className="whitespace-nowrap">{bail ? formatEuros(montantsMensuels(bail).ttc) : <span className="text-slate-400">—</span>}</Td>
                  <Td droite className={`whitespace-nowrap font-semibold ${solde.total > 0 ? (solde.enRetard > 0 ? "text-red-700" : "text-amber-700") : "text-emerald-700"}`}>
                    {formatEuros(solde.total)}
                    {solde.enRetard > 0 && <span className="block text-xs font-normal text-red-700">dont {formatEuros(solde.enRetard)} en retard</span>}
                  </Td>
                  <Td className="text-right">
                    <ButtonLink href={`/proprietaire/lots/${lot.id}`} taille="sm" variante="secondary">Détail</ButtonLink>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Tableau>
          <TableauPied pagination={false}>
            {pluriel(lots.length, "lot", "lots")} · {pluriel(r.loues, "loué", "loués")} · {pluriel(r.vacants, "vacant", "vacants")}
          </TableauPied>
        </Card>
      )}
    </>
  );
}
