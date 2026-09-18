import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { idDepuis, type ParamsId, type SearchParams } from "@/lib/params";
import { dupliquerModele, modifierModele, reinitialiserModele, supprimerModele } from "@/actions/modeles";
import { ModeleForm } from "@/components/modeles/modele-form";
import { statutModele } from "@/components/modeles/statut-modele";
import { Badge, Button, ButtonLink } from "@/components/ui";
import { ConfirmForm } from "@/components/confirm-form";
import { Flash } from "@/components/flash";

export default async function ModelePage({ params, searchParams }: { params: ParamsId; searchParams: SearchParams }) {
  const id = await idDepuis(params);
  const sp = await searchParams;
  const m = await prisma.modeleDocument.findUnique({ where: { id }, include: { _count: { select: { documents: true } } } });
  if (!m) notFound();
  const statut = statutModele(m);
  return (
    <ModeleForm
      action={modifierModele.bind(null, m.id)}
      initial={m}
      annulerHref="/modeles"
      badge={<Badge ton={statut.perso ? "bleu" : "gris"}>{statut.perso ? "Personnalisé" : "Par défaut"}</Badge>}
      retour={{ href: "/modeles", libelle: "Modèles de documents" }}
      flash={<Flash sp={sp} />}
      nbDocuments={m._count.documents}
      actionsSecondaires={
        <>
          <ButtonLink href={`/modeles/${m.id}/generer`} variante="ghost">Générer un document</ButtonLink>
          <form action={dupliquerModele}>
            <input type="hidden" name="id" value={m.id} />
            <Button type="submit" variante="secondary">Dupliquer</Button>
          </form>
          {m.parDefaut ? (
            statut.reinitialisable && (
              <ConfirmForm action={reinitialiserModele} titre="Réinitialiser ce modèle ?" message={`« ${m.nom} » reprendra sa version d'origine : vos modifications seront perdues.`} libelleConfirmer="Réinitialiser">
                <input type="hidden" name="id" value={m.id} />
                <Button type="submit" variante="secondary">Réinitialiser</Button>
              </ConfirmForm>
            )
          ) : (
            <ConfirmForm action={supprimerModele} titre="Supprimer ce modèle ?" message={`« ${m.nom} » sera supprimé de la bibliothèque. Cette action est irréversible.`} libelleConfirmer="Supprimer définitivement">
              <input type="hidden" name="id" value={m.id} />
              <Button type="submit" variante="danger">Supprimer</Button>
            </ConfirmForm>
          )}
        </>
      }
    />
  );
}
