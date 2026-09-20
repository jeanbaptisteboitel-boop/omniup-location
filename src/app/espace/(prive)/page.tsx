import Link from "next/link";
import type { SearchParams } from "@/lib/params";
import { bauxDuLocataire, exigerLocataire, soldeBail } from "@/lib/espace";
import { demandesDuLocataire, estOuverte, reponseNonLue } from "@/lib/maintenance";
import { TYPES_BAIL_COURT, adresseSurUneLigne, nomComplet } from "@/lib/libelles";
import { aujourdhui, formatDate } from "@/lib/dates";
import { arrondir2, formatEuros, somme } from "@/lib/montants";
import { Badge, ButtonLink, Card, CardBody, CardHeader, EmptyState, Infos, PageHeader, Stat } from "@/components/ui";
import { Flash } from "@/components/flash";
import { BadgeStatutBail } from "@/components/baux/badge-statut";
import { BadgeStatutMaintenance } from "@/components/maintenance/badges";

export const metadata = { title: "Espace locataire" };
export const dynamic = "force-dynamic";

export default async function EspaceAccueil({ searchParams }: { searchParams: SearchParams }) {
  const l = await exigerLocataire();
  const sp = await searchParams;
  const auj = aujourdhui();
  const [baux, demandes] = await Promise.all([bauxDuLocataire(l.id), demandesDuLocataire(l.id)]);
  const lignes = baux.map((b) => ({ b, solde: soldeBail(b.appels, auj) }));
  const total = arrondir2(somme(lignes.map((x) => x.solde.total)));
  const enRetard = arrondir2(somme(lignes.map((x) => x.solde.enRetard)));
  const prochaine = lignes
    .flatMap((x) => x.solde.dus.map((d) => d.appel))
    .sort((a, b) => a.dateEcheance.getTime() - b.dateEcheance.getTime())[0];
  const pluriel = (n: number, un: string, plusieurs: string) => `${n} ${n > 1 ? plusieurs : un}`;
  const peutDeposer = baux.some((b) => b.statut === "SIGNE");
  const enCours = demandes.filter((d) => estOuverte(d.statut)).length;
  return (
    <>
      <PageHeader titre={`Bonjour ${nomComplet(l)}`} sousTitre="Votre bail, l'exemplaire signé, vos avis d'échéance, vos quittances, vos courriers, votre solde et vos demandes d'intervention." />
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

      <Card className="mt-6">
        <CardHeader
          titre="Demandes d'intervention"
          description={enCours > 0 ? `${pluriel(enCours, "demande en cours", "demandes en cours")} sur ${demandes.length}.` : "Fuite, panne de chauffage, serrure bloquée : signalez le problème à votre bailleur."}
          actions={
            <>
              {demandes.length > 0 && <ButtonLink href="/espace/maintenance" variante="secondary" taille="sm">Toutes mes demandes</ButtonLink>}
              {peutDeposer && <ButtonLink href="/espace/maintenance/nouvelle" taille="sm">Nouvelle demande</ButtonLink>}
            </>
          }
        />
        {demandes.length === 0 ? (
          <CardBody>
            <p className="text-sm text-slate-500">{peutDeposer ? "Aucune demande pour l'instant." : "Les demandes d'intervention sont réservées aux baux en cours."}</p>
          </CardBody>
        ) : (
          <ul className="divide-y divide-slate-100">
            {demandes.slice(0, 3).map((d) => (
              <li key={d.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
                <span className="min-w-0">
                  <Link href={`/espace/maintenance/${d.id}`} className="block truncate text-sm font-semibold text-navy-900 hover:underline">{d.objet}</Link>
                  <span className="block text-xs text-slate-500">{d.lot.nom} · déposée le {formatDate(d.createdAt)}</span>
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  {reponseNonLue(d) && <Badge ton="cyan">Nouvelle réponse</Badge>}
                  <BadgeStatutMaintenance statut={d.statut} />
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
