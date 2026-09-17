import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { idDepuis, type ParamsId } from "@/lib/params";
import { chargerAffectations } from "@/lib/affectations-data";
import { modifierDepense } from "@/actions/depenses";
import { DepenseForm } from "@/components/depenses/depense-form";
import { preparerEnvoiJustificatif } from "@/actions/envois";
import { Card, CardBody, PageHeader } from "@/components/ui";

export const metadata = { title: "Modifier la dépense" };

export default async function ModifierDepensePage({ params }: { params: ParamsId }) {
  const id = await idDepuis(params);
  const [d, affectations] = await Promise.all([prisma.depense.findUnique({ where: { id } }), chargerAffectations()]);
  if (!d) notFound();
  return (
    <>
      <PageHeader titre={`Modifier « ${d.libelle} »`} retour={{ href: "/depenses", libelle: "Dépenses" }} />
      <Card>
        <CardBody>
          <DepenseForm action={modifierDepense.bind(null, d.id)} preparer={preparerEnvoiJustificatif} initial={d} affectations={affectations} annulerHref="/depenses" />
        </CardBody>
      </Card>
    </>
  );
}
