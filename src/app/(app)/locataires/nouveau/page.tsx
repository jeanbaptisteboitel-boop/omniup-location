import { creerLocataire } from "@/actions/locataires";
import { LocataireForm } from "@/components/locataires/locataire-form";
import { Card, CardBody, PageHeader } from "@/components/ui";

export const metadata = { title: "Nouveau locataire" };

export default function NouveauLocatairePage() {
  return (
    <>
      <PageHeader titre="Nouveau locataire" sousTitre="Une fois le locataire créé, vous pourrez importer ses documents puis créer un bail." retour={{ href: "/locataires", libelle: "Locataires" }} />
      <Card>
        <CardBody>
          <LocataireForm action={creerLocataire} initial={{}} annulerHref="/locataires" />
        </CardBody>
      </Card>
    </>
  );
}
