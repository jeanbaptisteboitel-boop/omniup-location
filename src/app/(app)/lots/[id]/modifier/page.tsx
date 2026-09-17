import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { idDepuis, type ParamsId } from "@/lib/params";
import { adresseSurUneLigne } from "@/lib/libelles";
import { modifierLot } from "@/actions/lots";
import { LotForm } from "@/components/patrimoine/lot-form";
import { Card, CardBody, PageHeader } from "@/components/ui";
import { entiteCouranteId } from "@/lib/entite";

export const metadata = { title: "Modifier le lot" };

export default async function ModifierLotPage({ params }: { params: ParamsId }) {
  const id = await idDepuis(params);
  const entiteId = await entiteCouranteId();
  const [lot, bailleurs, immeubles] = await Promise.all([
    prisma.lot.findFirst({ where: { id, entiteId }, include: { immeuble: { select: { nom: true } } } }),
    prisma.bailleur.findMany({ where: { entiteId }, orderBy: { nom: "asc" }, select: { id: true, nom: true } }),
    prisma.immeuble.findMany({ where: { entiteId }, orderBy: { nom: "asc" } }),
  ]);
  if (!lot) notFound();
  return (
    <>
      <PageHeader titre={`Modifier ${lot.nom}`} sousTitre={[lot.immeuble?.nom, adresseSurUneLigne(lot)].filter(Boolean).join(" · ")} retour={{ href: `/lots/${lot.id}`, libelle: lot.nom }} />
      <Card className="max-w-3xl">
        <CardBody>
          <LotForm action={modifierLot.bind(null, lot.id)} initial={lot} bailleurs={bailleurs} immeubles={immeubles} annulerHref={`/lots/${lot.id}`} libelleEnvoi="Enregistrer les modifications" />
        </CardBody>
      </Card>
    </>
  );
}
