import { creerModele } from "@/actions/modeles";
import { ModeleForm } from "@/components/modeles/modele-form";
import { Card, CardBody, PageHeader } from "@/components/ui";

export const metadata = { title: "Nouveau modèle" };

export default function NouveauModelePage() {
  return (
    <>
      <PageHeader titre="Nouveau modèle de document" retour={{ href: "/modeles", libelle: "Modèles" }} />
      <Card>
        <CardBody>
          <ModeleForm action={creerModele} initial={{ contenu: "# Titre du document\n\n## Article 1 – Parties\n\nEntre {{bailleur.nom}}, {{bailleur.adresse}}, et {{locataire.nomComplet}}, {{locataire.adresse}}.\n\n## Article 2 – Objet\n\n[À COMPLÉTER]\n\nFait à [À COMPLÉTER : lieu], le {{date.jour}}." }} annulerHref="/modeles" />
        </CardBody>
      </Card>
    </>
  );
}
