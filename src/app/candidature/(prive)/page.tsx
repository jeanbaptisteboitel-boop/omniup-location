import { prisma } from "@/lib/prisma";
import type { SearchParams } from "@/lib/params";
import { exigerDossier } from "@/lib/candidat";
import { dossierModifiable } from "@/lib/candidat";
import { avancementDossier, candidatureDeposable, CATEGORIES_PIECE, loyerCharges, nomDossier, SITUATIONS, STATUTS_CANDIDATURE, TONS_CANDIDATURE } from "@/lib/candidatures";
import { adresseSurUneLigne } from "@/lib/libelles";
import { formatDate } from "@/lib/dates";
import { formatEuros, formatNombre } from "@/lib/montants";
import { EtiquetteDpe } from "@/components/patrimoine/etiquette-dpe";
import { declarerDossierComplet, deposerCandidature, retirerCandidature, rouvrirDossier } from "@/actions/candidat";
import { Alerte, Badge, Button, ButtonLink, Card, CardBody, CardHeader, Infos, PageHeader, Stepper } from "@/components/ui";
import { ConfirmForm } from "@/components/confirm-form";
import { Flash } from "@/components/flash";

export const metadata = { title: "Mon dossier de candidature" };
export const dynamic = "force-dynamic";

export default async function CandidaturePage({ searchParams }: { searchParams: SearchParams }) {
  const d = await exigerDossier();
  const sp = await searchParams;
  const caution = d.role === "GARANT";
  const c = d.candidature;
  const avancement = avancementDossier(d, d.pieces);
  const modifiable = dossierModifiable(c.statut);

  // Le candidat voit l'avancement des dossiers de ses cautions, qui conditionne la remise.
  const autres = caution ? [] : await prisma.dossierCandidature.findMany({ where: { candidatureId: c.id, id: { not: d.id } }, include: { pieces: true } });
  const etatsAutres = autres.map((a) => ({ dossier: a, avancement: avancementDossier(a, a.pieces), valide: a.complet }));
  const tousComplets = candidatureDeposable([
    { role: d.role, complet: avancement.complet && d.complet },
    ...etatsAutres.map((e) => ({ role: e.dossier.role, complet: e.avancement.complet && e.valide })),
  ]);

  const etapes = caution ? ["Mes informations", "Mes justificatifs", "Dossier validé"] : ["Mes informations", "Mes justificatifs", "Ma caution", "Remise du dossier"];
  const remis = c.statut === "DEPOSEE" || c.statut === "ACCEPTEE" || c.statut === "CONCLUE";
  const courant = !avancement.informations ? 0 : !avancement.justificatifs ? 1 : caution ? (d.complet ? 2 : 1) : !d.complet ? 2 : remis ? 3 : 2;

  const loyer = loyerCharges(c);
  return (
    <>
      <PageHeader
        titre={caution ? "Mon dossier de caution" : "Mon dossier de candidature"}
        sousTitre={c.lot ? `${c.lot.nom} · ${adresseSurUneLigne(c.lot)}` : "Logement à préciser par le bailleur"}
        actions={<Badge ton={TONS_CANDIDATURE[c.statut]}>{STATUTS_CANDIDATURE[c.statut]}</Badge>}
      />
      <Flash sp={sp} />

      {c.statut === "ACCEPTEE" && (
        <Alerte ton="vert" titre="Votre candidature est retenue" className="mb-5">
          Le bailleur vous recontacte pour la signature du bail et l&apos;état des lieux d&apos;entrée.
        </Alerte>
      )}
      {c.statut === "CONCLUE" && (
        <Alerte ton="vert" titre="Bail signé" className="mb-5">
          Vous êtes désormais locataire de ce logement. Votre bailleur vous donne accès à votre espace locataire pour y retrouver votre bail, vos avis d&apos;échéance et vos quittances.
        </Alerte>
      )}
      {c.statut === "REFUSEE" && (
        <Alerte ton="orange" titre="Candidature non retenue" className="mb-5">
          {c.motifRefus ? `Motif indiqué par le bailleur : ${c.motifRefus}` : "Le bailleur n'a pas retenu votre dossier."} Les pièces déposées seront détruites une fois le logement attribué.
        </Alerte>
      )}
      {c.statut === "RETIREE" && <Alerte ton="orange" className="mb-5">Cette candidature a été retirée.</Alerte>}
      {c.statut === "DEPOSEE" && <Alerte ton="bleu" titre="Dossier remis au bailleur" className="mb-5">Votre dossier est à l&apos;étude. Si une pièce doit être remplacée, elle apparaîtra à remplacer dans « Mes justificatifs ».</Alerte>}

      <Stepper etapes={etapes} courant={courant} className="mb-6" />

      <div className="flex flex-col gap-5">
        <Card>
          <CardHeader
            titre="Le logement"
            description={caution ? "Logement pour lequel votre caution est demandée." : "Logement pour lequel vous candidatez."}
          />
          <CardBody>
            <Infos
              items={[
                { label: "Logement", valeur: c.lot ? c.lot.nom : "À préciser" },
                { label: "Adresse", valeur: c.lot ? adresseSurUneLigne(c.lot) : "—" },
                { label: "Loyer charges comprises", valeur: loyer > 0 ? `${formatEuros(loyer)} par mois` : "À préciser" },
                { label: "Entrée souhaitée", valeur: c.dateSouhaitee ? formatDate(c.dateSouhaitee) : "À convenir" },
                {
                  label: "Performance énergétique",
                  valeur: c.lot?.dpeClasseEnergie ? (
                    <span className="flex flex-wrap items-center gap-2">
                      <EtiquetteDpe classe={c.lot.dpeClasseEnergie} taille="sm" />
                      {c.lot.dpeClasseGes && <EtiquetteDpe classe={c.lot.dpeClasseGes} type="climat" taille="sm" />}
                      {c.lot.dpeConsommation !== null && <span className="text-slate-600">{formatNombre(c.lot.dpeConsommation)} kWh/m²/an</span>}
                    </span>
                  ) : (
                    "Diagnostic non communiqué"
                  ),
                },
              ]}
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            titre="Mes informations"
            description="Identité, coordonnées, situation professionnelle et revenus."
            actions={avancement.informations ? <Badge ton="vert">Complètes</Badge> : <Badge ton="orange">À compléter</Badge>}
          />
          <CardBody>
            <Infos
              items={[
                { label: "Nom", valeur: nomDossier(d) },
                { label: "Situation", valeur: d.situation ? SITUATIONS[d.situation] : d.personneMorale ? "Personne morale" : "À préciser" },
                { label: "Revenu mensuel net", valeur: d.revenuMensuel !== null ? formatEuros(d.revenuMensuel) : "À préciser" },
                { label: "Autres revenus", valeur: d.autresRevenus ? formatEuros(d.autresRevenus) : "Aucun" },
              ]}
            />
            {modifiable && !d.complet && (
              <div className="mt-4">
                <ButtonLink href="/candidature/informations" variante={avancement.informations ? "secondary" : "primary"}>
                  {avancement.informations ? "Modifier mes informations" : "Compléter mes informations"}
                </ButtonLink>
              </div>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            titre="Mes justificatifs"
            description="Seules les pièces autorisées par le décret du 5 novembre 2015 vous sont demandées."
            actions={avancement.justificatifs ? <Badge ton="vert">Complets</Badge> : <Badge ton="orange">{avancement.manquantes.length} catégorie(s) à compléter</Badge>}
          />
          <CardBody>
            {avancement.manquantes.length > 0 ? (
              <p className="text-sm text-slate-600">
                Il manque : {avancement.manquantes.map((m) => CATEGORIES_PIECE[m].toLowerCase()).join(", ")}.
              </p>
            ) : (
              <p className="text-sm text-slate-600">{d.pieces.length} justificatif(s) déposé(s).</p>
            )}
            {d.pieces.some((p) => p.statut === "REFUSEE") && (
              <Alerte ton="orange" className="mt-3">Une ou plusieurs pièces sont à remplacer : le bailleur a indiqué pourquoi dans « Mes justificatifs ».</Alerte>
            )}
            {modifiable && !d.complet && (
              <div className="mt-4">
                <ButtonLink href="/candidature/justificatifs" variante={avancement.justificatifs ? "secondary" : "primary"}>
                  {avancement.justificatifs ? "Voir mes justificatifs" : "Déposer mes justificatifs"}
                </ButtonLink>
              </div>
            )}
          </CardBody>
        </Card>

        {!caution && (
          <Card>
            <CardHeader
              titre="Ma caution"
              description="Une personne ou un organisme qui s'engage à payer le loyer si vous ne pouvez pas le faire."
              actions={etatsAutres.length > 0 ? <Badge ton={etatsAutres.every((e) => e.avancement.complet && e.valide) ? "vert" : "orange"}>{etatsAutres.length} dossier(s)</Badge> : <Badge ton="gris">Aucune</Badge>}
            />
            <CardBody>
              {etatsAutres.length === 0 ? (
                <p className="text-sm text-slate-600">Vous n&apos;avez déclaré aucune caution. Si le bailleur en demande une, ajoutez-la : elle recevra son propre lien pour déposer ses justificatifs.</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {etatsAutres.map((e) => (
                    <li key={e.dossier.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                      <span className="text-navy-900">
                        {nomDossier(e.dossier)} <span className="text-slate-500">· {e.dossier.role === "GARANT" ? "caution" : "colocataire"}</span>
                      </span>
                      {e.avancement.complet && e.valide ? <Badge ton="vert">Dossier validé</Badge> : <Badge ton="orange">En cours</Badge>}
                    </li>
                  ))}
                </ul>
              )}
              {modifiable && !d.complet && (
                <div className="mt-4">
                  <ButtonLink href="/candidature/cautions" variante="secondary">Gérer ma caution</ButtonLink>
                </div>
              )}
            </CardBody>
          </Card>
        )}

        <Card>
          <CardHeader titre={caution ? "Valider mon dossier" : "Remettre ma candidature"} description={caution ? "Une fois validé, le candidat peut remettre la candidature au bailleur." : "Le bailleur n'étudie votre dossier qu'une fois remis."} />
          <CardBody>
            {!modifiable ? (
              <p className="text-sm text-slate-600">Ce dossier n&apos;est plus modifiable.</p>
            ) : !d.complet ? (
              <div className="flex flex-col gap-3">
                <p className="text-sm text-slate-600">
                  {avancement.complet
                    ? "Vos informations et vos justificatifs sont complets : validez votre dossier."
                    : "Complétez vos informations et vos justificatifs pour pouvoir valider votre dossier."}
                </p>
                <form action={declarerDossierComplet}>
                  <Button type="submit" disabled={!avancement.complet}>Valider mon dossier</Button>
                </form>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <Alerte ton="vert">Votre dossier est validé.</Alerte>
                {!caution && c.statut !== "DEPOSEE" && c.statut !== "ACCEPTEE" && c.statut !== "REFUSEE" && (
                  <>
                    {!tousComplets && <p className="text-sm text-slate-600">La remise attend que le dossier de votre caution soit validé lui aussi.</p>}
                    <ConfirmForm
                      action={deposerCandidature}
                      titre="Remettre la candidature ?"
                      message="Le bailleur recevra votre dossier et l'étudiera. Vous pourrez encore remplacer une pièce s'il en refuse une."
                      libelleConfirmer="Remettre ma candidature"
                    >
                      <Button type="submit" disabled={!tousComplets}>Remettre ma candidature au bailleur</Button>
                    </ConfirmForm>
                  </>
                )}
                <form action={rouvrirDossier}>
                  <Button type="submit" variante="ghost" taille="sm">Modifier encore mon dossier</Button>
                </form>
              </div>
            )}
            {!caution && modifiable && c.statut !== "RETIREE" && (
              <div className="mt-5 border-t border-slate-100 pt-4">
                <ConfirmForm
                  action={retirerCandidature}
                  titre="Retirer votre candidature ?"
                  message="Le bailleur sera informé que vous ne candidatez plus pour ce logement."
                  libelleConfirmer="Retirer ma candidature"
                >
                  <Button type="submit" variante="ghost" taille="sm">Je ne candidate plus pour ce logement</Button>
                </ConfirmForm>
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </>
  );
}
