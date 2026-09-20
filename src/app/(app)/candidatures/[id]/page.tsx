import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { idDepuis, type ParamsId, type SearchParams } from "@/lib/params";
import { entiteCouranteId } from "@/lib/entite";
import { includeDossiersCandidature, lienCandidature } from "@/lib/candidat";
import { origineApplication } from "@/lib/espace";
import { mailConfigure } from "@/lib/mail";
import {
  apprecierTauxEffort,
  avancementDossier,
  CATEGORIES_PIECE,
  couvertureGarant,
  cumulGarantieInterdit,
  libellePiece,
  loyerCharges,
  nomDossier,
  ORDRE_CATEGORIES,
  revenuTotal,
  SITUATIONS,
  STATUTS_CANDIDATURE,
  STATUTS_PIECE,
  tauxEffort,
  TONS_CANDIDATURE,
  TONS_PIECE,
  TYPES_GARANTIE,
} from "@/lib/candidatures";
import { adresseSurUneLigne } from "@/lib/libelles";
import { etatDpe } from "@/lib/dpe";
import { formatDate, formatDateHeure } from "@/lib/dates";
import { formatEuros, formatNombre } from "@/lib/montants";
import { formatTaille } from "@/lib/storage";
import {
  accepterCandidature,
  ajouterCandidat,
  preparerBailDepuisCandidature,
  envoyerAcces,
  marquerTransmise,
  modifierCandidature,
  refuserCandidature,
  renouvelerAcces,
  revoquerAcces,
  rouvrirCandidature,
  statuerPiece,
  supprimerCandidature,
  supprimerDossier,
  supprimerPiece,
} from "@/actions/candidatures";
import { Alerte, Badge, Button, ButtonLink, Card, CardBody, CardHeader, Infos, PageHeader, Stat } from "@/components/ui";
import { Checkbox, Field, Input, Textarea } from "@/components/form";
import { ConfirmForm } from "@/components/confirm-form";
import { ActionDialogue } from "@/components/baux/action-dialogue";
import { Flash } from "@/components/flash";
import { BoutonCopier } from "@/components/locataires/bouton-copier";
import { CandidatureForm } from "@/components/candidatures/candidature-form";
import { AjoutCandidatForm } from "@/components/candidatures/ajout-candidat-form";

export const metadata = { title: "Candidature" };
export const dynamic = "force-dynamic";

