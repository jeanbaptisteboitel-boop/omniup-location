import Link from "next/link";
import type { SearchParams } from "@/lib/params";
import { formatDateHeure } from "@/lib/dates";
import { LIBELLES_FREQUENCE, journalSynchronisations, listerSeries } from "@/lib/insee/lecture";
import { libellePeriode } from "@/lib/insee/periodes";
import { formatIndice, formatVariation } from "@/lib/insee/utils";
import { ajouterSerie, synchroniserMaintenant, verifierIdbanksAction } from "@/actions/indices";
import { Alerte, Badge, Button, Card, CardBody, CardHeader, PageHeader, Tableau, TableauPied, Td, Th } from "@/components/ui";
import { Flash } from "@/components/flash";
import { SerieForm } from "@/components/indices/serie-form";

export const metadata = { title: "Indices INSEE" };
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const DECLENCHEURS: Record<string, string> = { cron: "Cron quotidien", manuel: "Lancement manuel", "premiere-utilisation": "Première utilisation" };

export default async function IndicesPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const [series, journal] = await Promise.all([listerSeries(), journalSynchronisations(8)]);
  const actives = series.filter((s) => s.active);
  const derniere = journal[0] ?? null;
  const pluriel = (n: number, un: string, plusieurs: string) => `${n} ${n > 1 ? plusieurs : un}`;
  return (
    <>
      <PageHeader
        titre="Indices INSEE"
        sousTitre={`${pluriel(actives.length, "série suivie", "séries suivies")} · valeurs officielles du service de données de l'INSEE, synchronisées chaque jour à 9 h 30${derniere?.fin ? ` · dernière synchronisation le ${formatDateHeure(derniere.fin)}` : " · aucune synchronisation pour l'instant"}`}
        actions={
          <>
            <form action={verifierIdbanksAction}>
              <Button type="submit" variante="secondary">Vérifier les idbanks</Button>
            </form>
            <form action={synchroniserMaintenant}>
              <Button type="submit">Synchroniser maintenant</Button>
            </form>
          </>
        }
      />
      <Flash sp={sp} />
      {derniere?.erreurs && (
        <Alerte ton="rouge" titre="Dernière synchronisation en erreur" className="mb-6">
          <span className="whitespace-pre-line">{derniere.erreurs}</span>
        </Alerte>
      )}
      {derniere?.alertes && (
        <Alerte ton="orange" titre="Alertes" className="mb-6">
          <span className="whitespace-pre-line">{derniere.alertes}</span>
        </Alerte>
      )}
      <Card>
        <Tableau>
          <thead className="bg-slate-50">
            <tr>
              <Th>Indice</Th>
              <Th>Série INSEE</Th>
              <Th>Dernière période</Th>
              <Th droite>Valeur</Th>
              <Th>Statut</Th>
              <Th droite>Sur un an</Th>
              <Th>Synchronisée</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {series.map((s) => (
              <tr key={s.id} className={s.active ? "hover:bg-slate-50" : "bg-slate-50/60 text-slate-500"}>
                <Td className="min-w-[220px]">
                  <Link href={`/indices/${s.code}`} className="font-semibold text-navy-900 hover:underline">{s.code}</Link>
                  <span className="block text-xs text-slate-500">{s.libelle} · {LIBELLES_FREQUENCE[s.frequence]}</span>
                </Td>
                <Td>
                  <span className="font-mono text-xs text-navy-900">{s.idbank}</span>
                  {!s.active && <Badge ton="gris" className="ml-2">Inactive</Badge>}
                  {s.libelleInsee ? <span className="block max-w-[240px] truncate text-xs text-slate-500" title={s.libelleInsee}>{s.libelleInsee}</span> : <span className="block max-w-[240px] text-xs text-amber-700">Libellé INSEE non encore reçu : vérifiez l'idbank.</span>}
                </Td>
                <Td className="whitespace-nowrap">{s.derniere ? libellePeriode(s.derniere.periode) : "—"}</Td>
                <Td droite className="whitespace-nowrap font-mono text-sm font-semibold tabular-nums text-navy-900">{s.derniere ? formatIndice(s.derniere.valeur) : "—"}</Td>
                <Td>{s.derniere ? s.derniere.statut === "P" ? <Badge ton="orange">Provisoire</Badge> : <Badge ton="vert">Définitif</Badge> : <Badge ton="gris">Aucune valeur</Badge>}</Td>
                <Td droite className="whitespace-nowrap tabular-nums">{formatVariation(s.variationUnAn)}</Td>
                <Td className="whitespace-nowrap text-xs text-slate-500">
                  {s.derniereSync ? formatDateHeure(s.derniereSync) : "jamais"}
                  {s.echecsConsecutifs > 0 && <span className="block text-amber-700">{pluriel(s.echecsConsecutifs, "échec", "échecs")} : {s.dernierEchec}</span>}
                </Td>
              </tr>
            ))}
          </tbody>
        </Tableau>
        <TableauPied pagination={false}>Une valeur provisoire (P) peut encore être révisée par l'INSEE : signalez-le si vous l'utilisez dans une révision de loyer. Les valeurs sont conservées en numérique exact et l'historique remonte à 2000.</TableauPied>
      </Card>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-start">
        <Card>
          <CardHeader titre="Ajouter une série" description="L'idbank est vérifié par un appel réel à l'INSEE avant enregistrement. Un code déjà suivi est remplacé (rebasage) : l'ancienne série reste consultable, inactive, avec son historique." />
          <CardBody>
            <SerieForm action={ajouterSerie} />
          </CardBody>
        </Card>
        <Card>
          <CardHeader titre="Journal des synchronisations" description="Cron quotidien (/api/cron/indices), lancements manuels et premières utilisations." />
          {journal.length === 0 ? (
            <CardBody>
              <p className="text-sm text-slate-500">Aucune exécution pour l'instant : cliquez sur « Synchroniser maintenant » pour charger l'historique depuis 2000.</p>
            </CardBody>
          ) : (
            <ul className="divide-y divide-slate-100">
              {journal.map((j) => (
                <li key={j.id} className="px-5 py-3 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-semibold text-navy-900">{formatDateHeure(j.debut)}</span>
                    <Badge ton={j.erreurs ? "rouge" : j.alertes ? "orange" : j.fin ? "vert" : "gris"}>{j.erreurs ? "Erreurs" : j.alertes ? "Alertes" : j.fin ? "Réussie" : "En cours"}</Badge>
                  </div>
                  <div className="mt-0.5 text-xs text-slate-500">
                    {DECLENCHEURS[j.declencheur] ?? j.declencheur} · {pluriel(j.seriesInterrogees, "série", "séries")} · {pluriel(j.observationsCreees, "valeur ajoutée", "valeurs ajoutées")} · {pluriel(j.observationsMisesAJour, "révisée", "révisées")}
                  </div>
                  {j.erreurs && <div className="mt-1 whitespace-pre-line text-xs text-red-700">{j.erreurs}</div>}
                  {j.alertes && <div className="mt-1 whitespace-pre-line text-xs text-amber-700">{j.alertes}</div>}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
