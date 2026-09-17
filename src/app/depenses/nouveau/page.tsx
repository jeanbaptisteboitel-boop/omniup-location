import { entierParam, texteParam, type SearchParams } from "@/lib/params";
import { chargerAffectations } from "@/lib/affectations-data";
import { creerDepense } from "@/actions/depenses";
import { DepenseForm } from "@/components/depenses/depense-form";
import { Card, CardBody, PageHeader } from "@/components/ui";

export const metadata = { title: "Nouvelle dépense" };

export default async function NouvelleDepensePage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const affectations = await chargerAffectations();
  const lotId = entierParam(sp, "lotId");
  const immeubleId = entierParam(sp, "immeubleId");
  const affectationInitiale = lotId ? `lot:${lotId}` : immeubleId ? `immeuble:${immeubleId}` : undefined;
  const retour = lotId ? `/lots/${lotId}` : immeubleId ? `/immeubles/${immeubleId}` : texteParam(sp, "retour") ?? undefined;
  return (
    <>
      <PageHeader titre="Nouvelle dépense" retour={{ href: retour ?? "/depenses", libelle: "Retour" }} />
      <Card>
        <CardBody>
          <DepenseForm action={creerDepense} initial={{}} affectations={affectations} affectationInitiale={affectationInitiale} annulerHref={retour ?? "/depenses"} retour={retour} />
        </CardBody>
      </Card>
    </>
  );
}
