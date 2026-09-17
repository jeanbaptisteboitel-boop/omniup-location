import Link from "next/link";
import { notFound } from "next/navigation";
import type { CategorieDocument } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { idDepuis, texteParam, type ParamsId, type SearchParams } from "@/lib/params";
import { CATEGORIES_DOCUMENT, TYPES_BAIL_COURT, adresseSurPlusieursLignes, nomComplet } from "@/lib/libelles";
import { formatDate, formatDateHeure } from "@/lib/dates";
import { formatEuros } from "@/lib/montants";
import { formatTaille } from "@/lib/storage";
import { supprimerLocataire } from "@/actions/locataires";
import { ajouterDocument, supprimerDocument } from "@/actions/documents";
import { Badge, Button, ButtonLink, Card, CardBody, CardHeader, Infos, PageHeader, Tableau, Td, Th } from "@/components/ui";
import { ConfirmForm } from "@/components/confirm-form";
import { Flash } from "@/components/flash";
import { DocumentForm } from "@/components/locataires/document-form";
import { BadgeStatutBail } from "@/components/baux/badge-statut";

const ORDRE_CATEGORIES: CategorieDocument[] = ["PIECE_IDENTITE", "AVIS_IMPOSITION", "JUSTIFICATIF_REVENUS", "JUSTIFICATIF_DOMICILE", "LETTRE_RECOMMANDATION", "AUTRE"];

export default async function LocatairePage({ params, searchParams }: { params: ParamsId; searchParams: SearchParams }) {
  const id = await idDepuis(params);
  const sp = await searchParams;
  const l = await prisma.locataire.findUnique({
    where: { id },
    include: { documents: { orderBy: { createdAt: "desc" } }, baux: { orderBy: { dateDebut: "desc" }, include: { lot: true } } },
  });
  if (!l) notFound();

  const presentes = new Set(l.documents.map((d) => d.categorie));
  const docsTries = [...l.documents].sort((a, b) => ORDRE_CATEGORIES.indexOf(a.categorie) - ORDRE_CATEGORIES.indexOf(b.categorie) || b.createdAt.getTime() - a.createdAt.getTime());
  const bailActif = l.baux.find((b) => b.statut === "SIGNE");

  return (
    <>
      <PageHeader
        titre={nomComplet(l)}
        sousTitre={bailActif ? <span>Locataire de <Link href={`/lots/${bailActif.lot.id}`} className="text-navy-800 hover:underline">{bailActif.lot.nom}</Link></span> : "Candidat / sans bail en cours"}
        retour={{ href: "/locataires", libelle: "Locataires" }}
        actions={
          <>
            <ButtonLink href={`/baux/nouveau?locataireId=${l.id}`}>Créer un bail</ButtonLink>
            <ButtonLink href={`/locataires/${l.id}/modifier`} variante="secondary">Modifier</ButtonLink>
            <ConfirmForm action={supprimerLocataire} message={`Supprimer ${nomComplet(l)} et tous ses documents ?`}>
              <input type="hidden" name="id" value={l.id} />
              <Button type="submit" variante="danger">Supprimer</Button>
            </ConfirmForm>
          </>
        }
      />
      <Flash sp={sp} />
      <div className="space-y-6">
        <Card>
          <CardHeader titre="Coordonnées" />
          <CardBody>
            <Infos
              colonnes={3}
              items={[
                { label: "Email", valeur: l.email ? <a href={`mailto:${l.email}`} className="text-navy-800 hover:underline">{l.email}</a> : <span className="text-amber-700">Non renseigné (nécessaire aux envois par email)</span> },
                { label: "Téléphone", valeur: l.telephone },
                { label: "Date de naissance", valeur: formatDate(l.dateNaissance) || null },
                { label: "Adresse actuelle", valeur: adresseSurPlusieursLignes(l).length ? adresseSurPlusieursLignes(l).map((x, i) => <span key={i} className="block">{x}</span>) : null },
                { label: "Notes", valeur: l.notes && <span className="whitespace-pre-line">{l.notes}</span> },
              ]}
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader titre="Dossier de candidature" description="Pièces d'identité et justificatifs apportés pour la demande de logement." />
          <CardBody>
            <ul className="mb-5 grid grid-cols-1 gap-2 sm:grid-cols-3">
              {ORDRE_CATEGORIES.map((c) => (
                <li key={c} className="flex items-center gap-2 text-sm">
                  <span className={`flex h-5 w-5 items-center justify-center rounded-full text-xs ${presentes.has(c) ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-400"}`}>{presentes.has(c) ? "✓" : "–"}</span>
                  <span className={presentes.has(c) ? "text-navy-900" : "text-slate-500"}>{CATEGORIES_DOCUMENT[c]}</span>
                </li>
              ))}
            </ul>
            <DocumentForm action={ajouterDocument.bind(null, l.id)} categorieInitiale={texteParam(sp, "categorie") ?? undefined} />
          </CardBody>
          {docsTries.length > 0 && (
            <Tableau>
              <thead className="bg-slate-50"><tr><Th>Type</Th><Th>Document</Th><Th>Importé le</Th><Th droite>Taille</Th><Th /></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {docsTries.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50">
                    <Td><Badge ton="bleu">{CATEGORIES_DOCUMENT[d.categorie]}</Badge></Td>
                    <Td>
                      <a href={`/api/documents/${d.id}`} target="_blank" rel="noopener" className="font-medium text-navy-800 hover:underline">{d.libelle || d.nomFichier}</a>
                      {d.libelle && <span className="block text-xs text-slate-500">{d.nomFichier}</span>}
                    </Td>
                    <Td>{formatDateHeure(d.createdAt)}</Td>
                    <Td droite>{formatTaille(d.taille)}</Td>
                    <Td droite>
                      <div className="flex justify-end gap-2">
                        <ButtonLink href={`/api/documents/${d.id}?dl=1`} taille="sm" variante="secondary">Télécharger</ButtonLink>
                        <ConfirmForm action={supprimerDocument} message={`Supprimer le document « ${d.libelle || d.nomFichier} » ?`}>
                          <input type="hidden" name="id" value={d.id} />
                          <Button type="submit" taille="sm" variante="danger">Supprimer</Button>
                        </ConfirmForm>
                      </div>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Tableau>
          )}
        </Card>

        <Card>
          <CardHeader titre={`Baux (${l.baux.length})`} />
          {l.baux.length === 0 ? (
            <CardBody><p className="text-sm text-slate-500">Aucun bail. Une fois le dossier complet, créez un bail pour relier ce locataire à un lot.</p></CardBody>
          ) : (
            <Tableau>
              <thead className="bg-slate-50"><tr><Th>Lot</Th><Th>Type</Th><Th>Période</Th><Th droite>Loyer HC</Th><Th>Statut</Th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {l.baux.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50">
                    <Td><Link href={`/baux/${b.id}`} className="font-medium text-navy-800 hover:underline">{b.lot.nom}</Link><span className="block text-xs text-slate-500">{b.lot.adresse}, {b.lot.codePostal} {b.lot.ville}</span></Td>
                    <Td>{TYPES_BAIL_COURT[b.type]}</Td>
                    <Td>{formatDate(b.dateDebut)} → {formatDate(b.dateFinEffective ?? b.dateFin)}</Td>
                    <Td droite>{formatEuros(b.loyerHC)}</Td>
                    <Td><BadgeStatutBail statut={b.statut} /></Td>
                  </tr>
                ))}
              </tbody>
            </Tableau>
          )}
        </Card>
      </div>
    </>
  );
}
