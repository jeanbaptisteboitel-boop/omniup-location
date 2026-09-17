import { prisma } from "@/lib/prisma";
import { entierParam, type SearchParams } from "@/lib/params";
import { creerLot } from "@/actions/lots";
import { LotForm } from "@/components/patrimoine/lot-form";
import { Card, CardBody, PageHeader } from "@/components/ui";

export const metadata = { title: "Nouveau lot" };

export default async function NouveauLotPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const immeubleId = entierParam(sp, "immeubleId");
  const [bailleurs, immeubles] = await Promise.all([
    prisma.bailleur.findMany({ orderBy: { nom: "asc" }, select: { id: true, nom: true } }),
    prisma.immeuble.findMany({ orderBy: { nom: "asc" } }),
  ]);
  const immeuble = immeubleId ? immeubles.find((i) => i.id === immeubleId) : undefined;
  const initial = immeuble
    ? { immeubleId: immeuble.id, adresse: immeuble.adresse, complementAdresse: immeuble.complementAdresse, codePostal: immeuble.codePostal, ville: immeuble.ville, bailleurId: immeuble.bailleurId }
    : {};
  return (
    <>
      <PageHeader titre="Nouveau lot" retour={{ href: "/lots", libelle: "Lots" }} />
      <Card>
        <CardBody>
          <LotForm action={creerLot} initial={initial} bailleurs={bailleurs} immeubles={immeubles} annulerHref="/lots" />
        </CardBody>
      </Card>
    </>
  );
}
