import { notFound } from "next/navigation";
import { idDepuis, type ParamsId, type SearchParams } from "@/lib/params";
import { bailDuLocataire, exigerLocataire, soldeBail } from "@/lib/espace";
import { CATEGORIES_MODELE, TYPES_BAIL, TYPES_COURRIER, TYPES_LOT, adresseSurUneLigne } from "@/lib/libelles";
import { nomsLocataires } from "@/lib/locataires";
import { aujourdhui, formatDate, formatPeriode } from "@/lib/dates";
import { formatEuros } from "@/lib/montants";
import { libelleTaux, montantsMensuels } from "@/lib/tva";
import { numeroAppel, numeroQuittance } from "@/lib/loyers";
import { formatTaille } from "@/lib/storage";
import { Alerte, Badge, ButtonLink, Card, CardBody, CardHeader, Infos, PageHeader, Stat, Tableau, TableauPied, Td, Th } from "@/components/ui";
import { Flash } from "@/components/flash";
import { BadgeStatutBail } from "@/components/baux/badge-statut";
import { BadgeStatutAppel } from "@/components/loyers/badge-statut";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  return { title: "Mon bail" };
}

export default async function EspaceBailPage({ params, searchParams }: { params: ParamsId; searchParams: SearchParams }) {
  const l = await exigerLocataire();
  const id = await idDepuis(params);
  const sp = await searchParams;
  const b = await bailDuLocataire(l.id, id);
  if (!b) notFound();
  const auj = aujourdhui();
  const solde = soldeBail(b.appels, auj);
  const bailleur = b.lot.bailleur;
  const pluriel = (n: number, un: string, plusieurs: string) => `${n} ${n > 1 ? plusieurs : un}`;
  const documents = [
    ...b.courriers.map((c) => ({ cle: `c-${c.id}`, titre: c.objet, categorie: TYPES_COURRIER[c.type], date: c.dateEnvoi ?? c.createdAt, href: `/api/espace/courriers/${c.id}/courrier.pdf` })),
    ...b.documents.map((d) => ({ cle: `d-${d.id}`, titre: d.titre, categorie: CATEGORIES_MODELE[d.categorie], date: d.dateEnvoi ?? d.createdAt, href: `/api/espace/documents/${d.id}/document.pdf` })),
  ].sort((a, c) => c.date.getTime() - a.date.getTime());

  return (
    <>
      <PageHeader
        titre={b.lot.nom}
        badge={<BadgeStatutBail statut={b.statut} />}
        sousTitre={`${adresseSurUneLigne(b.lot)} · ${TYPES_BAIL[b.type]}`}
        retour={{ href: "/espace", libelle: "Mon espace" }}
        actions={
          <>
            {b.texteContrat && <ButtonLink href={`/api/espace/baux/${b.id}/contrat.pdf`} variante="secondary" target="_blank">Contrat (PDF)</ButtonLink>}
            {b.contratSigneChemin && <ButtonLink href={`/api/espace/baux/${b.id}/contrat-signe?dl=1`}>Exemplaire signé</ButtonLink>}
          </>
        }
      />
      <Flash sp={sp} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Stat libelle="Solde dû" valeur={formatEuros(solde.total)} detail={solde.total > 0 ? (solde.enRetard > 0 ? `dont ${formatEuros(solde.enRetard)} en retard` : "à régler avant l'échéance") : "vous êtes à jour"} ton={solde.total > 0 ? (solde.enRetard > 0 ? "rouge" : "orange") : "vert"} />
        <Stat libelle={b.tauxTva > 0 ? "Loyer mensuel TTC" : "Loyer mensuel"} valeur={formatEuros(montantsMensuels(b).ttc)} detail={`${formatEuros(b.loyerHC)} hors charges + ${formatEuros(b.charges)} de charges${b.tauxTva > 0 ? ` + TVA ${libelleTaux(b.tauxTva)} ${formatEuros(montantsMensuels(b).tva)}` : ""}`} ton="bleu" />
        <Stat libelle="Échéance" valeur={`le ${b.jourEcheance}`} detail="de chaque mois, d'avance" />
      </div>

      {solde.dus.length > 0 && (
        <Alerte ton={solde.enRetard > 0 ? "rouge" : "orange"} titre={solde.enRetard > 0 ? "Loyers en retard" : "Échéance à régler"} className="mt-6">
          {solde.dus.map((d) => `${formatPeriode(d.appel.periode)} : ${formatEuros(d.etat.reste)} (échéance le ${formatDate(d.appel.dateEcheance)})`).join(" · ")}
          {bailleur?.iban && <span className="mt-1 block">Règlement par virement : IBAN {bailleur.iban}{bailleur.bic ? ` · BIC ${bailleur.bic}` : ""}.</span>}
        </Alerte>
      )}

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] lg:items-start">
        <div className="flex min-w-0 flex-col gap-6">
          <Card>
            <CardHeader titre="Appels de loyer et quittances" description="Avis d'échéance de chaque période ; la quittance est disponible dès que le loyer est intégralement réglé." />
            {b.appels.length === 0 ? (
              <CardBody>
                <p className="text-sm text-slate-500">Aucun appel de loyer pour l'instant.</p>
              </CardBody>
            ) : (
              <>
                <Tableau>
                  <thead className="bg-slate-50">
                    <tr>
                      <Th>Période</Th>
                      <Th>Échéance</Th>
                      <Th droite>Montant</Th>
                      <Th droite>Réglé</Th>
                      <Th>Statut</Th>
                      <Th>Documents</Th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {solde.lignes.map(({ appel, etat }) => (
                      <tr key={appel.id} className="hover:bg-slate-50">
                        <Td className="whitespace-nowrap font-semibold text-navy-900">
                          {formatPeriode(appel.periode)}
                          {appel.prorata && <Badge ton="gris" className="ml-2">prorata</Badge>}
                        </Td>
                        <Td className="whitespace-nowrap text-slate-600 tabular-nums">{formatDate(appel.dateEcheance)}</Td>
                        <Td droite className="whitespace-nowrap tabular-nums">{formatEuros(appel.total)}</Td>
                        <Td droite className="whitespace-nowrap tabular-nums">{formatEuros(etat.regle)}</Td>
                        <Td><BadgeStatutAppel statut={etat.statut} /></Td>
                        <Td className="whitespace-nowrap text-sm">
                          <a href={`/api/espace/loyers/${appel.id}/avis.pdf`} target="_blank" rel="noopener" className="font-semibold text-navy-800 hover:underline">Avis {numeroAppel(appel.id)}</a>
                          {appel.paiements.length > 0 && (
                            <>
                              <span className="text-slate-300"> · </span>
                              <a href={`/api/espace/loyers/${appel.id}/quittance.pdf`} target="_blank" rel="noopener" className="font-semibold text-navy-800 hover:underline">{etat.statut === "PAYE" ? `Quittance ${numeroQuittance(appel.id)}` : "Reçu"}</a>
                            </>
                          )}
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </Tableau>
                <TableauPied pagination={false}>{pluriel(b.appels.length, "appel de loyer", "appels de loyer")} · les documents s'ouvrent en PDF.</TableauPied>
              </>
            )}
          </Card>

          <Card>
            <CardHeader titre="Courriers et documents" description="Courriers, avenants et autres documents qui vous ont été adressés." />
            {documents.length === 0 ? (
              <CardBody>
                <p className="text-sm text-slate-500">Aucun courrier pour l'instant.</p>
              </CardBody>
            ) : (
              <ul className="divide-y divide-slate-100">
                {documents.map((d) => (
                  <li key={d.cle} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-navy-900">{d.titre}</span>
                      <span className="block text-xs text-slate-500">{d.categorie} · {formatDate(d.date)}</span>
                    </span>
                    <a href={d.href} target="_blank" rel="noopener" className="text-sm font-semibold text-navy-800 hover:underline">Ouvrir le PDF</a>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="flex min-w-0 flex-col gap-6">
          <Card>
            <CardHeader titre="Votre bail" />
            <CardBody>
              <Infos
                colonnes={1}
                items={[
                  { label: "Logement", valeur: `${b.lot.nom} · ${TYPES_LOT[b.lot.type]}${b.lot.meuble ? " meublé" : ""}` },
                  { label: "Adresse", valeur: adresseSurUneLigne(b.lot) },
                  { label: "Locataires", valeur: nomsLocataires(b.locataires) },
                  { label: "Type de bail", valeur: TYPES_BAIL[b.type] },
                  { label: "Prise d'effet", valeur: formatDate(b.dateDebut) },
                  { label: b.statut === "TERMINE" ? "Fin du bail" : "Échéance du bail", valeur: formatDate(b.dateFinEffective ?? b.dateFin) },
                  { label: "Loyer hors charges", valeur: formatEuros(b.loyerHC) },
                  { label: b.chargesForfait ? "Forfait de charges" : "Provision sur charges", valeur: formatEuros(b.charges) },
                  ...(b.tauxTva > 0 ? [{ label: "TVA", valeur: `${libelleTaux(b.tauxTva)} sur le loyer et les charges · ${formatEuros(montantsMensuels(b).tva)} par mois` }] : []),
                  { label: "Dépôt de garantie", valeur: b.depotGarantie > 0 ? formatEuros(b.depotGarantie) : "aucun" },
                  ...(b.dateSignature ? [{ label: "Signé le", valeur: formatDate(b.dateSignature) }] : []),
                  ...(b.irlTrimestre || b.irlValeur !== null ? [{ label: "Indice de référence (IRL)", valeur: `${b.irlTrimestre ?? ""}${b.irlValeur !== null ? ` · ${String(b.irlValeur).replace(".", ",")}` : ""}` }] : []),
                ]}
              />
            </CardBody>
            {b.contratSigneChemin && (
              <div className="border-t border-slate-100 px-5 py-3 text-sm">
                <a href={`/api/espace/baux/${b.id}/contrat-signe`} target="_blank" rel="noopener" className="font-semibold text-navy-800 hover:underline">Exemplaire signé du contrat</a>
                <span className="block text-xs text-slate-500">{b.contratSigneNom}{b.contratSigneTaille ? ` · ${formatTaille(b.contratSigneTaille)}` : ""}{b.contratSigneLe ? ` · déposé le ${formatDate(b.contratSigneLe)}` : ""}</span>
              </div>
            )}
          </Card>
          <Card>
            <CardHeader titre="Votre bailleur" />
            <CardBody>
              {bailleur ? (
                <Infos
                  colonnes={1}
                  items={[
                    { label: "Nom", valeur: `${bailleur.nom}${bailleur.representant ? ` (${bailleur.representant})` : ""}` },
                    { label: "Adresse", valeur: adresseSurUneLigne(bailleur) },
                    { label: "Email", valeur: bailleur.email ? <a href={`mailto:${bailleur.email}`} className="break-all text-navy-800 hover:underline">{bailleur.email}</a> : null },
                    { label: "Téléphone", valeur: bailleur.telephone },
                    ...(bailleur.iban ? [{ label: "IBAN pour vos virements", valeur: <span className="font-mono text-xs">{bailleur.iban}</span> }] : []),
                  ]}
                />
              ) : (
                <p className="text-sm text-slate-500">Coordonnées non renseignées.</p>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}
