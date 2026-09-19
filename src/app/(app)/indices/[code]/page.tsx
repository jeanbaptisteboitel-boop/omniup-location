import { notFound } from "next/navigation";
import { texteParam, type SearchParams } from "@/lib/params";
import { formatDate, formatDateHeure } from "@/lib/dates";
import { LIBELLES_FREQUENCE, historiqueSerie, variationDecimal } from "@/lib/insee/lecture";
import { libellePeriode, periodeUnAnAvant } from "@/lib/insee/periodes";
import { formatIndice, formatVariation } from "@/lib/insee/utils";
import { basculerSerie } from "@/actions/indices";
import { Badge, Button, ButtonLink, Card, CardBody, CardHeader, Infos, PageHeader, Stat, Tableau, TableauPied, Td, Th } from "@/components/ui";
import { Flash } from "@/components/flash";
import { GraphiqueIndice } from "@/components/indices/graphique-indice";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return { title: `Indice ${code.toUpperCase()}` };
}

export default async function IndicePage({ params, searchParams }: { params: Promise<{ code: string }>; searchParams: SearchParams }) {
  const { code } = await params;
  const sp = await searchParams;
  const tout = texteParam(sp, "tout") === "1";
  const h = await historiqueSerie(code, tout ? {} : { from: String(new Date().getUTCFullYear() - 10) });
  if (!h) notFound();
  const { serie, observations, revisions } = h;
  const derniere = observations[observations.length - 1] ?? null;
  const reference = derniere ? observations.find((o) => o.periode === periodeUnAnAvant(derniere.periode)) : null;
  const variation = derniere && reference ? variationDecimal(derniere.valeur, reference.valeur) : null;
  const pluriel = (n: number, un: string, plusieurs: string) => `${n} ${n > 1 ? plusieurs : un}`;
  return (
    <>
      <PageHeader
        titre={`${serie.code} · ${serie.libelle}`}
        badge={serie.active ? <Badge ton="vert">Active</Badge> : <Badge ton="gris">Inactive</Badge>}
        sousTitre={`Série INSEE ${serie.idbank}${serie.libelleInsee ? ` · « ${serie.libelleInsee} »` : ""} · ${LIBELLES_FREQUENCE[serie.frequence]}${serie.base ? ` · ${serie.base}` : ""}`}
        retour={{ href: "/indices", libelle: "Indices INSEE" }}
        actions={
          <form action={basculerSerie}>
            <input type="hidden" name="id" value={serie.id} />
            <Button type="submit" variante="secondary">{serie.active ? "Désactiver la série" : "Réactiver la série"}</Button>
          </form>
        }
      />
      <Flash sp={sp} />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat libelle="Dernière valeur" valeur={derniere ? formatIndice(derniere.valeur) : "—"} detail={derniere ? libellePeriode(derniere.periode) : "aucune valeur"} ton="bleu" />
        <Stat libelle="Variation sur un an" valeur={formatVariation(variation)} detail={reference ? `par rapport à ${libellePeriode(reference.periode)}` : "référence inconnue"} ton={variation && Number(variation) > 0 ? "orange" : "vert"} />
        <Stat libelle="Statut" valeur={derniere ? (derniere.statut === "P" ? "Provisoire" : "Définitif") : "—"} detail={derniere ? `récupérée le ${formatDate(derniere.recupereLe)}` : ""} ton={derniere?.statut === "P" ? "orange" : "gris"} />
        <Stat libelle="Observations" valeur={String(observations.length)} detail={tout ? "tout l'historique" : "dix dernières années"} />
      </div>

      <Card className="mt-6">
        <CardHeader titre="Évolution" description="Les valeurs provisoires sont cerclées d'orange." actions={<ButtonLink href={tout ? `/indices/${serie.code}` : `/indices/${serie.code}?tout=1`} variante="secondary" taille="sm">{tout ? "Dix dernières années" : "Tout l'historique"}</ButtonLink>} />
        <CardBody>
          <GraphiqueIndice points={observations.map((o) => ({ periode: o.periode, valeur: Number(o.valeur), statut: o.statut }))} />
        </CardBody>
      </Card>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:items-start">
        <Card>
          <CardHeader titre="Historique" description={`${pluriel(observations.length, "valeur", "valeurs")}, de la plus récente à la plus ancienne.`} />
          <Tableau>
            <thead className="bg-slate-50">
              <tr>
                <Th>Période</Th>
                <Th droite>Valeur</Th>
                <Th droite>Sur un an</Th>
                <Th>Statut</Th>
                <Th>Récupérée le</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {[...observations].reverse().map((o) => {
                const ref = observations.find((x) => x.periode === periodeUnAnAvant(o.periode));
                return (
                  <tr key={o.periode} className="hover:bg-slate-50">
                    <Td className="whitespace-nowrap font-medium text-navy-900">{libellePeriode(o.periode)} <span className="font-mono text-xs text-slate-400">{o.periode}</span></Td>
                    <Td droite className="font-mono tabular-nums">{formatIndice(o.valeur)}</Td>
                    <Td droite className="tabular-nums text-slate-600">{formatVariation(ref ? variationDecimal(o.valeur, ref.valeur) : null)}</Td>
                    <Td>{o.statut === "P" ? <Badge ton="orange">Provisoire</Badge> : <Badge ton="vert">Définitif</Badge>}</Td>
                    <Td className="whitespace-nowrap text-xs text-slate-500">{formatDate(o.recupereLe)}</Td>
                  </tr>
                );
              })}
            </tbody>
          </Tableau>
          <TableauPied pagination={false}>Source : INSEE, série {serie.idbank}, service de données de la BDM.</TableauPied>
        </Card>
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader titre="Fiche de la série" />
            <CardBody>
              <Infos
                colonnes={1}
                items={[
                  { label: "Code", valeur: serie.code },
                  { label: "Idbank", valeur: <span className="font-mono">{serie.idbank}</span> },
                  { label: "Libellé INSEE", valeur: serie.libelleInsee ?? <span className="text-amber-700">non encore reçu</span> },
                  { label: "Fréquence", valeur: LIBELLES_FREQUENCE[serie.frequence] },
                  { label: "Base", valeur: serie.base },
                  { label: "Dernière synchronisation", valeur: serie.derniereSync ? formatDateHeure(serie.derniereSync) : "jamais" },
                  ...(serie.dernierEchec ? [{ label: "Dernier échec", valeur: <span className="text-red-700">{serie.dernierEchec}</span> }] : []),
                ]}
              />
            </CardBody>
          </Card>
          <Card>
            <CardHeader titre="Révisions" description="Valeurs modifiées par l'INSEE après une première publication (provisoire devenue définitive, correction)." />
            {revisions.length === 0 ? (
              <CardBody>
                <p className="text-sm text-slate-500">Aucune révision enregistrée.</p>
              </CardBody>
            ) : (
              <ul className="divide-y divide-slate-100">
                {revisions.map((r, i) => (
                  <li key={i} className="px-5 py-2.5 text-sm">
                    <span className="font-medium text-navy-900">{libellePeriode(r.periode)}</span> : {formatIndice(r.ancienneValeur)}{r.ancienStatut ? ` (${r.ancienStatut})` : ""} → <strong>{formatIndice(r.nouvelleValeur)}</strong>{r.nouveauStatut ? ` (${r.nouveauStatut})` : ""}
                    <span className="block text-xs text-slate-500">le {formatDateHeure(r.date)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
