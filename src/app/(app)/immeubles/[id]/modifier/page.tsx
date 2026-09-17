import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { idDepuis, type ParamsId } from "@/lib/params";
import { modifierImmeuble } from "@/actions/immeubles";
import { ImmeubleForm } from "@/components/patrimoine/immeuble-form";
import { Card, CardBody, PageHeader } from "@/components/ui";

export const metadata = { title: "Modifier l'immeuble" };

export default async function ModifierImmeublePage({ params }: { params: ParamsId }) {
  const id = await idDepuis(params);
  const [i, bailleurs] = await Promise.all([
    prisma.immeuble.findUnique({ where: { id } }),
    prisma.bailleur.findMany({ orderBy: { nom: "asc" }, select: { id: true, nom: true } }),
  ]);
  if (!i) notFound();
  return (
    <>
      <PageHeader titre={`Modifier ${i.nom}`} retour={{ href: `/immeubles/${i.id}`, libelle: i.nom }} />
      <Card>
        <CardBody>
          <ImmeubleForm action={modifierImmeuble.bind(null, i.id)} initial={i} bailleurs={bailleurs} annulerHref={`/immeubles/${i.id}`} />
        </CardBody>
      </Card>
    </>
  );
}
