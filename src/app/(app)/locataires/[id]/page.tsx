import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import type { CategorieDocument } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { idDepuis, texteParam, type ParamsId, type SearchParams } from "@/lib/params";
import { CATEGORIES_DOCUMENT, TYPES_BAIL_COURT, adresseSurPlusieursLignes, nomComplet } from "@/lib/libelles";
import { formatDate } from "@/lib/dates";
import { formatTaille } from "@/lib/storage";
import { supprimerLocataire } from "@/actions/locataires";
import { ajouterDocument, supprimerDocument } from "@/actions/documents";
import { preparerEnvoiDocument } from "@/actions/envois";
import { Badge, Button, ButtonLink, Card, CardBody, CardHeader, IconButton, IconLink, Infos, PageHeader } from "@/components/ui";
import { IconeApercu, IconeFichier, IconeSupprimer, IconeTelecharger } from "@/components/icones";
import { ConfirmForm } from "@/components/confirm-form";
import { Flash } from "@/components/flash";
import { DocumentForm } from "@/components/locataires/document-form";
import { BadgeStatutLocataire, bailCourant, statutLocataire } from "@/components/locataires/statut-locataire";
import { BadgeStatutBail } from "@/components/baux/badge-statut";
import { entiteCouranteId } from "@/lib/entite";
import { mailConfigure } from "@/lib/mail";
import { lienAcces, origineApplication } from "@/lib/espace";
import { AccesEspace } from "@/components/locataires/acces-espace";

/** Pièces demandées au candidat, dans l'ordre d'affichage du dossier. */
const CATEGORIES_DEMANDEES: CategorieDocument[] = ["PIECE_IDENTITE", "AVIS_IMPOSITION", "JUSTIFICATIF_DOMICILE", "JUSTIFICATIF_REVENUS", "LETTRE_RECOMMANDATION"];

