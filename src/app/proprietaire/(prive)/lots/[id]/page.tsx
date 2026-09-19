import { notFound } from "next/navigation";
import { idDepuis, type ParamsId } from "@/lib/params";
import { appelsDuLot, depensesDuBailleur, exigerBailleur, lotDuBailleur, resumerLot } from "@/lib/proprietaire";
import { CATEGORIES_DEPENSE, TYPES_BAIL_COURT, TYPES_LOT, adresseSurUneLigne } from "@/lib/libelles";
import { nomsLocataires } from "@/lib/locataires";
import { aujourdhui, formatDate, formatPeriode } from "@/lib/dates";
import { formatEuros, somme } from "@/lib/montants";
import { numeroAppel, numeroQuittance } from "@/lib/loyers";
import { formatTaille } from "@/lib/storage";
import { formatSurface } from "@/components/patrimoine/surface";
import { Alerte, Badge, Card, CardBody, CardHeader, Infos, PageHeader, Stat, Tableau, TableauPied, Td, Th } from "@/components/ui";
import { BadgeStatutBail } from "@/components/baux/badge-statut";
import { BadgeStatutAppel } from "@/components/loyers/badge-statut";

export const metadata = { title: "Détail du bien" };
export const dynamic = "force-dynamic";

const pluriel = (n: number, un: string, plusieurs: string) => `${n} ${n > 1 ? plusieurs : un}`;
const LIEN = "font-semibold text-navy-800 hover:underline";

