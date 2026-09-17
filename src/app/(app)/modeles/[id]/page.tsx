import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { idDepuis, type ParamsId, type SearchParams } from "@/lib/params";
import { CATEGORIES_MODELE } from "@/lib/libelles";
import { dupliquerModele, modifierModele, reinitialiserModele, supprimerModele } from "@/actions/modeles";
import { ModeleForm } from "@/components/modeles/modele-form";
import { Badge, Button, ButtonLink, Card, CardBody, PageHeader } from "@/components/ui";
import { ConfirmForm } from "@/components/confirm-form";
import { Flash } from "@/components/flash";

export default async function ModelePage({ params, searchParams }: { params: ParamsId; searchParams: SearchParams }) {
  const id = await idDepuis(params);
  const sp = await searchParams;
  const m = await prisma.modeleDocument.findUnique({ where: { id }, include: { _count: { select: { documents: true } } } });
  if (!m) notFound();
  return (
    <>
      <PageHeader
        titre={m.nom}
        sousTitre={<span className="flex flex-wrap items-center gap-2">{m.parDefaut ? <Badge ton="bleu">Fourni par défaut</Badge> : <Badge ton="violet">Personnalisé</Badge>}<Badge ton="gris">{CATEGORIES_MODELE[m.categorie]}</Badge><span>{m._count.documents} document(s) généré(s)</span></span>}
        retour={{ href: "/modeles", libelle: "Modèles" }}
        actions={
          <>
            <ButtonLink href={`/modeles/${m.id}/generer`} variante="accent">Générer un document</ButtonLink>
            <form action={dupliquerModele}><input type="hidden" name="id" value={m.id} /><Button type="submit" variante="secondary">Dupliquer</Button></form>
            {m.parDefaut ? (
              <ConfirmForm action={reinitialiserModele} message="Réinitialiser ce modèle à sa version d'origine ? Vos modifications seront perdues.">
                <input type="hidden" name="id" value={m.id} />
                <Button type="submit" variante="ghost">Réinitialiser</Button>
              </ConfirmForm>
            ) : (
              <ConfirmForm action={supprimerModele} message={`Supprimer le modèle « ${m.nom} » ?`}>
                <input type="hidden" name="id" value={m.id} />
                <Button type="submit" variante="danger">Supprimer</Button>
              </ConfirmForm>
            )}
          </>
        }
      />
      <Flash sp={sp} />
      <Card>
        <CardBody>
          <ModeleForm action={modifierModele.bind(null, m.id)} initial={m} annulerHref="/modeles" />
        </CardBody>
      </Card>
    </>
  );
}
