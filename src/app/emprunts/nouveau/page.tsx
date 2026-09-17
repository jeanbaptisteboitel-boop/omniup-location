import { entierParam, type SearchParams } from "@/lib/params";
import { chargerAffectations } from "@/lib/affectations-data";
import { creerEmprunt } from "@/actions/emprunts";
import { EmpruntForm } from "@/components/emprunts/emprunt-form";
import { Card, CardBody, PageHeader } from "@/components/ui";

export const metadata = { title: "Nouvel emprunt" };

export default async function NouvelEmpruntPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const affectations = await chargerAffectations();
  const lotId = entierParam(sp, "lotId");
  const immeubleId = entierParam(sp, "immeubleId");
  return (
    <>
      <PageHeader titre="Nouvel emprunt" retour={{ href: "/emprunts", libelle: "Emprunts" }} />
      <Card>
        <CardBody>
          <EmpruntForm action={creerEmprunt} initial={{}} affectations={affectations} affectationInitiale={lotId ? `lot:${lotId}` : immeubleId ? `immeuble:${immeubleId}` : undefined} annulerHref="/emprunts" />
        </CardBody>
      </Card>
    </>
  );
}
