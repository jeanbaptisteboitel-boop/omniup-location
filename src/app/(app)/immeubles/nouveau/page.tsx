import { prisma } from "@/lib/prisma";
import { creerImmeuble } from "@/actions/immeubles";
import { ImmeubleForm } from "@/components/patrimoine/immeuble-form";
import { Card, CardBody, PageHeader } from "@/components/ui";

export const metadata = { title: "Nouvel immeuble" };

export default async function NouvelImmeublePage() {
  const bailleurs = await prisma.bailleur.findMany({ orderBy: { nom: "asc" }, select: { id: true, nom: true } });
  return (
    <>
      <PageHeader titre="Nouvel immeuble" retour={{ href: "/immeubles", libelle: "Immeubles" }} />
      <Card>
        <CardBody>
          <ImmeubleForm action={creerImmeuble} initial={{}} bailleurs={bailleurs} annulerHref="/immeubles" />
        </CardBody>
      </Card>
    </>
  );
}
