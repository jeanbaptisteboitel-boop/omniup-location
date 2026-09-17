import { creerBailleur } from "@/actions/bailleurs";
import { BailleurForm } from "@/components/patrimoine/bailleur-form";
import { Card, CardBody, PageHeader } from "@/components/ui";

export const metadata = { title: "Nouveau bailleur" };

export default function NouveauBailleurPage() {
  return (
    <>
      <PageHeader titre="Nouveau bailleur" retour={{ href: "/bailleurs", libelle: "Bailleurs" }} />
      <Card>
        <CardBody>
          <BailleurForm action={creerBailleur} initial={{}} annulerHref="/bailleurs" />
        </CardBody>
      </Card>
    </>
  );
}
