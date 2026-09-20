import type { SearchParams } from "@/lib/params";
import { dossierModifiable, exigerDossier } from "@/lib/candidat";
import { CATEGORIES_PIECE, ORDRE_CATEGORIES, PIECES_INTERDITES, etatPieces, piecesProposees, STATUTS_PIECE, TONS_PIECE } from "@/lib/candidatures";
import { formatDate } from "@/lib/dates";
import { formatTaille } from "@/lib/storage";
import { deposerPiece, preparerEnvoiPiece, retirerPiece } from "@/actions/candidat";
import { Alerte, Badge, Button, ButtonLink, Card, CardBody, CardHeader, PageHeader } from "@/components/ui";
import { ConfirmForm } from "@/components/confirm-form";
import { Flash } from "@/components/flash";
import { DepotPiece } from "@/components/candidatures/depot-piece";

export const metadata = { title: "Mes justificatifs" };
export const dynamic = "force-dynamic";

export default async function JustificatifsPage({ searchParams }: { searchParams: SearchParams }) {
  const d = await exigerDossier();
  const sp = await searchParams;
  const modifiable = dossierModifiable(d.candidature.statut) && !d.complet;
  const proposees = piecesProposees(d.situation, d.personneMorale);
  const etats = etatPieces(d.situation, d.personneMorale, d.pieces);

  if (!d.personneMorale && !d.situation) {
    return (
      <>
        <PageHeader titre="Mes justificatifs" retour={{ href: "/candidature", libelle: "Mon dossier" }} />
        <Flash sp={sp} />
        <Alerte ton="bleu" titre="Indiquez d'abord votre situation">
          Les justificatifs demandés dépendent de votre situation professionnelle.
          <div className="mt-3">
            <ButtonLink href="/candidature/informations" variante="secondary">Compléter mes informations</ButtonLink>
          </div>
        </Alerte>
      </>
    );
  }

  return (
    <>
      <PageHeader
        titre="Mes justificatifs"
        sousTitre="Seules les pièces prévues par le décret du 5 novembre 2015 peuvent vous être demandées."
        retour={{ href: "/candidature", libelle: "Mon dossier" }}
      />
      <Flash sp={sp} />

      {!modifiable && (
        <Alerte ton="bleu" className="mb-5">
          {d.complet ? "Votre dossier est validé : rouvrez-le depuis « Mon dossier » pour déposer d'autres pièces." : "Ce dossier n'est plus modifiable."}
        </Alerte>
      )}

      <div className="flex flex-col gap-5">
        {ORDRE_CATEGORIES.filter((c) => proposees.some((p) => p.categorie === c)).map((categorie) => {
          const etat = etats.find((e) => e.categorie === categorie);
          return (
            <Card key={categorie}>
              <CardHeader
                titre={CATEGORIES_PIECE[categorie]}
                description={
                  categorie === "IDENTITE"
                    ? "Un seul document, en cours de validité."
                    : categorie === "DOMICILE"
                      ? "Un seul document justifiant votre logement actuel."
                      : categorie === "ACTIVITE"
                        ? "Un document attestant votre activité."
                        : "Un ou plusieurs documents justifiant vos ressources."
                }
                actions={etat?.couverte ? <Badge ton="vert">Fourni</Badge> : <Badge ton="orange">Attendu</Badge>}
              />
              <CardBody className="flex flex-col gap-4">
                {proposees
                  .filter((p) => p.categorie === categorie)
                  .map((piece) => {
                    const fichiers = d.pieces.filter((f) => f.code === piece.code);
                    return (
                      <div key={piece.code} className="rounded-lg border border-slate-200 p-4">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-navy-900">{piece.libelle}</p>
                            <p className="mt-0.5 text-[13px] text-slate-600">{piece.aide}</p>
                          </div>
                          {fichiers.length > 0 && <Badge ton={fichiers.some((f) => f.statut === "REFUSEE") ? "rouge" : fichiers.every((f) => f.statut === "VALIDEE") ? "vert" : "bleu"}>{fichiers.length} fichier(s)</Badge>}
                        </div>

                        {fichiers.length > 0 && (
                          <ul className="mt-3 flex flex-col gap-2">
                            {fichiers.map((f) => (
                              <li key={f.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2">
                                <div className="min-w-0">
                                  <a href={`/api/candidature/pieces/${f.id}`} target="_blank" rel="noreferrer" className="truncate text-sm font-medium text-navy-900 underline-offset-2 hover:underline">
                                    {f.nomFichier}
                                  </a>
                                  <p className="text-xs text-slate-500">
                                    {formatTaille(f.taille)} · déposé le {formatDate(f.createdAt)}
                                  </p>
                                  {f.statut === "REFUSEE" && f.motifRefus && <p className="mt-1 text-xs text-red-600">À remplacer : {f.motifRefus}</p>}
                                </div>
                                <div className="flex shrink-0 items-center gap-2">
                                  <Badge ton={TONS_PIECE[f.statut]}>{STATUTS_PIECE[f.statut]}</Badge>
                                  {modifiable && (
                                    <ConfirmForm action={retirerPiece} titre="Retirer ce justificatif ?" message="Le fichier sera définitivement supprimé. Vous pourrez en déposer un autre." libelleConfirmer="Retirer">
                                      <input type="hidden" name="id" value={f.id} />
                                      <Button type="submit" variante="ghost" taille="sm">Retirer</Button>
                                    </ConfirmForm>
                                  )}
                                </div>
                              </li>
                            ))}
                          </ul>
                        )}

                        {modifiable && <DepotPiece piece={piece} action={deposerPiece} preparer={preparerEnvoiPiece} replie={fichiers.length > 0} />}
                      </div>
                    );
                  })}
              </CardBody>
            </Card>
          );
        })}
      </div>

      <Card className="mt-5">
        <CardHeader titre="Ce qui ne peut pas vous être demandé" description="Article 22-2 de la loi du 6 juillet 1989 : refusez de transmettre ces documents, même à un bailleur ou à une agence." />
        <CardBody>
          <ul className="grid grid-cols-1 gap-x-6 gap-y-1.5 text-[13px] text-slate-600 sm:grid-cols-2">
            {PIECES_INTERDITES.map((p) => (
              <li key={p} className="flex gap-2">
                <span aria-hidden className="text-red-500">✕</span>
                <span>{p}</span>
              </li>
            ))}
          </ul>
        </CardBody>
      </Card>
    </>
  );
}
