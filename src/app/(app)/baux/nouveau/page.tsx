import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { entierParam, type SearchParams } from "@/lib/params";
import { nomComplet } from "@/lib/libelles";
import { creerBail } from "@/actions/baux";
import { BailForm } from "@/components/baux/bail-form";
import { Alerte, Card, CardBody, PageHeader } from "@/components/ui";
import { entiteCouranteId } from "@/lib/entite";

export const metadata = { title: "Nouveau bail" };

export default async function NouveauBailPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const entiteId = await entiteCouranteId();
  const [lots, locataires] = await Promise.all([
    prisma.lot.findMany({ where: { entiteId }, orderBy: [{ ville: "asc" }, { nom: "asc" }], include: { bailleur: { select: { typePersonne: true } } } }),
    prisma.locataire.findMany({ where: { entiteId }, orderBy: [{ nom: "asc" }, { prenom: "asc" }] }),
  ]);
  const lotId = entierParam(sp, "lotId");
  const locataireId = entierParam(sp, "locataireId");
  const lotChoisi = lots.find((l) => l.id === lotId);
  return (
    <>
      <PageHeader titre="Nouveau bail" sousTitre="Le bail est créé en brouillon ; il génère des appels de loyer une fois marqué comme signé." retour={{ href: "/baux", libelle: "Baux" }} />
      {(lots.length === 0 || locataires.length === 0) && (
        <div className="mb-4">
          <Alerte ton="orange" titre="Éléments manquants">
            {lots.length === 0 && <p>Aucun lot : <Link href="/lots/nouveau" className="underline">créez d'abord un lot</Link>.</p>}
            {locataires.length === 0 && <p>Aucun locataire : <Link href="/locataires/nouveau" className="underline">créez d'abord un locataire</Link>.</p>}
          </Alerte>
        </div>
      )}
      <Card>
        <CardBody>
          <BailForm
            action={creerBail}
            initial={{ lotId: lotId ?? undefined, locataireId: locataireId ?? undefined, type: lotChoisi?.meuble ? "MEUBLE" : "NON_MEUBLE", loyerHC: lotChoisi?.loyerIndicatif ?? undefined, charges: lotChoisi?.chargesIndicatives ?? undefined }}
            lots={lots.map((l) => ({ id: l.id, nom: l.nom, adresse: l.adresse, codePostal: l.codePostal, ville: l.ville, meuble: l.meuble, bailleurPersonneMorale: l.bailleur?.typePersonne === "MORALE" }))}
            locataires={locataires.map((l) => ({ id: l.id, nom: nomComplet(l) }))}
            annulerHref="/baux"
          />
        </CardBody>
      </Card>
    </>
  );
}