export default async function CandidaturePage({ params, searchParams }: { params: ParamsId; searchParams: SearchParams }) {
  const id = await idDepuis(params);
  const sp = await searchParams;
  const entiteId = await entiteCouranteId();
  const c = await prisma.candidature.findFirst({ where: { id, entiteId }, include: includeDossiersCandidature });
  if (!c) notFound();

  const [lots, origine] = await Promise.all([
    prisma.lot.findMany({ where: { entiteId }, select: { id: true, nom: true, loyerIndicatif: true, chargesIndicatives: true }, orderBy: { nom: "asc" } }),
    origineApplication(),
  ]);

  const candidats = c.dossiers.filter((d) => d.role === "CANDIDAT");
  const cautions = c.dossiers.filter((d) => d.role === "GARANT");
  const loyerCC = loyerCharges(c);
  const revenus = candidats.reduce((s, d) => s + revenuTotal(d), 0);
  const taux = tauxEffort(revenus, loyerCC);
  const appreciation = apprecierTauxEffort(taux);
  const revenusCautions = cautions.reduce((s, d) => s + revenuTotal(d), 0);
  const couverture = couvertureGarant(revenusCautions, loyerCC);
  const cumulInterdit = cumulGarantieInterdit(c.typeGarantie, c.assuranceLoyersImpayes, candidats[0]?.situation ?? null);
  const decidee = c.statut === "ACCEPTEE" || c.statut === "REFUSEE" || c.statut === "CONCLUE";
  const close = c.statut === "CONCLUE";
  const mail = mailConfigure();

  return (
    <>
      <PageHeader
        titre={candidats.map(nomDossier).join(", ") || "Candidature"}
        sousTitre={c.lot ? `${c.lot.nom} · ${adresseSurUneLigne(c.lot)}` : "Logement à préciser"}
        retour={{ href: "/candidatures", libelle: "Candidatures" }}
        actions={<Badge ton={TONS_CANDIDATURE[c.statut]}>{STATUTS_CANDIDATURE[c.statut]}</Badge>}
      />
      <Flash sp={sp} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <Stat libelle="Loyer charges comprises" valeur={loyerCC > 0 ? formatEuros(loyerCC) : "—"} detail={c.dateSouhaitee ? `entrée souhaitée le ${formatDate(c.dateSouhaitee)}` : "date d'entrée à convenir"} ton="gris" />
        <Stat libelle="Revenus du foyer candidat" valeur={revenus > 0 ? formatEuros(revenus) : "—"} detail={`${candidats.length} candidat${candidats.length > 1 ? "s" : ""}`} ton="bleu" />
        <Stat
          libelle="Taux d'effort"
          valeur={taux !== null ? `${formatNombre(taux, 1)} %` : "—"}
          detail={appreciation?.libelle ?? "revenus ou loyer non renseignés"}
          ton={appreciation ? (appreciation.ton === "vert" ? "vert" : appreciation.ton === "orange" ? "orange" : "rouge") : "gris"}
        />
        <Stat libelle="Couverture des cautions" valeur={couverture !== null ? `${formatNombre(couverture, 1)} ×` : "—"} detail={cautions.length > 0 ? `${cautions.length} caution${cautions.length > 1 ? "s" : ""} déclarée(s)` : "aucune caution"} ton={cautions.length > 0 ? "violet" : "gris"} />
      </div>

      {appreciation && (
        <Alerte ton={appreciation.ton === "vert" ? "vert" : appreciation.ton === "orange" ? "orange" : "rouge"} titre={`Taux d'effort ${appreciation.libelle.toLowerCase()}`} className="mt-5">
          {appreciation.detail} Aucun seuil n&apos;est imposé par la loi : cette appréciation reste indicative.
        </Alerte>
      )}
      {cumulInterdit && (
        <Alerte ton="orange" titre="Cumul de garanties interdit" className="mt-4">
          Une assurance contre les loyers impayés est souscrite : un cautionnement ne peut pas être exigé en plus, sauf si le locataire est étudiant ou apprenti (article 22-1 de la loi du 6 juillet 1989).
        </Alerte>
      )}
      {c.lot && etatDpe(c.lot, new Date()) !== "VALIDE" && (
        <Alerte ton="orange" titre="DPE à communiquer au candidat" className="mt-4">
          Le diagnostic de performance énergétique doit être porté à la connaissance du candidat et annexé au bail. Son absence n&apos;empêche pas d&apos;instruire la candidature ni de louer.{" "}
          <Link href={`/lots/${c.lot.id}`} className="font-semibold underline underline-offset-2">Fiche du lot</Link>
        </Alerte>
      )}
      {c.statut === "CONCLUE" && (
        <Alerte ton="vert" titre="Candidat devenu locataire" className="mt-4">
          Le bail a été signé le {formatDate(c.concluLe)} : le candidat est maintenant locataire.
        </Alerte>
      )}
      {c.statut === "REFUSEE" && (
        <Alerte ton="orange" titre="Candidature refusée" className="mt-4">
          Décision du {formatDate(c.decisionLe)}.{c.motifRefus ? ` Motif : ${c.motifRefus}` : ""} Détruisez le dossier une fois le logement attribué : les pièces d&apos;un candidat non retenu n&apos;ont pas vocation à être conservées.
        </Alerte>
      )}

      <div className="mt-6 flex flex-col gap-5">
        {c.dossiers.map((d) => {
          const a = avancementDossier(d, d.pieces);
          const lien = d.accesJeton ? lienCandidature(origine, d.accesJeton) : null;
          const caution = d.role === "GARANT";
          return (
            <Card key={d.id}>
              <CardHeader
                titre={nomDossier(d)}
                description={
                  caution
                    ? `Caution ${d.personneMorale ? "personne morale" : "personne physique"}${d.garantDe ? ` de ${nomDossier(d.garantDe)}` : ""}`
                    : d.situation
                      ? SITUATIONS[d.situation]
                      : "Situation non renseignée"
                }
                actions={
                  <div className="flex flex-wrap items-center gap-2">
                    {d.complet && a.complet ? <Badge ton="vert">Dossier validé</Badge> : <Badge ton="orange">Dossier en cours</Badge>}
                    {caution && <Badge ton="violet">Caution</Badge>}
                  </div>
                }
              />
              <CardBody className="flex flex-col gap-4">
                <Infos
                  items={[
                    { label: "Email", valeur: d.email ?? "—" },
                    { label: "Téléphone", valeur: d.telephone ?? "—" },
                    { label: "Adresse actuelle", valeur: d.adresse ? adresseSurUneLigne({ adresse: d.adresse, codePostal: d.codePostal ?? "", ville: d.ville ?? "" }) : "—" },
                    { label: "Né(e) le", valeur: d.dateNaissance ? formatDate(d.dateNaissance) : "—" },
                    { label: "Employeur", valeur: d.employeur ?? "—" },
                    { label: "Poste ou activité", valeur: d.poste ?? "—" },
                    { label: "Revenu mensuel net", valeur: d.revenuMensuel !== null ? formatEuros(d.revenuMensuel) : "—" },
                    { label: "Autres revenus", valeur: d.autresRevenus ? `${formatEuros(d.autresRevenus)}${d.detailAutresRevenus ? ` · ${d.detailAutresRevenus}` : ""}` : "—" },
                  ]}
                  colonnes={2}
                />

                <div>
                  <h3 className="mb-2 text-sm font-bold text-navy-900">Justificatifs</h3>
                  {d.pieces.length === 0 ? (
                    <p className="text-sm text-slate-500">Aucun justificatif déposé{a.manquantes.length > 0 ? ` · attendus : ${a.manquantes.map((m) => CATEGORIES_PIECE[m].toLowerCase()).join(", ")}` : ""}.</p>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {ORDRE_CATEGORIES.filter((cat) => d.pieces.some((p) => p.categorie === cat)).map((cat) => (
                        <div key={cat}>
                          <p className="mb-1.5 text-xs font-semibold uppercase tracking-[.04em] text-slate-500">{CATEGORIES_PIECE[cat]}</p>
                          <ul className="flex flex-col gap-2">
                            {d.pieces
                              .filter((p) => p.categorie === cat)
                              .map((p) => (
                                <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2">
                                  <div className="min-w-0">
                                    <a href={`/api/candidatures/pieces/${p.id}`} target="_blank" rel="noreferrer" className="text-sm font-medium text-navy-900 underline-offset-2 hover:underline">
                                      {libellePiece(p.code)}
                                    </a>
                                    <p className="text-xs text-slate-500">
                                      {p.nomFichier} · {formatTaille(p.taille)} · déposé le {formatDate(p.createdAt)}
                                    </p>
                                    {p.statut === "REFUSEE" && p.motifRefus && <p className="mt-1 text-xs text-red-600">À remplacer : {p.motifRefus}</p>}
                                  </div>
                                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                                    <Badge ton={TONS_PIECE[p.statut]}>{STATUTS_PIECE[p.statut]}</Badge>
                                    {!decidee && p.statut !== "VALIDEE" && (
                                      <form action={statuerPiece}>
                                        <input type="hidden" name="id" value={p.id} />
                                        <input type="hidden" name="decision" value="VALIDEE" />
                                        <Button type="submit" variante="ghost" taille="sm">Valider</Button>
                                      </form>
                                    )}
                                    {!decidee && p.statut !== "REFUSEE" && (
                                      <ActionDialogue
                                        action={statuerPiece}
                                        libelle="À remplacer"
                                        variante="ghost"
                                        taille="sm"
                                        titre="Demander le remplacement de cette pièce ?"
                                        description="Le candidat verra la demande dans son espace et pourra déposer un autre document."
                                        caches={{ id: String(p.id), decision: "REFUSEE" }}
                                        libelleConfirmer="Demander le remplacement"
                                      >
                                        <Field label="Motif" name="motifRefus">
                                          <Input name="motifRefus" placeholder="ex. Document illisible, avis incomplet" maxLength={300} />
                                        </Field>
                                      </ActionDialogue>
                                    )}
                                    {!decidee && (
                                      <ConfirmForm action={supprimerPiece} titre="Supprimer cette pièce ?" message="Le fichier sera définitivement supprimé du dossier." libelleConfirmer="Supprimer">
                                        <input type="hidden" name="id" value={p.id} />
                                        <Button type="submit" variante="ghost" taille="sm">Supprimer</Button>
                                      </ConfirmForm>
                                    )}
                                  </div>
                                </li>
                              ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="border-t border-slate-100 pt-3.5">
                  <p className="mb-1.5 text-xs font-semibold uppercase tracking-[.04em] text-slate-500">Accès au dossier</p>
                  {lien ? (
                    <>
                      <div className="flex gap-2">
                        <input readOnly value={lien} aria-label="Lien du dossier" className="h-10 min-w-0 flex-1 rounded-lg border border-slate-300 bg-slate-50 px-3 font-mono text-xs text-navy-900" />
                        <BoutonCopier texte={lien} />
                      </div>
                      <p className="mt-1.5 text-xs text-slate-500">
                        Créé le {formatDateHeure(d.accesCreeLe)} · {d.accesEnvoyeLe ? `envoyé le ${formatDateHeure(d.accesEnvoyeLe)}` : "jamais envoyé"} · {d.accesDernierLe ? `dernière visite le ${formatDateHeure(d.accesDernierLe)}` : "aucune visite"}
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-slate-500">Aucun accès actif pour ce dossier.</p>
                  )}
                  <div className="mt-2.5 flex flex-wrap gap-2">
                    {lien && (
                      <form action={envoyerAcces}>
                        <input type="hidden" name="id" value={d.id} />
                        <Button type="submit" taille="sm" disabled={!d.email || !mail}>{d.accesEnvoyeLe ? "Renvoyer le lien" : "Envoyer le lien par email"}</Button>
                      </form>
                    )}
                    <ConfirmForm action={renouvelerAcces} titre="Créer un nouveau lien ?" message="Le lien actuel cessera de fonctionner immédiatement." libelleConfirmer="Créer un nouveau lien">
                      <input type="hidden" name="id" value={d.id} />
                      <Button type="submit" variante="secondary" taille="sm">{lien ? "Renouveler le lien" : "Créer un accès"}</Button>
                    </ConfirmForm>
                    {lien && (
                      <ConfirmForm action={revoquerAcces} titre="Révoquer l'accès ?" message="La personne ne pourra plus ouvrir son dossier." libelleConfirmer="Révoquer">
                        <input type="hidden" name="id" value={d.id} />
                        <Button type="submit" variante="danger" taille="sm">Révoquer</Button>
                      </ConfirmForm>
                    )}
                    {(d.role === "GARANT" || candidats.length > 1) && (
                      <ConfirmForm action={supprimerDossier} titre="Supprimer ce dossier ?" message="Le dossier et les justificatifs déposés seront définitivement supprimés." libelleConfirmer="Supprimer le dossier">
                        <input type="hidden" name="id" value={d.id} />
                        <Button type="submit" variante="ghost" taille="sm">Supprimer ce dossier</Button>
                      </ConfirmForm>
                    )}
                  </div>
                  {lien && (!d.email || !mail) && (
                    <p className="mt-1.5 text-xs text-amber-700">{!d.email ? "Sans adresse email, copiez le lien et transmettez-le vous-même." : "L'envoi d'emails n'est pas configuré (Paramètres) : copiez le lien."}</p>
                  )}
                </div>
              </CardBody>
            </Card>
          );
        })}

        {!decidee && (
          <Card>
            <CardHeader titre="Ajouter un colocataire" description="Chaque colocataire candidat complète son propre dossier avec son propre lien." />
            <CardBody>
              <AjoutCandidatForm action={ajouterCandidat.bind(null, c.id)} />
            </CardBody>
          </Card>
        )}

        <Card>
          <CardHeader titre="Décision" description={close ? "Le bail est signé : la candidature est close." : "Le candidat est informé par email si vous le demandez."} />
          <CardBody className="flex flex-col gap-3">
            {c.statut === "BROUILLON" && (
              <Alerte ton="bleu">
                La candidature n&apos;a pas encore été transmise : envoyez son lien au candidat, ou marquez-la transmise si vous le lui avez remis autrement.
                <div className="mt-3">
                  <form action={marquerTransmise}>
                    <input type="hidden" name="id" value={c.id} />
                    <Button type="submit" variante="secondary" taille="sm">Marquer comme transmise</Button>
                  </form>
                </div>
              </Alerte>
            )}
            {c.statut === "DEPOSEE" && <Alerte ton="bleu">Le candidat a remis son dossier le {formatDate(c.deposeLe)} : il est à l&apos;étude.</Alerte>}
            <div className="flex flex-wrap gap-2">
              {!decidee && (
                <>
                  <ActionDialogue
                    action={accepterCandidature}
                    libelle="Retenir cette candidature"
                    titre="Retenir cette candidature ?"
                    description="Vous pourrez ensuite créer le locataire et préparer son bail."
                    caches={{ id: String(c.id) }}
                    libelleConfirmer="Retenir la candidature"
                  >
                    <Checkbox name="prevenir" label="Prévenir le candidat par email" defaultChecked={mail} disabled={!mail} />
                  </ActionDialogue>
                  <ActionDialogue
                    action={refuserCandidature}
                    libelle="Ne pas retenir"
                    variante="danger"
                    titre="Ne pas retenir cette candidature ?"
                    description="Le dossier sera classé sans suite. Pensez à détruire les pièces une fois le logement attribué."
                    caches={{ id: String(c.id) }}
                    libelleConfirmer="Ne pas retenir"
                  >
                    <Field label="Motif (facultatif)" name="motifRefus" hint="Communiqué au candidat s'il est prévenu par email.">
                      <Textarea name="motifRefus" rows={2} maxLength={500} />
                    </Field>
                    <Checkbox name="prevenir" label="Prévenir le candidat par email" defaultChecked={mail} disabled={!mail} />
                  </ActionDialogue>
                </>
              )}
              {decidee && !close && (
                <ConfirmForm action={rouvrirCandidature} titre="Rouvrir la candidature ?" message="Elle repassera à l'étude et le candidat pourra de nouveau compléter son dossier." libelleConfirmer="Rouvrir">
                  <input type="hidden" name="id" value={c.id} />
                  <Button type="submit" variante="secondary">Revenir sur la décision</Button>
                </ConfirmForm>
              )}
              {c.statut === "ACCEPTEE" && (
                <form action={preparerBailDepuisCandidature}>
                  <input type="hidden" name="id" value={c.id} />
                  <Button type="submit">Préparer le bail</Button>
                </form>
              )}
              {c.statut === "CONCLUE" && c.bail && <ButtonLink href={`/baux/${c.bail.id}`} variante="secondary">Voir le bail</ButtonLink>}
              {candidats.some((d) => d.locataireId) && (
                <ButtonLink href={`/locataires/${candidats.find((d) => d.locataireId)!.locataireId}`} variante="ghost">Voir la fiche locataire</ButtonLink>
              )}
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader titre="Le logement et la garantie" description={c.typeGarantie ? TYPES_GARANTIE[c.typeGarantie] : "Garantie non précisée"} />
          <CardBody>
            <CandidatureForm action={modifierCandidature.bind(null, c.id)} lots={lots} initial={c} annulerHref={`/candidatures/${c.id}`} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader titre="Conservation des données" description="Les pièces d'un candidat non retenu n'ont pas à être conservées une fois le logement attribué." />
          <CardBody>
            <ConfirmForm
              action={supprimerCandidature}
              titre="Détruire ce dossier ?"
              message="La candidature, les dossiers des candidats et des cautions et tous les justificatifs déposés seront définitivement supprimés. Cette action est irréversible."
              libelleConfirmer="Détruire le dossier"
            >
              <input type="hidden" name="id" value={c.id} />
              <Button type="submit" variante="danger">Détruire le dossier et ses pièces</Button>
            </ConfirmForm>
          </CardBody>
        </Card>
      </div>
    </>
  );
}
