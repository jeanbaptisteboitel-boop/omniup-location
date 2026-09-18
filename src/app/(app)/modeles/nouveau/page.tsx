import { creerModele } from "@/actions/modeles";
import { ModeleForm } from "@/components/modeles/modele-form";

export const metadata = { title: "Nouveau modèle" };

export default function NouveauModelePage() {
  return (
    <ModeleForm
      action={creerModele}
      titre="Nouveau modèle"
      initial={{ categorie: "AUTRE", contenu: "# Titre du document\n\n## Article 1 – Parties\n\nEntre {{bailleur.nom}}, {{bailleur.adresse}}, et {{locataire.nomComplet}}, {{locataire.adresse}}.\n\n## Article 2 – Objet\n\n[À COMPLÉTER]\n\nFait à [À COMPLÉTER : lieu], le {{date.jour}}." }}
      annulerHref="/modeles"
      retour={{ href: "/modeles", libelle: "Modèles de documents" }}
    />
  );
}
