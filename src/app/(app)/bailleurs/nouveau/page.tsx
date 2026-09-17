import { creerBailleur } from "@/actions/bailleurs";
import { BailleurForm } from "@/components/patrimoine/bailleur-form";
import { Card, CardBody, PageHeader } from "@/components/ui";

export const metadata = { title: "Nouveau bailleur" };

export default function NouveauBailleurPage() {
  return (
    <>
      <PageHeader titre="Nouveau bailleur" sousTitre="Propriétaire, personne physique ou société, au nom duquel les baux, avis d'échéance et quittances sont émis." retour={{ href: "/bailleurs", libelle: "Bailleurs" }} />
      <Card className="max-w-3xl">
        <CardBody>
          <BailleurForm action={creerBailleur} initial={{}} annulerHref="/bailleurs" libelleEnvoi="Créer le bailleur" />
        </CardBody>
      </Card>
    </>
  );
}
