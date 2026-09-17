import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { idDepuis, type ParamsId } from "@/lib/params";
import { chargerAffectations } from "@/lib/affectations-data";
import { modifierEmprunt } from "@/actions/emprunts";
import { EmpruntForm } from "@/components/emprunts/emprunt-form";
import { Card, CardBody, PageHeader } from "@/components/ui";
import { entiteCouranteId } from "@/lib/entite";

export const metadata = { title: "Modifier l'emprunt" };

export default async function ModifierEmpruntPage({ params }: { params: ParamsId }) {
  const id = await idDepuis(params);
  const [e, affectations] = await Promise.all([prisma.emprunt.findFirst({ where: { id, entiteId: await entiteCouranteId() } }), chargerAffectations()]);
  if (!e) notFound();
  return (
    <>
      <PageHeader titre={`Modifier ${e.libelle}`} retour={{ href: `/emprunts/${e.id}`, libelle: e.libelle }} />
      <Card>
        <CardBody>
          <EmpruntForm action={modifierEmprunt.bind(null, e.id)} initial={e} affectations={affectations} annulerHref={`/emprunts/${e.id}`} />
        </CardBody>
      </Card>
    </>
  );
}
