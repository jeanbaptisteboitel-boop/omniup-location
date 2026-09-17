import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { idDepuis, type ParamsId } from "@/lib/params";
import { adresseSurUneLigne } from "@/lib/libelles";
import { modifierImmeuble } from "@/actions/immeubles";
import { ImmeubleForm } from "@/components/patrimoine/immeuble-form";
import { Card, CardBody, PageHeader } from "@/components/ui";
import { entiteCouranteId } from "@/lib/entite";

export const metadata = { title: "Modifier l'immeuble" };

export default async function ModifierImmeublePage({ params }: { params: ParamsId }) {
  const id = await idDepuis(params);
  const entiteId = await entiteCouranteId();
  const [i, bailleurs] = await Promise.all([
    prisma.immeuble.findFirst({ where: { id, entiteId } }),
    prisma.bailleur.findMany({ where: { entiteId }, orderBy: { nom: "asc" }, select: { id: true, nom: true } }),
  ]);
  if (!i) notFound();
  return (
    <>
      <PageHeader titre={`Modifier ${i.nom}`} sousTitre={adresseSurUneLigne(i)} retour={{ href: `/immeubles/${i.id}`, libelle: i.nom }} />
      <Card className="max-w-3xl">
        <CardBody>
          <ImmeubleForm action={modifierImmeuble.bind(null, i.id)} initial={i} bailleurs={bailleurs} annulerHref={`/immeubles/${i.id}`} libelleEnvoi="Enregistrer les modifications" />
        </CardBody>
      </Card>
    </>
  );
}
