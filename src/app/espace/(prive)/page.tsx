import type { SearchParams } from "@/lib/params";
import { bauxDuLocataire, exigerLocataire, soldeBail } from "@/lib/espace";
import { TYPES_BAIL_COURT, adresseSurUneLigne, nomComplet } from "@/lib/libelles";
import { aujourdhui, formatDate } from "@/lib/dates";
import { arrondir2, formatEuros, somme } from "@/lib/montants";
import { ButtonLink, Card, CardBody, CardHeader, EmptyState, Infos, PageHeader, Stat } from "@/components/ui";
import { Flash } from "@/components/flash";
import { BadgeStatutBail } from "@/components/baux/badge-statut";

export const metadata = { title: "Espace locataire" };
export const dynamic = "force-dynamic";

export default async function EspaceAccueil({ searchParams }: { searchParams: SearchParams }) {
  const l = await exigerLocataire();
  const sp = await searchParams;
  const auj = aujourdhui();
  const baux = await bauxDuLocataire(l.id);
  const lignes = baux.map((b) => ({ b, solde: soldeBail(b.appels, auj) }));
  const total = arrondir2(somme(lignes.map((x) => x.solde.total)));
  const enRetard = arrondir2(somme(lignes.map((x) => x.solde.enRetard)));
  const prochaine = lignes
    .flatMap((x) => x.solde.dus.map((d) => d.appel))
    .sort((a, b) => a.dateEcheance.getTime() - b.dateEcheance.getTime())[0];
  const pluriel = (n: number, un: string, plusieurs: string) => `${n} ${n > 1 ? plusieurs : un}`;
  return (
    <>
      <PageHeader titre={`Bonjour ${nomComplet(l)}`} sousTitre="Votre bail, l'exemplaire signé, vos avis d'échéance, vos quittances, vos courriers et votre solde." />
      <Flash sp={sp} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Stat libelle="Solde dû" valeur={formatEuros(total)} detail={total > 0 ? (enRetard > 0 ? `dont ${formatEuros(enRetard)} en retard` : "à régler avant l'échéance") : "vous êtes à jour de vos loyers"} ton={total > 0 ? (enRetard > 0 ? "rouge" : "orange") : "vert"} />
        <Stat libelle="Prochaine échéance" valeur={prochaine ? formatEuros(prochaine.total) : "—"} detail={prochaine ? `le ${formatDate(prochaine.dateEcheance)}` : "aucune échéance en attente"} ton="bleu" />
        <Stat libelle="Baux" valeur={String(baux.length)} detail={pluriel(baux.filter((b) => b.statut === "SIGNE").length, "bail en cours", "baux en cours")} />
      </div>
      {baux.length === 0 ? (
        <EmptyState className="mt-6" titre="Aucun bail" description="Votre bailleur n'a pas encore rattaché de bail signé à votre compte." />
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          {lignes.map(({ b, solde }) => (
            <Card key={b.id}>
              <CardHeader titre={b.lot.nom} description={adresseSurUneLigne(b.lot)} actions={<BadgeStatutBail statut={b.statut} />} />
              <CardBody>
                <Infos
                  colonnes={2}
                  items={[
                    { label: "Type de bail", valeur: TYPES_BAIL_COURT[b.type] },
                    { label: b.statut === "TERMINE" ? "Période" : "Depuis le", valeur: b.statut === "TERMINE" ? `${formatDate(b.dateDebut)} → ${formatDate(b.dateFinEffective ?? b.dateFin)}` : formatDate(b.dateDebut) },
                    { label: "Loyer charges comprises", valeur: formatEuros(b.loyerHC + b.charges) },
                    { label: "Solde dû", valeur: <span className={solde.total > 0 ? "font-semibold text-red-700" : "font-semibold text-emerald-700"}>{formatEuros(solde.total)}</span> },
                  ]}
                />
                <div className="mt-4">
                  <ButtonLink href={`/espace/baux/${b.id}`}>Voir le détail</ButtonLink>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
