import Link from "next/link";
import { notFound } from "next/navigation";
import { idDepuis, type ParamsId, type SearchParams } from "@/lib/params";
import { MODES_PAIEMENT, TYPES_BAIL_COURT, nomComplet } from "@/lib/libelles";
import { aujourdhui, formatDate, formatDateHeure, formatPeriode, toISODate } from "@/lib/dates";
import { formatEuros } from "@/lib/montants";
import { etatAppel, numeroAppel, numeroQuittance } from "@/lib/loyers";
import { chargerAppel } from "@/lib/pdf/donnees";
import { mailConfigure } from "@/lib/mail";
import { iaConfiguree } from "@/lib/ia-config";
import { emailAvis, emailQuittance } from "@/lib/mail-modeles";
import { enregistrerPaiement, envoyerAvis, envoyerQuittance, marquerAvisEnvoye, marquerQuittanceEnvoyee, supprimerPaiement } from "@/actions/loyers";
import { genererEmail } from "@/actions/ia";
import { Button, ButtonLink, Card, CardHeader, IconButton, PageHeader } from "@/components/ui";
import { IconeCocheCercle, IconeDepenses, IconeEnvoyer, IconeFichier, IconeSupprimer } from "@/components/icones";
import { ConfirmForm } from "@/components/confirm-form";
import { Flash } from "@/components/flash";
import { BadgeStatutAppel } from "@/components/loyers/badge-statut";
import { BoutonEnvoi } from "@/components/loyers/bouton-envoi";
import { EtatAvis, EtatQuittance } from "@/components/loyers/etat-envoi";
import { PaiementForm } from "@/components/loyers/paiement-form";
import { EnvoiEmail } from "@/components/envoi-email";
import { entiteCouranteId } from "@/lib/entite";

const LIGNE = "px-5 py-2.5 text-slate-600";
const MONTANT = "px-5 py-2.5 text-right tabular-nums";
const ENTETE = "py-2 text-xs font-semibold uppercase tracking-[.04em] text-slate-500";

