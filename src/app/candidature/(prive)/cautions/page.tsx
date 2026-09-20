import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import type { SearchParams } from "@/lib/params";
import { dossierModifiable, exigerDossier, lienCandidature } from "@/lib/candidat";
import { origineApplication } from "@/lib/espace";
import { avancementDossier, couvertureGarant, cumulGarantieInterdit, loyerCharges, nomDossier, TYPES_GARANTIE } from "@/lib/candidatures";
import { revenuTotal } from "@/lib/candidatures";
import { formatEuros, formatNombre } from "@/lib/montants";
import { ajouterCaution, retirerCaution } from "@/actions/candidat";
import { Alerte, Badge, Button, Card, CardBody, CardHeader, EmptyState, PageHeader } from "@/components/ui";
import { ConfirmForm } from "@/components/confirm-form";
import { Flash } from "@/components/flash";
import { BoutonCopier } from "@/components/locataires/bouton-copier";
import { CautionForm } from "@/components/candidatures/caution-form";

export const metadata = { title: "Ma caution" };
export const dynamic = "force-dynamic";

export default async function CautionsPage({ searchParams }: { searchParams: SearchParams }) {
  const d = await exigerDossier();
  if (d.role === "GARANT") redirect("/candidature");
  const sp = await searchParams;
  const modifiable = dossierModifiable(d.candidature.statut) && !d.complet;

  const cautions = await prisma.dossierCandidature.findMany({ where: { garantDeId: d.id, role: "GARANT" }, include: { pieces: true }, orderBy: { createdAt: "asc" } });
  const origine = await origineApplication();
  const loyerCC = loyerCharges(d.candidature);
  const attendue = d.candidature.typeGarantie;
  const cumulInterdit = cumulGarantieInterdit(attendue, d.candidature.assuranceLoyersImpayes, d.situation);

  return (
    <>
      <PageHeader titre="Ma caution" sousTitre="La personne ou l'organisme qui s'engage à payer le loyer si vous ne pouvez pas le faire." retour={{ href: "/candidature", libelle: "Mon dossier" }} />
      <Flash sp={sp} />

      {attendue && attendue !== "AUCUNE" && (
        <Alerte ton="bleu" titre="Garantie demandée par le bailleur" className="mb-5">
          {TYPES_GARANTIE[attendue]}
          {attendue === "VISALE" && " — la garantie Visale est gratuite et se demande directement auprès d'Action Logement ; déposez votre visa dans vos justificatifs de ressources."}
        </Alerte>
      )}
      {cumulInterdit && (
        <Alerte ton="orange" titre="Cumul interdit" className="mb-5">
          Le bailleur a souscrit une assurance contre les loyers impayés : il ne peut pas exiger en plus une caution, sauf si vous êtes étudiant ou apprenti (article 22-1 de la loi du 6 juillet 1989).
        </Alerte>
      )}

      <div className="flex flex-col gap-5">
        {cautions.length === 0 ? (
          <EmptyState titre="Aucune caution déclarée" description="Si le bailleur en demande une, déclarez-la ci-dessous : elle recevra son propre lien pour renseigner ses informations et déposer ses justificatifs." />
        ) : (
          cautions.map((caution) => {
            const a = avancementDossier(caution, caution.pieces);
            const lien = caution.accesJeton ? lienCandidature(origine, caution.accesJeton) : null;
            const couverture = couvertureGarant(revenuTotal(caution), loyerCC);
            return (
              <Card key={caution.id}>
                <CardHeader
                  titre={nomDossier(caution)}
                  description={caution.personneMorale ? "Caution personne morale" : "Caution personne physique"}
                  actions={a.complet && caution.complet ? <Badge ton="vert">Dossier validé</Badge> : <Badge ton="orange">Dossier en cours</Badge>}
                />
                <CardBody className="flex flex-col gap-3">
                  <p className="text-sm text-slate-600">
                    {caution.email} · {caution.revenuMensuel !== null ? `revenus déclarés ${formatEuros(revenuTotal(caution))} par mois` : "revenus non renseignés"}
                    {couverture !== null && ` · ${formatNombre(couverture, 1)} fois le loyer charges comprises`}
                  </p>
                  {!a.complet && <p className="text-[13px] text-amber-700">Il manque : {!a.informations ? "ses informations" : ""}{!a.informations && !a.justificatifs ? " et " : ""}{!a.justificatifs ? "ses justificatifs" : ""}.</p>}
                  {lien && (
                    <div>
                      <p className="mb-1.5 text-xs font-semibold uppercase tracking-[.04em] text-slate-500">Lien personnel de la caution</p>
                      <div className="flex gap-2">
                        <input readOnly value={lien} aria-label="Lien de la caution" className="h-10 min-w-0 flex-1 rounded-lg border border-slate-300 bg-slate-50 px-3 font-mono text-xs text-navy-900" />
                        <BoutonCopier texte={lien} />
                      </div>
                      <p className="mt-1.5 text-xs text-slate-500">Transmettez-lui ce lien : elle complète son dossier de son côté, vous n&apos;avez pas accès à ses pièces.</p>
                    </div>
                  )}
                  {modifiable && (
                    <div>
                      <ConfirmForm action={retirerCaution} titre="Retirer cette caution ?" message="Son dossier et les justificatifs qu'elle a déposés seront supprimés." libelleConfirmer="Retirer la caution">
                        <input type="hidden" name="id" value={caution.id} />
                        <Button type="submit" variante="ghost" taille="sm">Retirer cette caution</Button>
                      </ConfirmForm>
                    </div>
                  )}
                </CardBody>
              </Card>
            );
          })
        )}

        {modifiable && (
          <Card>
            <CardHeader
              titre="Déclarer une caution"
              description="Le bailleur ne peut pas refuser une caution au motif qu'elle n'a pas la nationalité française ou qu'elle ne réside pas en France métropolitaine (article 22-1)."
            />
            <CardBody>
              <CautionForm action={ajouterCaution} />
            </CardBody>
          </Card>
        )}
      </div>
    </>
  );
}