export default async function LocatairePage({ params, searchParams }: { params: ParamsId; searchParams: SearchParams }) {
  const id = await idDepuis(params);
  const sp = await searchParams;
  const l = await prisma.locataire.findFirst({
    where: { id, entiteId: await entiteCouranteId() },
    include: { documents: { orderBy: { createdAt: "desc" } }, baux: { orderBy: { dateDebut: "desc" }, include: { lot: true } } },
  });
  if (!l) notFound();

  const statut = statutLocataire(l.baux);
  const bail = bailCourant(l.baux);
  const lien = l.accesJeton ? lienAcces(await origineApplication(), l.accesJeton) : null;
  const autresBaux = l.baux.filter((b) => b.id !== bail?.id);
  const nom = nomComplet(l);
  const adresse = adresseSurPlusieursLignes(l);
  const docsDe = (c: CategorieDocument) => l.documents.filter((d) => d.categorie === c);
  const autres = docsDe("AUTRE");
  const categories: { categorie: CategorieDocument; docs: typeof l.documents; badge: ReactNode }[] = [
    ...CATEGORIES_DEMANDEES.map((c) => {
      const docs = docsDe(c);
      return { categorie: c, docs, badge: docs.length ? <Badge ton="vert">{docs.length} fichier{docs.length > 1 ? "s" : ""}</Badge> : <Badge ton="orange">Manquant</Badge> };
    }),
    ...(autres.length ? [{ categorie: "AUTRE" as CategorieDocument, docs: autres, badge: <Badge ton="gris">{autres.length} fichier{autres.length > 1 ? "s" : ""}</Badge> }] : []),
  ];
  const sousTitre =
    statut === "EN_PLACE" && bail ? (
      <span>
        Locataire · <Link href={`/lots/${bail.lot.id}`} className="text-navy-800 hover:underline">{bail.lot.nom}</Link>
      </span>
    ) : statut === "ANCIEN" ? (
      "Ancien locataire"
    ) : (
      "Candidat à la location"
    );

  return (
    <>
      <PageHeader
        titre={nom}
        badge={<BadgeStatutLocataire statut={statut} />}
        sousTitre={sousTitre}
        retour={{ href: "/locataires", libelle: "Locataires" }}
        actions={
          <>
            <ConfirmForm action={supprimerLocataire} titre="Supprimer ce locataire ?" message={`Les coordonnées et le dossier de ${nom} seront définitivement supprimés. Cette action est irréversible.`} libelleConfirmer="Supprimer définitivement">
              <input type="hidden" name="id" value={l.id} />
              <Button type="submit" variante="danger">Supprimer</Button>
            </ConfirmForm>
            <ButtonLink href={`/locataires/${l.id}/modifier`} variante="secondary">Modifier</ButtonLink>
            {statut === "CANDIDAT" && <ButtonLink href={`/baux/nouveau?locataireId=${l.id}`}>Créer un bail</ButtonLink>}
          </>
        }
      />
      <Flash sp={sp} />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] md:items-start">
        <div className="flex min-w-0 flex-col gap-6">
        <Card>
          <CardHeader titre="Coordonnées" />
          <CardBody>
            <Infos
              colonnes={1}
              items={[
                { label: "Nom", valeur: l.nom },
                { label: "Prénom", valeur: l.prenom },
                { label: "Date de naissance", valeur: l.dateNaissance ? formatDate(l.dateNaissance) : null },
                { label: "Adresse", valeur: adresse.length ? adresse.map((x, i) => <span key={i} className="block">{x}</span>) : null },
                { label: "Téléphone", valeur: l.telephone },
                { label: "Email", valeur: l.email ? <a href={`mailto:${l.email}`} className="break-all text-navy-800 hover:underline">{l.email}</a> : <span className="text-amber-700">Non renseigné (nécessaire aux envois par email)</span> },
                ...(l.notes ? [{ label: "Notes", valeur: <span className="whitespace-pre-line">{l.notes}</span> }] : []),
              ]}
            />
          </CardBody>
          {bail && (
            <div className="border-t border-slate-100 px-5 py-4">
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-[.04em] text-slate-500">{bail.statut === "SIGNE" ? "Bail en cours" : "Bail en préparation"}</p>
              <Link href={`/baux/${bail.id}`} className="text-sm font-semibold text-navy-800 hover:text-brand-cyan-dark">
                {bail.lot.nom} · {TYPES_BAIL_COURT[bail.type]} · {bail.statut === "SIGNE" ? `depuis le ${formatDate(bail.dateDebut)}` : bail.statut === "EN_SIGNATURE" ? "en signature" : "brouillon"}
              </Link>
            </div>
          )}
          {autresBaux.length > 0 && (
            <div className="border-t border-slate-100 px-5 py-4">
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-[.04em] text-slate-500">{bail ? "Autres baux" : "Baux"}</p>
              <ul className="flex flex-col gap-2">
                {autresBaux.map((b) => (
                  <li key={b.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                    <Link href={`/baux/${b.id}`} className="font-medium text-navy-800 hover:underline">
                      {b.lot.nom} · {TYPES_BAIL_COURT[b.type]} · {formatDate(b.dateDebut)} → {formatDate(b.dateFinEffective ?? b.dateFin)}
                    </Link>
                    <BadgeStatutBail statut={b.statut} />
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>
        <AccesEspace locataire={l} lien={lien} mailConfigure={mailConfigure()} />
        </div>

        <div className="flex min-w-0 flex-col gap-6">
          <Card>
            <CardHeader titre="Dossier" description={`${l.documents.length} document${l.documents.length > 1 ? "s" : ""} · pièces demandées au candidat`} />
            <ul className="divide-y divide-slate-100">
              {categories.map(({ categorie, docs, badge }) => (
                <li key={categorie}>
                  <div className="flex items-center justify-between gap-3 px-5 py-3">
                    <span className="text-sm font-semibold text-navy-900">{categorie === "AUTRE" ? "Autres justificatifs" : CATEGORIES_DOCUMENT[categorie]}</span>
                    {badge}
                  </div>
                  {docs.map((d) => {
                    const libelle = d.libelle || d.nomFichier;
                    return (
                      <div key={d.id} className="flex flex-wrap items-center gap-3 px-5 pb-3 pt-2">
                        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600"><IconeFichier taille={18} /></span>
                        <span className="min-w-[160px] flex-1">
                          <span className="block break-all text-sm text-slate-900">{libelle}</span>
                          <span className="block text-xs text-slate-500">
                            Ajouté le {formatDate(d.createdAt)} · {formatTaille(d.taille)}
                            {d.libelle && <> · {d.nomFichier}</>}
                          </span>
                        </span>
                        <span className="flex gap-1">
                          <IconLink href={`/api/documents/${d.id}`} target="_blank" rel="noopener" aria-label={`Aperçu de ${libelle}`} title="Aperçu"><IconeApercu taille={16} /></IconLink>
                          <IconLink href={`/api/documents/${d.id}?dl=1`} aria-label={`Télécharger ${libelle}`} title="Télécharger"><IconeTelecharger taille={16} /></IconLink>
                          <ConfirmForm action={supprimerDocument} titre="Supprimer ce document ?" message={`« ${libelle} » sera retiré du dossier. Cette action est irréversible.`} libelleConfirmer="Supprimer définitivement">
                            <input type="hidden" name="id" value={d.id} />
                            <IconButton type="submit" variante="danger" aria-label={`Supprimer ${libelle}`} title="Supprimer"><IconeSupprimer taille={16} /></IconButton>
                          </ConfirmForm>
                        </span>
                      </div>
                    );
                  })}
                </li>
              ))}
            </ul>
          </Card>

          <Card>
            <CardHeader titre="Ajouter un document" />
            <CardBody>
              <DocumentForm action={ajouterDocument.bind(null, l.id)} preparer={preparerEnvoiDocument.bind(null, l.id)} categorieInitiale={texteParam(sp, "categorie") ?? undefined} />
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}
