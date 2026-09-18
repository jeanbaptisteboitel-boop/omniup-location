import { entierParam, texteParam, type SearchParams } from "@/lib/params";
import { chargerAffectations } from "@/lib/affectations-data";
import { creerDepense } from "@/actions/depenses";
import { DepenseForm } from "@/components/depenses/depense-form";
import { preparerEnvoiJustificatif } from "@/actions/envois";
import { Card, CardBody, PageHeader } from "@/components/ui";

export const metadata = { title: "Nouvelle dépense" };

export default async function NouvelleDepensePage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const affectations = await chargerAffectations();
  const lotId = entierParam(sp, "lotId");
  const immeubleId = entierParam(sp, "immeubleId");
  const affectationInitiale = lotId ? `lot:${lotId}` : immeubleId ? `immeuble:${immeubleId}` : undefined;
  const retour = lotId ? `/lots/${lotId}` : immeubleId ? `/immeubles/${immeubleId}` : texteParam(sp, "retour") ?? undefined;
  const libelleRetour = lotId ? "Lot" : immeubleId ? "Immeuble" : "Dépenses";
  return (
    <>
      <PageHeader titre="Nouvelle dépense" sousTitre="Charges déductibles des revenus fonciers, rattachées à un immeuble ou à un lot." retour={{ href: retour ?? "/depenses", libelle: libelleRetour }} />
      <Card className="max-w-3xl">
        <CardBody>
          <DepenseForm action={creerDepense} preparer={preparerEnvoiJustificatif} initial={{}} affectations={affectations} affectationInitiale={affectationInitiale} annulerHref={retour ?? "/depenses"} retour={retour} />
        </CardBody>
      </Card>
    </>
  );
}
