import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { idDepuis, type ParamsId } from "@/lib/params";
import { modifierLot } from "@/actions/lots";
import { LotForm } from "@/components/patrimoine/lot-form";
import { Card, CardBody, PageHeader } from "@/components/ui";
import { entiteCouranteId } from "@/lib/entite";

export const metadata = { title: "Modifier le lot" };

export default async function ModifierLotPage({ params }: { params: ParamsId }) {
  const id = await idDepuis(params);
  const entiteId = await entiteCouranteId();
  const [lot, bailleurs, immeubles] = await Promise.all([
    prisma.lot.findFirst({ where: { id, entiteId } }),
    prisma.bailleur.findMany({ where: { entiteId }, orderBy: { nom: "asc" }, select: { id: true, nom: true } }),
    prisma.immeuble.findMany({ where: { entiteId }, orderBy: { nom: "asc" } }),
  ]);
  if (!lot) notFound();
  return (
    <>
      <PageHeader titre={`Modifier ${lot.nom}`} retour={{ href: `/lots/${lot.id}`, libelle: lot.nom }} />
      <Card>
        <CardBody>
          <LotForm action={modifierLot.bind(null, lot.id)} initial={lot} bailleurs={bailleurs} immeubles={immeubles} annulerHref={`/lots/${lot.id}`} />
        </CardBody>
      </Card>
    </>
  );
}
