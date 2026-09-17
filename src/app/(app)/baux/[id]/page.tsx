import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { idDepuis, type ParamsId, type SearchParams } from "@/lib/params";
import { STATUTS_BAIL, TYPES_BAIL, TYPES_COURRIER, adresseSurUneLigne, nomComplet } from "@/lib/libelles";
import { REGLES_BAIL, dureeEnMois } from "@/lib/bail-regles";
import { ajouterAnnees, aujourdhui, formatDate, formatPeriode, toISODate } from "@/lib/dates";
import { formatEuros, somme } from "@/lib/montants";
import { etatAppel, numeroAppel } from "@/lib/loyers";
import { synchroniserAppelsLoyer } from "@/lib/loyers-sync";
import { cloturerBail, envoyerEnSignature, marquerSigne, retourBrouillon, supprimerBail } from "@/actions/baux";
import { Alerte, Badge, Button, ButtonLink, Card, CardBody, CardHeader, Infos, PageHeader, Tableau, Td, Th } from "@/components/ui";
import { Input } from "@/components/form";
import { ConfirmForm } from "@/components/confirm-form";
import { Flash } from "@/components/flash";
import { BadgeStatutBail } from "@/components/baux/badge-statut";
import { BadgeStatutAppel } from "@/components/loyers/badge-statut";

