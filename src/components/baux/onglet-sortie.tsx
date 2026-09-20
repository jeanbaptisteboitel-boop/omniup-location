import type { Bail, RetenueDepot } from "@prisma/client";
import { aujourdhui, formatDate, toISODate } from "@/lib/dates";
import { formatEuros } from "@/lib/montants";
import { MODES_PAIEMENT, ORIGINES_CONGE } from "@/lib/libelles";
import { dateLimiteRestitution, delaiRestitutionMois, etapesSortie, majorationRetard, soldeDepot } from "@/lib/sortie-bail";
import { ajouterRetenue, annulerConge, annulerDepotRecu, annulerRestitution, cloturerAuDepart, enregistrerConge, enregistrerDepotRecu, enregistrerEtatLieuxSortie, restituerDepot, supprimerRetenue } from "@/actions/sortie";
import { Alerte, Badge, Button, ButtonLink, Infos } from "@/components/ui";
import { Field, Input, SubmitButton } from "@/components/form";
import { ConfirmForm } from "@/components/confirm-form";
import { CongeForm, DepotForm, EtatLieuxForm, RestitutionForm, RetenueForm } from "@/components/baux/formulaires-sortie";

/** Onglet « Sortie » de la fiche du bail : congé, état des lieux, clôture et décompte du dépôt de garantie. */
export function OngletSortie({ bail, impayes }: { bail: Bail & { retenuesDepot: RetenueDepot[] }; impayes: number }) {
  const auj = aujourdhui();
  const solde = soldeDepot(bail, bail.retenuesDepot, impayes);
  const depart = bail.dateFinEffective ?? bail.congeDateDepart;
  const limite = depart ? dateLimiteRestitution(depart, bail.etatLieuxConforme) : null;
  const majoration = limite ? majorationRetard(solde.restituable, bail.loyerHC, limite, bail.depotRestitueLe ?? auj) : 0;
  const etapes = etapesSortie(bail);
  const termine = bail.statut === "TERMINE";
  const enRetard = !!limite && !bail.depotRestitueLe && solde.restituable > 0 && auj.getTime() > limite.getTime();

  return (
    <div className="flex flex-col gap-6 p-5">
      <ol className="flex flex-wrap gap-x-5 gap-y-2 text-[13px]">
        {etapes.map((e, i) => (
          <li key={e.cle} className="flex items-center gap-2">
            <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold ${e.faite ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{e.faite ? "✓" : i + 1}</span>
            <span className={e.faite ? "font-semibold text-navy-900" : "text-slate-500"}>{e.libelle}</span>
          </li>
        ))}
      </ol>

      {/* 1. Dépôt de garantie encaissé */}
      <section>
        <h3 className="mb-2 text-sm font-bold text-navy-900">Dépôt de garantie</h3>
        {bail.depotRecuLe ? (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5">
            <Infos
              colonnes={3}
              items={[
                { label: "Encaissé le", valeur: formatDate(bail.depotRecuLe) },
                { label: "Montant", valeur: <span className="font-semibold">{formatEuros(solde.recu)}</span> },
                { label: "Règlement", valeur: `${bail.depotRecuMode ? MODES_PAIEMENT[bail.depotRecuMode] : "—"}${bail.depotRecuReference ? ` · ${bail.depotRecuReference}` : ""}` },
              ]}
            />
            {Math.abs(solde.recu - bail.depotGarantie) > 0.005 && <p className="mt-2 text-xs text-amber-800">Le bail prévoit {formatEuros(bail.depotGarantie)}.</p>}
            {!bail.depotRestitueLe && (
              <div className="mt-3">
                <ConfirmForm action={annulerDepotRecu} titre="Annuler l'encaissement ?" message="Le dépôt de garantie sera de nouveau considéré comme non encaissé." libelleConfirmer="Annuler l'encaissement">
                  <input type="hidden" name="id" value={bail.id} />
                  <Button type="submit" variante="ghost" taille="sm">Annuler l'encaissement</Button>
                </ConfirmForm>
              </div>
            )}
          </div>
        ) : bail.depotGarantie > 0 ? (
          <DepotForm action={enregistrerDepotRecu.bind(null, bail.id)} montantPrevu={bail.depotGarantie} dateDefaut={toISODate(bail.dateDebut)} />
        ) : (
          <p className="text-sm text-slate-500">Aucun dépôt de garantie n'est prévu au bail.</p>
        )}
      </section>

      {/* 2. Congé */}
      <section className="border-t border-slate-100 pt-5">
        <h3 className="mb-2 text-sm font-bold text-navy-900">Congé et préavis</h3>
        {bail.congeRecuLe ? (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5">
            <Infos
              colonnes={3}
              items={[
                { label: "Congé donné par", valeur: bail.congeOrigine ? ORIGINES_CONGE[bail.congeOrigine] : "—" },
                { label: "Reçu le", valeur: formatDate(bail.congeRecuLe) },
                { label: "Préavis", valeur: bail.congePreavisMois !== null ? `${bail.congePreavisMois} mois` : "—" },
                { label: "Départ prévu", valeur: <span className="font-semibold">{formatDate(bail.congeDateDepart)}</span> },
                ...(bail.congeMotif ? [{ label: "Motif", valeur: bail.congeMotif }] : []),
              ]}
            />
            {!termine && (
              <div className="mt-3">
                <ConfirmForm action={annulerConge} titre="Annuler le congé ?" message="Le bail se poursuivra normalement." libelleConfirmer="Annuler le congé">
                  <input type="hidden" name="id" value={bail.id} />
                  <Button type="submit" variante="ghost" taille="sm">Annuler le congé</Button>
                </ConfirmForm>
              </div>
            )}
          </div>
        ) : bail.statut === "SIGNE" ? (
          <CongeForm action={enregistrerConge.bind(null, bail.id)} type={bail.type} dateDefaut={toISODate(auj)} />
        ) : (
          <p className="text-sm text-slate-500">Aucun congé enregistré.</p>
        )}
      </section>

      {/* 3. État des lieux de sortie */}
      <section className="border-t border-slate-100 pt-5">
        <h3 className="mb-2 text-sm font-bold text-navy-900">État des lieux de sortie</h3>
        {bail.etatLieuxSortieLe ? (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5">
            <Infos
              colonnes={2}
              items={[
                { label: "Réalisé le", valeur: formatDate(bail.etatLieuxSortieLe) },
                { label: "Comparaison à l'entrée", valeur: bail.etatLieuxConforme === false ? <Badge ton="orange">Non conforme</Badge> : <Badge ton="vert">Conforme</Badge> },
              ]}
            />
            <p className="mt-2 text-xs text-slate-500">Délai de restitution du dépôt : {delaiRestitutionMois(bail.etatLieuxConforme)} mois à compter de la remise des clés{limite ? `, soit le ${formatDate(limite)}` : ""}.</p>
          </div>
        ) : (
          <EtatLieuxForm action={enregistrerEtatLieuxSortie.bind(null, bail.id)} dateDefaut={toISODate(bail.congeDateDepart ?? auj)} />
        )}
      </section>

      {/* 4. Clôture du bail */}
      {bail.statut === "SIGNE" && (
        <section className="border-t border-slate-100 pt-5">
          <h3 className="mb-2 text-sm font-bold text-navy-900">Clôture du bail</h3>
          <p className="mb-3 text-sm text-slate-600">À la remise des clés, clôturez le bail : le dernier appel de loyer est recalculé au prorata des jours occupés et les appels postérieurs sont supprimés.</p>
          <form action={cloturerAuDepart} className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <input type="hidden" name="id" value={bail.id} />
            <Field label="Départ effectif (remise des clés)" name="dateFinEffective" requis className="sm:w-56">
              <Input name="dateFinEffective" type="date" defaultValue={toISODate(bail.congeDateDepart ?? auj)} required />
            </Field>
            <div className="shrink-0 pb-0.5">
              <SubmitButton variante="danger">Clôturer le bail</SubmitButton>
            </div>
          </form>
        </section>
      )}

      {/* 5. Décompte et restitution */}
      <section className="border-t border-slate-100 pt-5">
        <h3 className="mb-2 text-sm font-bold text-navy-900">Décompte de restitution</h3>
        {enRetard && (
          <Alerte ton="rouge" titre="Restitution en retard" className="mb-3">
            Le dépôt devait être restitué avant le {formatDate(limite)}. Le solde dû au locataire est majoré de 10 % du loyer mensuel hors charges par mois de retard commencé, soit {formatEuros(majoration)} à ce jour.
          </Alerte>
        )}
        <div className="overflow-hidden rounded-lg border border-slate-200">
          <table className="w-full text-sm">
            <tbody className="divide-y divide-slate-100">
              <tr>
                <td className="px-4 py-2.5 text-slate-600">Dépôt de garantie encaissé</td>
                <td className="px-4 py-2.5 text-right tabular-nums">{formatEuros(solde.recu)}</td>
                <td className="w-24" />
              </tr>
              {bail.retenuesDepot.map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-2.5 text-slate-600">Retenue : {r.libelle}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-red-700">− {formatEuros(r.montant)}</td>
                  <td className="px-4 py-2.5 text-right">
                    <form action={supprimerRetenue}>
                      <input type="hidden" name="id" value={r.id} />
                      <button type="submit" className="cursor-pointer text-xs text-red-700 hover:underline">Retirer</button>
                    </form>
                  </td>
                </tr>
              ))}
              {solde.impayes > 0 && (
                <tr>
                  <td className="px-4 py-2.5 text-slate-600">Loyers et charges restant dus</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-red-700">− {formatEuros(solde.impayes)}</td>
                  <td />
                </tr>
              )}
              {majoration > 0 && (
                <tr>
                  <td className="px-4 py-2.5 text-slate-600">Majoration pour restitution tardive</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">+ {formatEuros(majoration)}</td>
                  <td />
                </tr>
              )}
              <tr className="bg-slate-50">
                <td className="px-4 py-3 font-bold text-navy-900">{solde.resteDuParLocataire > 0 ? "Solde restant dû par le locataire" : "Solde à restituer au locataire"}</td>
                <td className={`px-4 py-3 text-right font-bold tabular-nums ${solde.resteDuParLocataire > 0 ? "text-red-700" : ""}`}>{formatEuros(solde.resteDuParLocataire > 0 ? solde.resteDuParLocataire : solde.restituable + majoration)}</td>
                <td />
              </tr>
            </tbody>
          </table>
        </div>
        <div className="mt-3">
          <RetenueForm action={ajouterRetenue.bind(null, bail.id)} />
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <ButtonLink href={`/api/baux/${bail.id}/restitution-depot.pdf`} variante="secondary" target="_blank">Décompte en PDF</ButtonLink>
        </div>
        <div className="mt-4 border-t border-slate-100 pt-4">
          {bail.depotRestitueLe ? (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3.5">
              <Infos
                colonnes={3}
                items={[
                  { label: "Restitué le", valeur: formatDate(bail.depotRestitueLe) },
                  { label: "Montant versé", valeur: <span className="font-semibold">{formatEuros(bail.depotRestitueMontant ?? 0)}</span> },
                  { label: "Mode", valeur: bail.depotRestitueMode ? MODES_PAIEMENT[bail.depotRestitueMode] : "—" },
                ]}
              />
              <div className="mt-3">
                <ConfirmForm action={annulerRestitution} titre="Annuler la restitution ?" message="Le dépôt sera de nouveau considéré comme non restitué." libelleConfirmer="Annuler la restitution">
                  <input type="hidden" name="id" value={bail.id} />
                  <Button type="submit" variante="ghost" taille="sm">Annuler la restitution</Button>
                </ConfirmForm>
              </div>
            </div>
          ) : solde.recu > 0 ? (
            <RestitutionForm action={restituerDepot.bind(null, bail.id)} montantPropose={solde.restituable + majoration} dateDefaut={toISODate(auj)} />
          ) : (
            <p className="text-sm text-slate-500">Aucun dépôt encaissé : rien à restituer.</p>
          )}
        </div>
      </section>
    </div>
  );
}
