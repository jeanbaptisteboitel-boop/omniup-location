import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { idDepuis, type ParamsId } from "@/lib/params";
import { nomComplet } from "@/lib/libelles";
import { modifierBail } from "@/actions/baux";
import { BailForm } from "@/components/baux/bail-form";
import { Card, CardBody, PageHeader } from "@/components/ui";
import { entiteCouranteId } from "@/lib/entite";
import { includeLocataires, nomsLocataires } from "@/lib/locataires";
import { optionTvaEffective } from "@/lib/tva";

export const metadata = { title: "Modifier le bail" };

export default async function ModifierBailPage({ params }: { params: ParamsId }) {
  const id = await idDepuis(params);
  const entiteId = await entiteCouranteId();
  const [b, lots, locataires] = await Promise.all([
    prisma.bail.findFirst({ where: { id, entiteId }, include: { lot: true, locataires: includeLocataires } }),
    prisma.lot.findMany({ where: { entiteId }, orderBy: [{ ville: "asc" }, { nom: "asc" }], include: { bailleur: { select: { typePersonne: true } }, immeuble: { select: { optionTva: true } } } }),
    prisma.locataire.findMany({ where: { entiteId }, orderBy: [{ nom: "asc" }, { prenom: "asc" }] }),
  ]);
  if (!b) notFound();
  return (
    <>
      <PageHeader titre="Modifier le bail" sousTitre={`${b.lot.nom} · ${nomsLocataires(b.locataires)}`} retour={{ href: `/baux/${b.id}`, libelle: "Bail" }} />
      <Card className="max-w-3xl">
        <CardBody>
          <BailForm
            action={modifierBail.bind(null, b.id)}
            initial={b}
            locataireIdsInitiaux={b.locataires.map((l) => l.id)}
            lots={lots.map((l) => ({ id: l.id, nom: l.nom, adresse: l.adresse, codePostal: l.codePostal, ville: l.ville, type: l.type, meuble: l.meuble, optionTva: optionTvaEffective(l), bailleurPersonneMorale: l.bailleur?.typePersonne === "MORALE", loyerIndicatif: l.loyerIndicatif, chargesIndicatives: l.chargesIndicatives }))}
            locataires={locataires.map((l) => ({ id: l.id, nom: nomComplet(l), detail: [l.email, l.ville].filter(Boolean).join(" · ") || null }))}
            annulerHref={`/baux/${b.id}`}
            verrouille={b.statut === "SIGNE" || b.statut === "TERMINE"}
          />
        </CardBody>
      </Card>
    </>
  );
}