export default async function BailPage({ params, searchParams }: { params: ParamsId; searchParams: SearchParams }) {
  const id = await idDepuis(params);
  const sp = await searchParams;
  await synchroniserAppelsLoyer({ bailId: id });
  const b = await prisma.bail.findUnique({
    where: { id },
    include: {
      lot: { include: { bailleur: true } },
      locataire: true,
      appels: { orderBy: { periode: "desc" }, include: { paiements: true } },
      revisions: { orderBy: { dateEffet: "desc" } },
      courriers: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!b) notFound();

  const auj = aujourdhui();
  const regle = REGLES_BAIL[b.type];
  const etats = b.appels.map((a) => ({ appel: a, etat: etatAppel(a, auj) }));
  const impayes = etats.filter((x) => x.etat.statut === "EN_RETARD" || x.etat.statut === "PARTIEL");
  const resteDu = somme(impayes.map((x) => x.etat.reste));
  const reconduit = b.statut === "SIGNE" && regle.reconductionTacite && b.dateFin.getTime() < auj.getTime();
  const peutReviser = b.statut === "SIGNE" && b.clauseRevision && regle.revisionIRL;
  const prochaineRevision = peutReviser ? ajouterAnnees(b.revisions[0]?.dateEffet ?? b.dateDebut, 1) : null;

  return (
    <>
      <PageHeader
        titre={`${TYPES_BAIL[b.type]} — ${b.lot.nom}`}
        sousTitre={
          <span className="flex flex-wrap items-center gap-2">
            <BadgeStatutBail statut={b.statut} />
            <span>
              <Link href={`/locataires/${b.locataire.id}`} className="text-navy-800 hover:underline">{nomComplet(b.locataire)}</Link> · <Link href={`/lots/${b.lot.id}`} className="text-navy-800 hover:underline">{adresseSurUneLigne(b.lot)}</Link>
            </span>
          </span>
        }
        retour={{ href: "/baux", libelle: "Baux" }}
        actions={
          <>
            <ButtonLink href={`/baux/${b.id}/contrat`} variante="secondary">Contrat</ButtonLink>
            <ButtonLink href={`/baux/${b.id}/modifier`} variante="secondary">Modifier</ButtonLink>
            <ConfirmForm action={supprimerBail} message={b.statut === "BROUILLON" || b.statut === "EN_SIGNATURE" ? "Supprimer ce bail ?" : "Supprimer ce bail signé ? Tous ses appels de loyer et paiements seront supprimés définitivement."}>
              <input type="hidden" name="id" value={b.id} />
              <Button type="submit" variante="danger">Supprimer</Button>
            </ConfirmForm>
          </>
        }
      />
      <Flash sp={sp} />

      <div className="space-y-6">
        {!b.lot.bailleur && (
          <Alerte ton="orange" titre="Bailleur non renseigné">
            Le lot n'a pas de bailleur : indiquez-le dans <Link href={`/lots/${b.lot.id}/modifier`} className="underline">la fiche du lot</Link> pour que les avis d'échéance et quittances soient complets.
          </Alerte>
        )}
        {resteDu > 0 && (
          <Alerte ton="rouge" titre={`Impayés : ${formatEuros(resteDu)}`}>
            {impayes.length} échéance{impayes.length > 1 ? "s" : ""} en retard ou partiellement réglée{impayes.length > 1 ? "s" : ""}. <Link href={`/loyers?bailId=${b.id}`} className="underline">Voir les loyers</Link>.
          </Alerte>
        )}

        <Card>
          <CardHeader titre="Étapes du bail" description="Brouillon → signature électronique (Omniup Sign) → bail signé → clôture au départ du locataire." />
          <CardBody>
            <ol className="mb-5 flex flex-wrap gap-2 text-xs">
              {(["BROUILLON", "EN_SIGNATURE", "SIGNE", "TERMINE"] as const).map((s, i) => {
                const ordre = ["BROUILLON", "EN_SIGNATURE", "SIGNE", "TERMINE"];
                const atteint = ordre.indexOf(b.statut) >= i;
                return (
                  <li key={s} className={`flex items-center gap-2 rounded-full px-3 py-1 ${b.statut === s ? "bg-navy-800 text-white" : atteint ? "bg-navy-100 text-navy-800" : "bg-slate-100 text-slate-500"}`}>
                    <span className="font-bold">{i + 1}</span> {STATUTS_BAIL[s]}
                  </li>
                );
              })}
            </ol>

            {b.statut === "BROUILLON" && (
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <form action={envoyerEnSignature} className="rounded-lg border border-slate-200 p-4">
                  <input type="hidden" name="id" value={b.id} />
                  <p className="text-sm font-semibold text-navy-900">Envoyer en signature (Omniup Sign)</p>
                  <p className="mt-1 text-xs text-slate-500">Générez le PDF du contrat, faites-le signer dans Omniup Sign, et notez ici la référence du dossier de signature.</p>
                  <div className="mt-3 flex flex-wrap items-end gap-2">
                    <div className="min-w-48 flex-1">
                      <label htmlFor="signatureRef" className="mb-1 block text-xs font-medium">Référence Omniup Sign (facultatif)</label>
                      <Input name="signatureRef" defaultValue={b.signatureRef ?? ""} placeholder="ex. : dossier n° 1234" />
                    </div>
                    <Button type="submit" variante="accent">Passer en signature</Button>
                  </div>
                </form>
                <FormSignature bailId={b.id} signatureRef={b.signatureRef} />
              </div>
            )}

            {b.statut === "EN_SIGNATURE" && (
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <FormSignature bailId={b.id} signatureRef={b.signatureRef} />
                <form action={retourBrouillon} className="rounded-lg border border-slate-200 p-4">
                  <input type="hidden" name="id" value={b.id} />
                  <p className="text-sm font-semibold text-navy-900">Revenir en brouillon</p>
                  <p className="mt-1 text-xs text-slate-500">Si le contrat doit être modifié avant signature.</p>
                  <Button type="submit" variante="secondary" className="mt-3">Remettre en brouillon</Button>
                </form>
              </div>
            )}

            {b.statut === "SIGNE" && (
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm">
                  <p className="font-semibold text-emerald-900">Bail signé{b.dateSignature ? ` le ${formatDate(b.dateSignature)}` : ""}{b.signatureRef ? ` — réf. ${b.signatureRef}` : ""}</p>
                  <p className="mt-1 text-emerald-900">Les avis d'échéance sont émis automatiquement {" "}avant chaque échéance. {reconduit && "Le bail est reconduit tacitement depuis le " + formatDate(b.dateFin) + "."}</p>
                </div>
                <ConfirmForm action={cloturerBail} message="Clôturer ce bail ? Les appels de loyer non réglés postérieurs à la date de départ seront supprimés et le dernier mois recalculé au prorata." className="rounded-lg border border-slate-200 p-4">
                  <input type="hidden" name="id" value={b.id} />
                  <p className="text-sm font-semibold text-navy-900">Clôturer le bail (départ du locataire)</p>
                  <div className="mt-3 flex flex-wrap items-end gap-2">
                    <div>
                      <label htmlFor="dateFinEffective" className="mb-1 block text-xs font-medium">Date de fin effective</label>
                      <Input name="dateFinEffective" type="date" defaultValue={toISODate(auj)} required />
                    </div>
                    <Button type="submit" variante="danger">Clôturer</Button>
                  </div>
                </ConfirmForm>
              </div>
            )}

            {b.statut === "TERMINE" && (
              <p className="text-sm text-slate-600">Bail terminé le {formatDate(b.dateFinEffective ?? b.dateFin)}. Les appels de loyer restent consultables ci-dessous.</p>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader titre="Conditions du bail" />
          <CardBody>
            <Infos
              colonnes={3}
              items={[
                { label: "Période", valeur: `${formatDate(b.dateDebut)} → ${formatDate(b.dateFin)} (${dureeEnMois(b.dateDebut, b.dateFin)} mois)${b.dateFinEffective ? ` — fin effective le ${formatDate(b.dateFinEffective)}` : ""}` },
                { label: "Loyer hors charges", valeur: formatEuros(b.loyerHC) + " / mois" },
                { label: "Charges", valeur: b.charges > 0 ? `${formatEuros(b.charges)} / mois (${b.chargesForfait ? "forfait" : "provision régularisée annuellement"})` : "Aucune" },
                { label: "Total mensuel", valeur: <strong>{formatEuros(b.loyerHC + b.charges)}</strong> },
                { label: "Dépôt de garantie", valeur: b.depotGarantie > 0 ? formatEuros(b.depotGarantie) : "Aucun" },
                { label: "Échéance", valeur: `Le ${b.jourEcheance} de chaque mois` },
                ...(b.type === "MOBILITE" ? [{ label: "Motif du bail mobilité", valeur: b.motifMobilite }] : []),
                { label: "Révision du loyer", valeur: regle.revisionIRL ? (b.clauseRevision ? `Annuelle sur l'IRL${b.irlTrimestre ? ` (référence ${b.irlTrimestre}${b.irlValeur ? ` : ${String(b.irlValeur).replace(".", ",")}` : ""})` : ""}` : "Pas de clause de révision") : "Non applicable (bail mobilité)" },
                { label: "Bailleur", valeur: b.lot.bailleur ? <Link href={`/bailleurs/${b.lot.bailleur.id}`} className="text-navy-800 hover:underline">{b.lot.bailleur.nom}</Link> : null },
                { label: "Notes", valeur: b.notes && <span className="whitespace-pre-line">{b.notes}</span> },
              ]}
            />
            <p className="mt-4 text-xs text-slate-500">{regle.resume} Préavis locataire : {regle.preavisLocataire}.</p>
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            titre={`Loyers (${b.appels.length})`}
            description={b.statut === "SIGNE" || b.statut === "TERMINE" ? "Appels de loyer émis pour ce bail." : "Les appels de loyer apparaîtront une fois le bail signé."}
            actions={b.appels.length > 0 ? <ButtonLink href={`/loyers?bailId=${b.id}`} taille="sm" variante="secondary">Gérer les loyers et quittances</ButtonLink> : undefined}
          />
          {b.appels.length > 0 && (
            <Tableau>
              <thead className="bg-slate-50"><tr><Th>Période</Th><Th>N°</Th><Th>Échéance</Th><Th droite>Montant</Th><Th droite>Réglé</Th><Th>Statut</Th><Th /></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {etats.map(({ appel, etat }) => (
                  <tr key={appel.id} className="hover:bg-slate-50">
                    <Td>{formatPeriode(appel.periode)}{appel.prorata && <Badge ton="gris">prorata</Badge>}</Td>
                    <Td className="text-slate-500">{numeroAppel(appel.id)}</Td>
                    <Td>{formatDate(appel.dateEcheance)}</Td>
                    <Td droite>{formatEuros(appel.total)}</Td>
                    <Td droite>{formatEuros(etat.regle)}</Td>
                    <Td><BadgeStatutAppel statut={etat.statut} /></Td>
                    <Td droite><ButtonLink href={`/loyers/${appel.id}`} taille="sm" variante="secondary">Détail</ButtonLink></Td>
                  </tr>
                ))}
              </tbody>
            </Tableau>
          )}
        </Card>

        {regle.revisionIRL && (
          <Card>
            <CardHeader
              titre={`Révisions de loyer (${b.revisions.length})`}
              description={peutReviser && prochaineRevision ? `Prochaine révision possible à partir du ${formatDate(prochaineRevision)}.` : undefined}
              actions={peutReviser ? <ButtonLink href={`/baux/${b.id}/revision`} taille="sm" variante="secondary">Réviser le loyer (IRL)</ButtonLink> : undefined}
            />
            {b.revisions.length === 0 ? (
              <CardBody><p className="text-sm text-slate-500">Aucune révision enregistrée.</p></CardBody>
            ) : (
              <Tableau>
                <thead className="bg-slate-50"><tr><Th>Date d'effet</Th><Th>IRL ancien</Th><Th>IRL nouveau</Th><Th droite>Ancien loyer</Th><Th droite>Nouveau loyer</Th><Th /></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {b.revisions.map((r) => (
                    <tr key={r.id}>
                      <Td>{formatDate(r.dateEffet)}</Td>
                      <Td>{r.irlAncienTrimestre ?? ""} {String(r.irlAncienValeur).replace(".", ",")}</Td>
                      <Td>{r.irlNouveauTrimestre ?? ""} {String(r.irlNouveauValeur).replace(".", ",")}</Td>
                      <Td droite>{formatEuros(r.ancienLoyer)}</Td>
                      <Td droite><strong>{formatEuros(r.nouveauLoyer)}</strong></Td>
                      <Td droite><ButtonLink href={`/baux/${b.id}/courriers/nouveau?type=REVISION_LOYER&revisionId=${r.id}`} taille="sm" variante="secondary">Courrier de notification</ButtonLink></Td>
                    </tr>
                  ))}
                </tbody>
              </Tableau>
            )}
          </Card>
        )}

        <Card>
          <CardHeader titre={`Courriers (${b.courriers.length})`} description="Courriers adressés au locataire (révision de loyer, relance…), rédigés à la main ou avec l'assistant IA." actions={<ButtonLink href={`/baux/${b.id}/courriers/nouveau`} taille="sm" variante="secondary">Nouveau courrier</ButtonLink>} />
          {b.courriers.length === 0 ? (
            <CardBody><p className="text-sm text-slate-500">Aucun courrier.</p></CardBody>
          ) : (
            <Tableau>
              <thead className="bg-slate-50"><tr><Th>Date</Th><Th>Type</Th><Th>Objet</Th><Th>Envoi</Th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {b.courriers.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <Td>{formatDate(c.createdAt)}</Td>
                    <Td>{TYPES_COURRIER[c.type]}</Td>
                    <Td><Link href={`/courriers/${c.id}`} className="font-medium text-navy-800 hover:underline">{c.objet}</Link></Td>
                    <Td>{c.dateEnvoi ? <Badge ton="vert">Envoyé le {formatDate(c.dateEnvoi)}</Badge> : <Badge ton="gris">Non envoyé</Badge>}</Td>
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

function FormSignature({ bailId, signatureRef }: { bailId: number; signatureRef: string | null }) {
  return (
    <form action={marquerSigne} className="rounded-lg border border-emerald-200 p-4">
      <input type="hidden" name="id" value={bailId} />
      <p className="text-sm font-semibold text-navy-900">Marquer comme signé</p>
      <p className="mt-1 text-xs text-slate-500">Une fois la signature électronique reçue. Les appels de loyer seront alors émis automatiquement.</p>
      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div>
          <label htmlFor="dateSignature" className="mb-1 block text-xs font-medium">Date de signature</label>
          <Input name="dateSignature" type="date" defaultValue={toISODate(aujourdhui())} />
        </div>
        <div>
          <label htmlFor="signatureRef" className="mb-1 block text-xs font-medium">Référence Omniup Sign</label>
          <Input name="signatureRef" defaultValue={signatureRef ?? ""} placeholder="facultatif" />
        </div>
      </div>
      <Button type="submit" className="mt-3">Confirmer la signature</Button>
    </form>
  );
}
