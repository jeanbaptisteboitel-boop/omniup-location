import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { entierParam, entiersParam, nombreParam, texteParam, type SearchParams } from "@/lib/params";
import type { TypeBail } from "@prisma/client";
import { parseDateISO } from "@/lib/dates";
import { dateFinParDefaut } from "@/lib/bail-regles";
import { nomComplet } from "@/lib/libelles";
import { creerBail } from "@/actions/baux";
import { BailForm } from "@/components/baux/bail-form";
import { Flash } from "@/components/flash";
import { Alerte, Card, CardBody, PageHeader } from "@/components/ui";
import { entiteCouranteId } from "@/lib/entite";
import { optionTvaEffective } from "@/lib/tva";

export const metadata = { title: "Nouveau bail" };

export default async function NouveauBailPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const entiteId = await entiteCouranteId();
  const [lots, locataires] = await Promise.all([
    prisma.lot.findMany({ where: { entiteId }, orderBy: [{ ville: "asc" }, { nom: "asc" }], include: { bailleur: { select: { typePersonne: true } }, immeuble: { select: { optionTva: true } } } }),
    prisma.locataire.findMany({ where: { entiteId }, orderBy: [{ nom: "asc" }, { prenom: "asc" }] }),
  ]);
  const lotId = entierParam(sp, "lotId");
  // Plusieurs locataires peuvent être pré-sélectionnés : bail de couple ou colocation issu d'une candidature.
  const locataireIds = entiersParam(sp, "locataireId").filter((id) => locataires.some((l) => l.id === id));
  const lotChoisi = lots.find((l) => l.id === lotId);
  const loyerHC = nombreParam(sp, "loyerHC");
  const charges = nombreParam(sp, "charges");
  const dateDebut = parseDateISO(texteParam(sp, "dateDebut") ?? "");
  // Le formulaire ne calcule la date de fin qu'à la saisie : quand la date de début vient d'une
  // candidature, il faut la calculer ici, sinon le champ reste vide et le bail est refusé.
  const typeInitial: TypeBail = lotChoisi?.meuble ? "MEUBLE" : "NON_MEUBLE";
  const dateFin = dateDebut ? dateFinParDefaut(typeInitial, dateDebut, lotChoisi?.bailleur?.typePersonne === "MORALE") : null;
  return (
    <>
      <PageHeader titre="Nouveau bail" sousTitre="Le bail est créé en brouillon. Vous générerez ensuite le contrat depuis le modèle correspondant." retour={{ href: "/baux", libelle: "Baux" }} />
      <Flash sp={sp} />
      {(lots.length === 0 || locataires.length === 0) && (
        <div className="mb-6 max-w-3xl">
          <Alerte ton="orange" titre="Éléments manquants">
            {lots.length === 0 && <p>Aucun lot : <Link href="/lots/nouveau" className="underline">créez d'abord un lot</Link>.</p>}
            {locataires.length === 0 && <p>Aucun locataire : <Link href="/locataires/nouveau" className="underline">créez d'abord un locataire</Link>.</p>}
          </Alerte>
        </div>
      )}
      <Card className="max-w-3xl">
        <CardBody>
          <BailForm
            action={creerBail}
            initial={{
              lotId: lotId ?? undefined,
              type: typeInitial,
              loyerHC: loyerHC ?? lotChoisi?.loyerIndicatif ?? undefined,
              charges: charges ?? lotChoisi?.chargesIndicatives ?? undefined,
              ...(dateDebut ? { dateDebut } : {}),
              ...(dateFin ? { dateFin } : {}),
            }}
            locataireIdsInitiaux={locataireIds}
            lots={lots.map((l) => ({ id: l.id, nom: l.nom, adresse: l.adresse, codePostal: l.codePostal, ville: l.ville, type: l.type, meuble: l.meuble, optionTva: optionTvaEffective(l), bailleurPersonneMorale: l.bailleur?.typePersonne === "MORALE", loyerIndicatif: l.loyerIndicatif, chargesIndicatives: l.chargesIndicatives }))}
            locataires={locataires.map((l) => ({ id: l.id, nom: nomComplet(l), detail: [l.email, l.ville].filter(Boolean).join(" · ") || null }))}
            annulerHref="/baux"
            libelleEnvoi="Créer le bail"
          />
        </CardBody>
      </Card>
    </>
  );
}
