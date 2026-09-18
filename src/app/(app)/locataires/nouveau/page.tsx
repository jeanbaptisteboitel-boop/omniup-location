import { creerLocataire } from "@/actions/locataires";
import { LocataireForm } from "@/components/locataires/locataire-form";
import { Card, CardBody, PageHeader } from "@/components/ui";

export const metadata = { title: "Nouveau locataire" };

export default function NouveauLocatairePage() {
  return (
    <>
      <PageHeader titre="Nouveau locataire" sousTitre="Le locataire est créé en tant que candidat ; il passe « En place » à la signature du bail." retour={{ href: "/locataires", libelle: "Locataires" }} />
      <Card className="max-w-3xl">
        <CardBody>
          <LocataireForm action={creerLocataire} initial={{}} annulerHref="/locataires" libelleEnvoi="Créer le locataire" />
        </CardBody>
      </Card>
    </>
  );
}