export default async function ProprietaireLotPage({ params }: { params: ParamsId }) {
  const b = await exigerBailleur();
  const id = await idDepuis(params);
  const lot = await lotDuBailleur(b.id, id);
  if (!lot) notFound();
  const auj = aujourdhui();
  const annee = auj.getUTCFullYear();
  const depenses = await depensesDuBailleur(b.id, { lotId: lot.id });
  const { bail, solde, encaisse } = resumerLot(lot, annee, auj);
  const appels = appelsDuLot(lot);
  const plusieursBaux = lot.baux.length > 1;
  const autresBaux = lot.baux.filter((x) => x.id !== bail?.id);
  const totalDepenses = somme(depenses.map((d) => d.montant));

  return (
    <>
      <PageHeader
        titre={lot.nom}
        badge={bail ? <Badge ton="vert">Loué</Badge> : <Badge ton="orange">Vacant</Badge>}
        sousTitre={[lot.immeuble?.nom, adresseSurUneLigne(lot)].filter(Boolean).join(" · ")}
        retour={{ href: "/proprietaire", libelle: "Vos biens" }}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Stat libelle="Loyer charges comprises" valeur={bail ? formatEuros(bail.loyerHC + bail.charges) : "—"} detail={bail ? `${formatEuros(bail.loyerHC)} hors charges + ${formatEuros(bail.charges)} de charges` : "aucun bail en cours"} ton="bleu" />
        <Stat libelle="Reste dû" valeur={formatEuros(solde.total)} detail={solde.total > 0 ? (solde.enRetard > 0 ? `dont ${formatEuros(solde.enRetard)} en retard` : "échéance à venir, aucun retard") : "tous les loyers appelés sont réglés"} ton={solde.total > 0 ? (solde.enRetard > 0 ? "rouge" : "orange") : "vert"} />
        <Stat libelle={`Encaissé en ${annee}`} valeur={formatEuros(encaisse)} detail="paiements reçus sur l'année civile" ton="cyan" />
      </div>

      {solde.dus.length > 0 && (
        <Alerte ton={solde.enRetard > 0 ? "rouge" : "orange"} titre={solde.enRetard > 0 ? "Loyers en retard" : "Échéance en attente de règlement"} className="mt-6">
          {solde.dus.map((d) => `${formatPeriode(d.appel.periode)} : ${formatEuros(d.etat.reste)} (échéance le ${formatDate(d.appel.dateEcheance)})`).join(" · ")}
        </Alerte>
      )}

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,2fr)] lg:items-start">
        <div className="flex min-w-0 flex-col gap-6">
          <Card>
            <CardHeader titre="Appels de loyer" description="Avis d'échéance de chaque période ; la quittance est disponible dès que le loyer est intégralement réglé." />
            {appels.length === 0 ? (
              <CardBody>
                <p className="text-sm text-slate-500">Aucun appel de loyer pour l'instant.</p>
              </CardBody>
            ) : (
              <>
                <Tableau>
                  <thead className="bg-slate-50">
                    <tr>
                      <Th>Période</Th>
                      {plusieursBaux && <Th>Locataires</Th>}
                      <Th>Échéance</Th>
                      <Th droite>Montant</Th>
                      <Th droite>Réglé</Th>
                      <Th>Statut</Th>
                      <Th>Documents</Th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {solde.lignes.map(({ appel, etat }) => {
                      const ligne = appels.find((x) => x.appel.id === appel.id);
                      return (
                        <tr key={appel.id} className="hover:bg-slate-50">
                          <Td className="font-semibold text-navy-900">
                            <span className="whitespace-nowrap">{formatPeriode(appel.periode)}</span>
                            {appel.prorata && <Badge ton="gris" className="mt-1 block w-fit">prorata</Badge>}
                          </Td>
                          {plusieursBaux && <Td className="text-slate-600">{ligne ? nomsLocataires(ligne.bail.locataires) : ""}</Td>}
                          <Td className="whitespace-nowrap text-slate-600 tabular-nums">{formatDate(appel.dateEcheance)}</Td>
                          <Td droite className="whitespace-nowrap tabular-nums">{formatEuros(appel.total)}</Td>
                          <Td droite className="whitespace-nowrap tabular-nums">{formatEuros(etat.regle)}</Td>
                          <Td><BadgeStatutAppel statut={etat.statut} /></Td>
                          <Td className="text-sm">
                            <a href={`/api/proprietaire/loyers/${appel.id}/avis.pdf`} target="_blank" rel="noopener" className={`block whitespace-nowrap ${LIEN}`}>Avis {numeroAppel(appel.id)}</a>
                            {appel.paiements.length > 0 && (
                              <a href={`/api/proprietaire/loyers/${appel.id}/quittance.pdf`} target="_blank" rel="noopener" className={`block whitespace-nowrap ${LIEN}`}>{etat.statut === "PAYE" ? `Quittance ${numeroQuittance(appel.id)}` : "Reçu"}</a>
                            )}
                          </Td>
                        </tr>
                      );
                    })}
                  </tbody>
                </Tableau>
                <TableauPied pagination={false}>{pluriel(appels.length, "appel de loyer", "appels de loyer")} · les documents s'ouvrent en PDF.</TableauPied>
              </>
            )}
          </Card>

          <Card>
            <CardHeader titre="Dépenses" description="Travaux, entretien, assurance, taxe foncière… enregistrés par votre gestionnaire sur ce lot." />
            {depenses.length === 0 ? (
              <CardBody>
                <p className="text-sm text-slate-500">Aucune dépense enregistrée pour ce lot.</p>
              </CardBody>
            ) : (
              <Tableau>
                <thead className="bg-slate-50">
                  <tr>
                    <Th>Date</Th>
                    <Th>Libellé</Th>
                    <Th>Catégorie</Th>
                    <Th>Justificatif</Th>
                    <Th droite>Montant</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {depenses.map((d) => (
                    <tr key={d.id} className="hover:bg-slate-50">
                      <Td className="whitespace-nowrap text-slate-600 tabular-nums">{formatDate(d.date)}</Td>
                      <Td>
                        <span className="font-semibold text-navy-900">{d.libelle}</span>
                        {d.fournisseur && <span className="block text-xs text-slate-500">{d.fournisseur}</span>}
                      </Td>
                      <Td className="text-slate-600">{CATEGORIES_DEPENSE[d.categorie]}</Td>
                      <Td className="text-[13px]">
                        {d.justificatifChemin ? (
                          <a href={`/api/proprietaire/depenses/${d.id}/justificatif`} target="_blank" rel="noopener" title={d.justificatifNom ?? "Justificatif"} className={`inline-block max-w-[220px] truncate align-bottom ${LIEN}`}>{d.justificatifNom ?? "Justificatif"}</a>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </Td>
                      <Td droite className="whitespace-nowrap font-semibold">{formatEuros(d.montant)}</Td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-slate-200 bg-slate-50">
                    <td colSpan={4} className="px-4 py-2.5 text-[13px] font-semibold text-slate-600">{pluriel(depenses.length, "dépense", "dépenses")}</td>
                    <td className="px-4 py-2.5 text-right font-bold tabular-nums">{formatEuros(totalDepenses)}</td>
                  </tr>
                </tfoot>
              </Tableau>
            )}
          </Card>
        </div>

        <div className="flex min-w-0 flex-col gap-6">
          <Card>
            <CardHeader titre="Caractéristiques" />
            <CardBody>
              <Infos
                colonnes={1}
                items={[
                  { label: "Type", valeur: `${TYPES_LOT[lot.type]}${lot.meuble ? " meublé" : ""}` },
                  { label: "Adresse", valeur: adresseSurUneLigne(lot) },
                  ...(lot.immeuble ? [{ label: "Immeuble", valeur: lot.immeuble.nom }] : []),
                  { label: "Surface", valeur: formatSurface(lot.surface) },
                  { label: "Pièces", valeur: lot.nbPieces },
                  ...(lot.etage ? [{ label: "Étage", valeur: lot.etage }] : []),
                  ...(lot.description ? [{ label: "Description", valeur: <span className="whitespace-pre-line">{lot.description}</span> }] : []),
                ]}
              />
            </CardBody>
          </Card>

          <Card>
            <CardHeader titre={bail ? "Bail en cours" : "Baux"} description={bail ? undefined : "Aucun bail en cours : le lot est vacant."} />
            {bail && (
              <>
                <CardBody>
                  <Infos
                    colonnes={1}
                    items={[
                      { label: "Locataires", valeur: nomsLocataires(bail.locataires) },
                      { label: "Type de bail", valeur: TYPES_BAIL_COURT[bail.type] },
                      { label: "Période", valeur: `du ${formatDate(bail.dateDebut)} au ${formatDate(bail.dateFinEffective ?? bail.dateFin)}` },
                      { label: "Loyer hors charges", valeur: formatEuros(bail.loyerHC) },
                      { label: bail.chargesForfait ? "Forfait de charges" : "Provision sur charges", valeur: formatEuros(bail.charges) },
                      { label: "Dépôt de garantie", valeur: bail.depotGarantie > 0 ? formatEuros(bail.depotGarantie) : "aucun" },
                      ...(bail.dateSignature ? [{ label: "Signé le", valeur: formatDate(bail.dateSignature) }] : []),
                    ]}
                  />
                </CardBody>
                {(bail.texteContrat || bail.contratSigneChemin) && (
                  <div className="flex flex-col gap-2 border-t border-slate-100 px-5 py-3 text-sm">
                    {bail.texteContrat && <a href={`/api/proprietaire/baux/${bail.id}/contrat.pdf`} target="_blank" rel="noopener" className={LIEN}>Contrat (PDF)</a>}
                    {bail.contratSigneChemin && (
                      <span>
                        <a href={`/api/proprietaire/baux/${bail.id}/contrat-signe`} target="_blank" rel="noopener" className={LIEN}>Exemplaire signé du contrat</a>
                        <span className="block text-xs text-slate-500">{bail.contratSigneNom}{bail.contratSigneTaille ? ` · ${formatTaille(bail.contratSigneTaille)}` : ""}{bail.contratSigneLe ? ` · déposé le ${formatDate(bail.contratSigneLe)}` : ""}</span>
                      </span>
                    )}
                  </div>
                )}
              </>
            )}
            {autresBaux.length > 0 && (
              <div className="border-t border-slate-100 px-5 py-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-[.04em] text-slate-500">Baux passés ou à venir</p>
                <ul className="flex flex-col gap-3">
                  {autresBaux.map((x) => (
                    <li key={x.id} className="text-sm">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-semibold text-navy-900">{nomsLocataires(x.locataires)}</span>
                        <BadgeStatutBail statut={x.statut} />
                      </div>
                      <span className="block text-xs text-slate-500">
                        {TYPES_BAIL_COURT[x.type]} · du {formatDate(x.dateDebut)} au {formatDate(x.dateFinEffective ?? x.dateFin)} · {formatEuros(x.loyerHC + x.charges)} charges comprises
                      </span>
                      {(x.texteContrat || x.contratSigneChemin) && (
                        <span className="mt-0.5 block text-xs">
                          {x.texteContrat && <a href={`/api/proprietaire/baux/${x.id}/contrat.pdf`} target="_blank" rel="noopener" className={LIEN}>Contrat (PDF)</a>}
                          {x.texteContrat && x.contratSigneChemin && <span className="text-slate-300"> · </span>}
                          {x.contratSigneChemin && <a href={`/api/proprietaire/baux/${x.id}/contrat-signe`} target="_blank" rel="noopener" className={LIEN}>Exemplaire signé</a>}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
