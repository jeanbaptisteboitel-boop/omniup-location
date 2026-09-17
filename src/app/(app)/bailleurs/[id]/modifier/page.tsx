import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { idDepuis, type ParamsId } from "@/lib/params";
import { modifierBailleur } from "@/actions/bailleurs";
import { BailleurForm } from "@/components/patrimoine/bailleur-form";
import { Card, CardBody, PageHeader } from "@/components/ui";
import { entiteCouranteId } from "@/lib/entite";

export const metadata = { title: "Modifier le bailleur" };

export default async function ModifierBailleurPage({ params }: { params: ParamsId }) {
  const id = await idDepuis(params);
  const b = await prisma.bailleur.findFirst({ where: { id, entiteId: await entiteCouranteId() } });
  if (!b) notFound();
  return (
    <>
      <PageHeader titre={`Modifier ${b.nom}`} retour={{ href: `/bailleurs/${b.id}`, libelle: b.nom }} />
      <Card>
        <CardBody>
          <BailleurForm action={modifierBailleur.bind(null, b.id)} initial={b} annulerHref={`/bailleurs/${b.id}`} />
        </CardBody>
      </Card>
    </>
  );
}