export default async function AppelPage({ params, searchParams }: { params: ParamsId; searchParams: SearchParams }) {
  const id = await idDepuis(params);
  const sp = await searchParams;
  const a = await chargerAppel(id);
  if (!a || a.bail.entiteId !== (await entiteCouranteId())) notFound();
  const auj = aujourdhui();
  const etat = etatAppel(a, auj);
  const { bail } = a;
  const integral = etat.statut === "PAYE";
  const modeleAvis = emailAvis(a);
  const modeleQuittance = emailQuittance(a, integral);
  const smtp = mailConfigure();
  const ia = iaConfiguree();
  const finBail = bail.dateFinEffective ?? bail.dateFin;
  // Sans email configuré (ou sans adresse du locataire), le bloc d'envoi n'affiche qu'une alerte : on ne la répète pas pour la quittance.
  const envoiPossible = smtp && !!bail.locataire.email;
  const blocQuittance = a.paiements.length > 0 && envoiPossible;
  const cibleEnvoi = integral && blocQuittance ? "envoi-quittance" : "envoi-avis";

  return (
    <>
      <PageHeader
        retour={{ href: "/loyers", libelle: "Loyers et quittances" }}
        titre={`Loyer de ${formatPeriode(a.periode).toLowerCase()}`}
        badge={<BadgeStatutAppel statut={etat.statut} />}
        sousTitre={
          <>
            {bail.lot.nom} · <Link href={`/locataires/${bail.locataire.id}`} className="hover:text-navy-800 hover:underline">{nomComplet(bail.locataire)}</Link> · échéance le {formatDate(a.dateEcheance)}
          </>
        }
        actions={
          <>
            <ButtonLink href={`/api/loyers/${a.id}/avis.pdf`} variante="secondary" target="_blank" title="Ouvrir l'avis d'échéance (PDF)">
              <IconeFichier taille={16} />Avis PDF
            </ButtonLink>
            {integral ? (
              <ButtonLink href={`/api/loyers/${a.id}/quittance.pdf`} variante="secondary" target="_blank" title="Télécharger la quittance">
                <IconeDepenses taille={16} />Quittance PDF
              </ButtonLink>
            ) : (
              <span aria-disabled="true" title="La quittance est disponible une fois le loyer intégralement payé" className="inline-flex h-10 cursor-not-allowed select-none items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-navy-900 opacity-50">
                <IconeDepenses taille={16} />Quittance PDF
              </span>
            )}
            <BoutonEnvoi cible={cibleEnvoi}>
              <IconeEnvoyer taille={16} />
              {integral ? "Envoyer la quittance" : a.dateEnvoiAvis ? "Renvoyer l'avis" : "Envoyer l'avis par email"}
            </BoutonEnvoi>
          </>
        }
      />
      <Flash sp={sp} />

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
        {/* Colonne gauche : détail de l'appel et suivi */}
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader titre="Détail de l'appel" description={`${numeroAppel(a.id)} · émis le ${formatDate(a.dateEmission)} · du ${formatDate(a.debutPeriode)} au ${formatDate(a.finPeriode)}`} />
            <table className="w-full text-sm">
              <tbody>
                <tr>
                  <td className={LIGNE}>Loyer hors charges</td>
                  <td className={MONTANT}>{formatEuros(a.loyer)}</td>
                </tr>
                <tr className="border-t border-slate-100">
                  <td className={LIGNE}>{bail.chargesForfait ? "Charges (forfait)" : "Provision sur charges"}</td>
                  <td className={MONTANT}>{formatEuros(a.charges)}</td>
                </tr>
                {a.prorata && (
                  <tr className="border-t border-slate-100">
                    <td className={LIGNE}>Prorata</td>
                    <td className="px-5 py-2.5 text-right text-slate-600">du {formatDate(a.debutPeriode)} au {formatDate(a.finPeriode)}</td>
                  </tr>
                )}
                <tr className="border-t-2 border-slate-200 bg-slate-50">
                  <td className="px-5 py-3 font-bold text-navy-900">Total appelé</td>
                  <td className="px-5 py-3 text-right text-base font-bold tabular-nums">{formatEuros(a.total)}</td>
                </tr>
                <tr className="border-t border-slate-100">
                  <td className={LIGNE}>Réglé</td>
                  <td className={`${MONTANT} font-semibold text-emerald-800`}>{formatEuros(etat.regle)}</td>
                </tr>
                <tr className="border-t border-slate-100">
                  <td className={LIGNE}>Reste à percevoir</td>
                  <td className={`${MONTANT} font-semibold ${etat.reste > 0 ? "text-red-700" : "text-emerald-800"}`}>{formatEuros(Math.max(0, etat.reste))}</td>
                </tr>
              </tbody>
            </table>
          </Card>

          <Card>
            <CardHeader titre="Suivi" />
            <ul className="flex flex-col gap-2.5 px-5 pb-4 pt-2 text-sm">
              <li className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                <span className="text-slate-600">Avis d'échéance</span>
                <span className="flex items-center gap-2">
                  <EtatAvis date={a.dateEnvoiAvis} />
                  <form action={marquerAvisEnvoye}>
                    <input type="hidden" name="id" value={a.id} />
                    <Button type="submit" taille="sm" variante="ghost" title={a.dateEnvoiAvis ? "Annuler la mention d'envoi" : "Avis remis en main propre ou envoyé par courrier"}>{a.dateEnvoiAvis ? "Marquer non envoyé" : "Marquer envoyé"}</Button>
                  </form>
                </span>
              </li>
              <li className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                <span className="text-slate-600">Quittance{integral ? ` ${numeroQuittance(a.id)}` : ""}</span>
                <span className="flex items-center gap-2">
                  <EtatQuittance date={a.dateEnvoiQuittance} paye={integral} />
                  {integral && (
                    <form action={marquerQuittanceEnvoyee}>
                      <input type="hidden" name="id" value={a.id} />
                      <Button type="submit" taille="sm" variante="ghost" title={a.dateEnvoiQuittance ? "Annuler la mention d'envoi" : "Quittance remise en main propre ou envoyée par courrier"}>{a.dateEnvoiQuittance ? "Marquer non envoyée" : "Marquer remise"}</Button>
                    </form>
                  )}
                </span>
              </li>
              <li className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                <span className="text-slate-600">Bail</span>
                <Link href={`/baux/${bail.id}`} className="font-semibold text-navy-800 hover:text-brand-cyan-dark">
                  {TYPES_BAIL_COURT[bail.type]} · du {formatDate(bail.dateDebut)} au {formatDate(finBail)}
                </Link>
              </li>
              {etat.statut === "EN_RETARD" && (
                <li className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                  <span className="text-slate-600">Relance</span>
                  <Link href={`/baux/${bail.id}/courriers/nouveau?type=RELANCE`} className="font-semibold text-navy-800 hover:text-brand-cyan-dark">Rédiger une relance</Link>
                </li>
              )}
            </ul>
          </Card>
        </div>

        {/* Colonne droite : paiements */}
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader titre="Paiements enregistrés" />
            {a.paiements.length === 0 ? (
              <p className="px-5 py-5 text-center text-sm text-slate-500">Aucun paiement enregistré pour cette échéance.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th scope="col" className={`${ENTETE} px-5 text-left`}>Date</th>
                      <th scope="col" className={`${ENTETE} px-4 text-left`}>Mode</th>
                      <th scope="col" className={`${ENTETE} px-4 text-right`}>Montant</th>
                      <th scope="col" className={ENTETE} />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {a.paiements.map((p) => (
                      <tr key={p.id}>
                        <td className="px-5 py-2.5 tabular-nums">{formatDate(p.date)}</td>
                        <td className="px-4 py-2.5 text-slate-600">
                          {MODES_PAIEMENT[p.mode]}
                          {p.reference && <span className="block text-xs text-slate-500">{p.reference}</span>}
                        </td>
                        <td className="px-4 py-2.5 text-right font-semibold tabular-nums">{formatEuros(p.montant)}</td>
                        <td className="px-3 py-1.5 text-right">
                          <ConfirmForm action={supprimerPaiement} titre="Supprimer ce paiement ?" message={`Le paiement de ${formatEuros(p.montant)} du ${formatDate(p.date)} sera retiré de l'échéance.`} libelleConfirmer="Supprimer" className="inline-block">
                            <input type="hidden" name="id" value={p.id} />
                            <IconButton type="submit" taille="sm" variante="danger" aria-label="Supprimer le paiement"><IconeSupprimer taille={14} /></IconButton>
                          </ConfirmForm>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {a.paiements.length > 0 && !integral && (
              <div className="border-t border-slate-100 px-5 py-3 text-[13px] text-slate-500">
                Paiement partiel : <a href={`/api/loyers/${a.id}/quittance.pdf`} target="_blank" rel="noopener" className="font-semibold text-navy-800 hover:text-brand-cyan-dark">reçu de paiement (PDF)</a>
              </div>
            )}
          </Card>

          {integral ? (
            <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-800">
              <IconeCocheCercle taille={20} className="shrink-0" />
              <div>
                <p className="font-bold">Loyer intégralement réglé</p>
                <p className="mt-1">
                  {a.dateEnvoiQuittance
                    ? `Quittance ${numeroQuittance(a.id)} envoyée le ${formatDateHeure(a.dateEnvoiQuittance)}${bail.locataire.email ? ` à ${bail.locataire.email}` : ""}.`
                    : `Vous pouvez générer la quittance ${numeroQuittance(a.id)} et l'envoyer au locataire.`}
                </p>
                {!a.dateEnvoiQuittance && (
                  <BoutonEnvoi cible={cibleEnvoi} className="mt-2.5 inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg bg-emerald-800 px-3.5 text-[13px] font-semibold text-white transition-colors hover:bg-emerald-900 focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-cyan">Générer et envoyer la quittance</BoutonEnvoi>
                )}
              </div>
            </div>
          ) : (
            <Card>
              <CardHeader titre="Enregistrer un paiement" />
              <PaiementForm action={enregistrerPaiement.bind(null, a.id)} dateDefaut={toISODate(auj)} reste={etat.reste} proposerQuittance={smtp && !!bail.locataire.email} />
            </Card>
          )}
        </div>
      </div>

      {/* Envois par email (avis, puis quittance ou reçu dès qu'un paiement existe) */}
      <div className="mt-6 flex flex-col gap-6">
        <div id="envoi-avis" className="scroll-mt-6">
          <EnvoiEmail
            action={envoyerAvis.bind(null, a.id)}
            actionIA={genererEmail.bind(null, bail.id)}
            destinataire={bail.locataire.email}
            objetDefaut={modeleAvis.objet}
            corpsDefaut={modeleAvis.corps}
            contexteIA={`Envoi de l'avis d'échéance ${numeroAppel(a.id)} pour ${formatPeriode(a.periode)} : ${formatEuros(a.total)} à payer avant le ${formatDate(a.dateEcheance)}.`}
            libelleBouton={a.dateEnvoiAvis ? "Renvoyer l'avis par email" : "Envoyer l'avis par email"}
            pieceJointe="l'avis d'échéance"
            mailConfigure={smtp}
            iaConfiguree={ia}
            ouvert={!a.dateEnvoiAvis && !integral}
          />
        </div>
        {blocQuittance && (
          <div id="envoi-quittance" className="scroll-mt-6">
            <EnvoiEmail
              action={envoyerQuittance.bind(null, a.id)}
              actionIA={genererEmail.bind(null, bail.id)}
              destinataire={bail.locataire.email}
              objetDefaut={modeleQuittance.objet}
              corpsDefaut={modeleQuittance.corps}
              contexteIA={`Envoi de la ${integral ? "quittance" : "reçu de paiement partiel"} pour ${formatPeriode(a.periode)} (${formatEuros(etat.regle)} reçus).`}
              libelleBouton={integral ? (a.dateEnvoiQuittance ? "Renvoyer la quittance par email" : "Envoyer la quittance par email") : "Envoyer le reçu par email"}
              pieceJointe={integral ? "la quittance" : "le reçu"}
              mailConfigure={smtp}
              iaConfiguree={ia}
              ouvert={integral && !a.dateEnvoiQuittance}
            />
          </div>
        )}
      </div>
    </>
  );
}

// Durée maximale d'exécution sur Vercel (rédaction IA, OCR, envois d'emails).
export const maxDuration = 300;
