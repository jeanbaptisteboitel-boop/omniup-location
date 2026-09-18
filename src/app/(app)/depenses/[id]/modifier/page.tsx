import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { idDepuis, type ParamsId } from "@/lib/params";
import { chargerAffectations } from "@/lib/affectations-data";
import { modifierDepense } from "@/actions/depenses";
import { DepenseForm } from "@/components/depenses/depense-form";
import { preparerEnvoiJustificatif } from "@/actions/envois";
import { Card, CardBody, PageHeader } from "@/components/ui";
import { entiteCouranteId } from "@/lib/entite";

export const metadata = { title: "Modifier la dépense" };

export default async function ModifierDepensePage({ params }: { params: ParamsId }) {
  const id = await idDepuis(params);
  const [d, affectations] = await Promise.all([prisma.depense.findFirst({ where: { id, entiteId: await entiteCouranteId() } }), chargerAffectations()]);
  if (!d) notFound();
  return (
    <>
      <PageHeader titre={`Modifier « ${d.libelle} »`} sousTitre="Charges déductibles des revenus fonciers, rattachées à un immeuble ou à un lot." retour={{ href: "/depenses", libelle: "Dépenses" }} />
      <Card className="max-w-3xl">
        <CardBody>
          <DepenseForm action={modifierDepense.bind(null, d.id)} preparer={preparerEnvoiJustificatif} initial={d} affectations={affectations} annulerHref="/depenses" />
        </CardBody>
      </Card>
    </>
  );
}
