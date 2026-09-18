import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { idDepuis, type ParamsId } from "@/lib/params";
import { nomComplet } from "@/lib/libelles";
import { modifierLocataire } from "@/actions/locataires";
import { LocataireForm } from "@/components/locataires/locataire-form";
import { Card, CardBody, PageHeader } from "@/components/ui";
import { entiteCouranteId } from "@/lib/entite";

export const metadata = { title: "Modifier le locataire" };

export default async function ModifierLocatairePage({ params }: { params: ParamsId }) {
  const id = await idDepuis(params);
  const l = await prisma.locataire.findFirst({ where: { id, entiteId: await entiteCouranteId() } });
  if (!l) notFound();
  return (
    <>
      <PageHeader titre="Modifier le locataire" sousTitre={nomComplet(l)} retour={{ href: `/locataires/${l.id}`, libelle: nomComplet(l) }} />
      <Card className="max-w-3xl">
        <CardBody>
          <LocataireForm action={modifierLocataire.bind(null, l.id)} initial={l} annulerHref={`/locataires/${l.id}`} />
        </CardBody>
      </Card>
    </>
  );
}
