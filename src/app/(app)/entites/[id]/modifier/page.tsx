import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { idDepuis, type ParamsId } from "@/lib/params";
import { TYPES_ENTITE } from "@/lib/libelles";
import { modifierEntite } from "@/actions/entites";
import { EntiteForm } from "@/components/entites/entite-form";
import { Card, CardBody, PageHeader } from "@/components/ui";

export const metadata = { title: "Modifier l'entité" };

export default async function ModifierEntitePage({ params }: { params: ParamsId }) {
  const id = await idDepuis(params);
  const e = await prisma.entite.findUnique({ where: { id } });
  if (!e) notFound();
  return (
    <>
      <PageHeader titre={e.nom} sousTitre={`${TYPES_ENTITE[e.type]} · modifiez le nom, le type ou les notes de l'entité.`} retour={{ href: "/entites", libelle: "Entités" }} />
      <Card className="max-w-3xl">
        <CardBody>
          <EntiteForm action={modifierEntite.bind(null, e.id)} initial={e} annulerHref="/entites" retour="/entites" />
        </CardBody>
      </Card>
    </>
  );
}
