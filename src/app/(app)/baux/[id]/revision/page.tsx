import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { idDepuis, texteParam, type ParamsId, type SearchParams } from "@/lib/params";
import { avecMessage } from "@/lib/erreurs";
import { REGLES_BAIL } from "@/lib/bail-regles";
import { ajouterAnnees, aujourdhui, debutMois, formatDate, periodeSuivante, periodeDe, toISODate } from "@/lib/dates";
import { reviserLoyer } from "@/actions/baux";
import { reviserManuellement } from "@/actions/revisions";
import { RevisionForm } from "@/components/baux/revision-form";
import { RevisionManuelleForm } from "@/components/baux/revision-manuelle-form";
import { Alerte, ButtonLink, Card, CardBody, CardHeader, PageHeader } from "@/components/ui";
import { Flash } from "@/components/flash";
import { entiteCouranteId } from "@/lib/entite";
import { includeLocataires, nomsLocataires } from "@/lib/locataires";

export const metadata = { title: "Révision du loyer" };
export const dynamic = "force-dynamic";

export default async function RevisionPage({ params, searchParams }: { params: ParamsId; searchParams: SearchParams }) {
  const id = await idDepuis(params);
  const sp = await searchParams;
  const b = await prisma.bail.findFirst({ where: { id, entiteId: await entiteCouranteId() }, include: { lot: true, locataires: includeLocataires, revisions: { orderBy: { dateEffet: "desc" }, take: 1 } } });
  if (!b) notFound();
  if (b.statut === "BROUILLON" || b.statut === "EN_SIGNATURE") {
    redirect(avecMessage(`/baux/${id}`, "Modifiez directement le loyer tant que le bail n'est pas signé.", "erreur"));
  }
  const surIndice = REGLES_BAIL[b.type].revisionIRL && b.clauseRevision && !b.revisionBloquee && b.statut === "SIGNE";
  const manuelle = texteParam(sp, "mode") === "manuelle" || !surIndice;
  const proposeeIndice = ajouterAnnees(b.revisions[0]?.dateEffet ?? b.dateDebut, 1);
  // Révision manuelle : le mois suivant par défaut, pour que les appels déjà émis ne soient pas repris.
  const proposeeManuelle = debutMois(periodeSuivante(periodeDe(aujourdhui())));

  return (
    <>
      <PageHeader
        titre={manuelle ? "Révision manuelle du loyer" : "Révision du loyer"}
        sousTitre={`${b.lot.nom} · ${nomsLocataires(b.locataires)}`}
        retour={{ href: `/baux/${b.id}?onglet=revisions`, libelle: "Bail" }}
        actions={
          surIndice ? (
            <ButtonLink href={manuelle ? `/baux/${b.id}/revision` : `/baux/${b.id}/revision?mode=manuelle`} variante="secondary">
              {manuelle ? "Réviser sur l'indice" : "Réviser manuellement"}
            </ButtonLink>
          ) : undefined
        }
      />
      <Flash sp={sp} />

      {manuelle ? (
        <Card className="max-w-[640px]">
          <CardHeader
            titre="Nouveau loyer"
            description="Révision saisie à la main : accord amiable, loyer négocié, régularisation ou baisse consentie. Elle est conservée dans l'historique et sert de base au courrier au locataire."
          />
          <CardBody>
            {b.revisionBloquee && (
              <Alerte ton="orange" className="mb-4">
                La révision annuelle est bloquée à la demande du bailleur{b.revisionBlocageMotif ? ` (${b.revisionBlocageMotif})` : ""} : seule une révision manuelle est possible.
              </Alerte>
            )}
            {!REGLES_BAIL[b.type].revisionIRL && <Alerte ton="bleu" className="mb-4">Ce type de bail ne se révise pas sur l'indice de référence des loyers : indiquez directement le nouveau loyer et sa date d'effet.</Alerte>}
            {!b.clauseRevision && REGLES_BAIL[b.type].revisionIRL && <Alerte ton="bleu" className="mb-4">Ce bail ne comporte pas de clause de révision annuelle : une révision suppose l'accord du locataire.</Alerte>}
            <RevisionManuelleForm action={reviserManuellement.bind(null, b.id)} loyerActuel={b.loyerHC} dateEffetProposee={toISODate(proposeeManuelle)} />
          </CardBody>
        </Card>
      ) : (
        <Card className="max-w-[520px]">
          <RevisionForm
            action={reviserLoyer.bind(null, b.id)}
            loyerActuel={b.loyerHC}
            irlTrimestre={b.irlTrimestre}
            irlValeur={b.irlValeur}
            dateEffetProposee={toISODate(proposeeIndice)}
            annulerHref={`/baux/${b.id}?onglet=revisions`}
          />
          <p className="px-5 pb-5 text-[13px] text-slate-500">Révision possible à la date anniversaire du bail, soit le {formatDate(proposeeIndice)}.</p>
        </Card>
      )}
    </>
  );
}
