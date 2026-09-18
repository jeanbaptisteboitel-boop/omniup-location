import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { idDepuis, type ParamsId } from "@/lib/params";
import { nomComplet } from "@/lib/libelles";
import { modifierBail } from "@/actions/baux";
import { BailForm } from "@/components/baux/bail-form";
import { Card, CardBody, PageHeader } from "@/components/ui";
import { entiteCouranteId } from "@/lib/entite";

export const metadata = { title: "Modifier le bail" };

export default async function ModifierBailPage({ params }: { params: ParamsId }) {
  const id = await idDepuis(params);
  const entiteId = await entiteCouranteId();
  const [b, lots, locataires] = await Promise.all([
    prisma.bail.findFirst({ where: { id, entiteId }, include: { lot: true, locataire: true } }),
    prisma.lot.findMany({ where: { entiteId }, orderBy: [{ ville: "asc" }, { nom: "asc" }], include: { bailleur: { select: { typePersonne: true } } } }),
    prisma.locataire.findMany({ where: { entiteId }, orderBy: [{ nom: "asc" }, { prenom: "asc" }] }),
  ]);
  if (!b) notFound();
  return (
    <>
      <PageHeader titre="Modifier le bail" sousTitre={`${b.lot.nom} · ${nomComplet(b.locataire)}`} retour={{ href: `/baux/${b.id}`, libelle: "Bail" }} />
      <Card className="max-w-3xl">
        <CardBody>
          <BailForm
            action={modifierBail.bind(null, b.id)}
            initial={b}
            lots={lots.map((l) => ({ id: l.id, nom: l.nom, adresse: l.adresse, codePostal: l.codePostal, ville: l.ville, meuble: l.meuble, bailleurPersonneMorale: l.bailleur?.typePersonne === "MORALE", loyerIndicatif: l.loyerIndicatif, chargesIndicatives: l.chargesIndicatives }))}
            locataires={locataires.map((l) => ({ id: l.id, nom: nomComplet(l) }))}
            annulerHref={`/baux/${b.id}`}
            verrouille={b.statut === "SIGNE" || b.statut === "TERMINE"}
          />
        </CardBody>
      </Card>
    </>
  );
}
