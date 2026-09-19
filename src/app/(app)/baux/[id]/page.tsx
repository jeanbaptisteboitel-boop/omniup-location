import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { idDepuis, texteParam, type ParamsId, type SearchParams } from "@/lib/params";
import { CATEGORIES_MODELE, TYPES_BAIL, TYPES_BAIL_COURT, TYPES_COURRIER, TYPES_LOT, adresseSurUneLigne, nomComplet } from "@/lib/libelles";
import { REGLES_BAIL, dureeEnMois } from "@/lib/bail-regles";
import { ajouterAnnees, aujourdhui, formatDate, formatPeriode, toISODate } from "@/lib/dates";
import { formatEuros, formatNombre, somme } from "@/lib/montants";
import { etatAppel } from "@/lib/loyers";
import { synchroniserAppelsLoyer } from "@/lib/loyers-sync";
import { cloturerBail, envoyerEnSignature, marquerSigne, retourBrouillon, supprimerBail } from "@/actions/baux";
import { Alerte, Badge, Button, ButtonLink, Card, CardHeader, Infos, Onglets, PageHeader, Stat, Stepper, Tableau, TableauPied, Td, Th } from "@/components/ui";
import { Field, Input } from "@/components/form";
import { IconeFichier } from "@/components/icones";
import { ConfirmForm } from "@/components/confirm-form";
import { Flash } from "@/components/flash";
import { ActionDialogue } from "@/components/baux/action-dialogue";
import { STATUTS_BAIL_COURT } from "@/components/baux/badge-statut";
import { BadgeStatutAppel } from "@/components/loyers/badge-statut";
import { entiteCouranteId } from "@/lib/entite";
import { includeLocataires, nomsLocataires } from "@/lib/locataires";

const ETAPES = ["BROUILLON", "EN_SIGNATURE", "SIGNE", "TERMINE"] as const;
const ONGLETS = ["contrat", "loyers", "courriers", "revisions"] as const;
type Onglet = (typeof ONGLETS)[number];

export default async function BailPage({ params, searchParams }: { params: ParamsId; searchParams: SearchParams }) {
  const id = await idDepuis(params);
  const sp = await searchParams;
  await synchroniserAppelsLoyer({ bailId: id });
  const b = await prisma.bail.findFirst({
    where: { id, entiteId: await entiteCouranteId() },
    include: {
      lot: { include: { bailleur: true } },
      locataires: includeLocataires,
      appels: { orderBy: { periode: "desc" }, include: { paiements: true } },
      revisions: { orderBy: { dateEffet: "asc" } },
      courriers: { orderBy: { createdAt: "desc" } },
      documents: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!b) notFound();

  const ongletParam = texteParam(sp, "onglet");
  const onglet: Onglet = ONGLETS.includes(ongletParam as Onglet) ? (ongletParam as Onglet) : "contrat";
  const auj = aujourdhui();
  const regle = REGLES_BAIL[b.type];
  const etats = b.appels.map((a) => ({ appel: a, etat: etatAppel(a, auj) }));
  const impayes = etats.filter((x) => x.etat.statut === "EN_RETARD" || x.etat.statut === "PARTIEL");
  const resteDu = somme(impayes.map((x) => x.etat.reste));
  const reconduit = b.statut === "SIGNE" && regle.reconductionTacite && b.dateFin.getTime() < auj.getTime();
  const peutReviser = b.statut === "SIGNE" && b.clauseRevision && regle.revisionIRL;
  const derniereRevision = b.revisions[b.revisions.length - 1];
  const prochaineRevision = peutReviser ? ajouterAnnees(derniereRevision?.dateEffet ?? b.dateDebut, 1) : null;
  const locataire = nomsLocataires(b.locataires);
  const loyerCC = b.loyerHC + b.charges;
  const lienOnglet = (o: Onglet) => (o === "contrat" ? `/baux/${b.id}` : `/baux/${b.id}?onglet=${o}`);
  const pluriel = (n: number, un: string, plusieurs: string) => `${n} ${n > 1 ? plusieurs : un}`;
  const indice = b.irlTrimestre || b.irlValeur !== null ? `IRL ${b.irlTrimestre ?? ""}${b.irlTrimestre && b.irlValeur !== null ? " · " : ""}${b.irlValeur !== null ? formatNombre(b.irlValeur) : ""}`.trim() : null;
  const contratEtat = !b.texteContrat
    ? "non généré"
    : b.statut === "BROUILLON"
      ? "généré · brouillon"
      : b.statut === "EN_SIGNATURE"
        ? `en signature via Omniup Sign${b.signatureRef ? ` · réf. ${b.signatureRef}` : ""}`
        : `signé${b.dateSignature ? ` le ${formatDate(b.dateSignature)}` : ""}${b.signatureRef ? ` via Omniup Sign · réf. ${b.signatureRef}` : ""}`;

  const dialogueSignature = (variante: "primary" | "secondary", taille: "sm" | "md", className = "") => (
    <ActionDialogue
      action={marquerSigne}
      libelle={variante === "primary" ? "Marquer signé" : "Marquer comme signé"}
      variante={variante}
      taille={taille}
      className={className}
      titre="Marquer le bail comme signé"
      description="Une fois la signature reçue. Les appels de loyer seront ensuite émis automatiquement avant chaque échéance."
      caches={{ id: String(b.id) }}
      libelleConfirmer="Confirmer la signature"
    >
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
        <Field label="Date de signature" name="dateSignature" requis>
          <Input name="dateSignature" type="date" defaultValue={toISODate(auj)} required />
        </Field>
        <Field label="Référence Omniup Sign" name="signatureRef" hint="Facultatif">
          <Input name="signatureRef" defaultValue={b.signatureRef ?? ""} placeholder="ex. : dossier n° 1234" />
        </Field>
      </div>
    </ActionDialogue>
  );

  const actions = (
    <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap sm:items-center">
      <ConfirmForm
        action={supprimerBail}
        titre="Supprimer ce bail ?"
        message={b.statut === "BROUILLON" || b.statut === "EN_SIGNATURE" ? "Le bail sera définitivement supprimé. Cette action est irréversible." : "Ce bail est signé : ses appels de loyer et paiements seront définitivement supprimés avec lui. Cette action est irréversible."}
        libelleConfirmer="Supprimer définitivement"
        className="contents"
      >
        <input type="hidden" name="id" value={b.id} />
        <Button type="submit" variante="danger" className="w-full sm:w-auto">Supprimer</Button>
      </ConfirmForm>
      <ButtonLink href={`/baux/${b.id}/modifier`} variante="secondary" className="w-full sm:w-auto">Modifier</ButtonLink>
      {b.statut === "BROUILLON" && (
        <>
          <ButtonLink href={`/baux/${b.id}/contrat`} variante="secondary" className="w-full sm:w-auto">{b.texteContrat ? "Ouvrir le contrat" : "Générer le contrat"}</ButtonLink>
          <ActionDialogue
            action={envoyerEnSignature}
            libelle="Envoyer en signature"
            variante="accent"
            className="w-full sm:w-auto"
            titre="Envoyer en signature"
            description="Le contrat est signé électroniquement dans Omniup Sign. Une fois la signature reçue, vous marquerez le bail comme signé."
            caches={{ id: String(b.id) }}
            libelleConfirmer="Envoyer en signature"
            enCours="Envoi…"
          >
            <Field label="Référence Omniup Sign" name="signatureRef" hint="Facultatif · numéro du dossier de signature">
              <Input name="signatureRef" defaultValue={b.signatureRef ?? ""} placeholder="ex. : dossier n° 1234" />
            </Field>
          </ActionDialogue>
        </>
      )}
      {b.statut === "EN_SIGNATURE" && (
        <>
          <form action={retourBrouillon} className="contents">
            <input type="hidden" name="id" value={b.id} />
            <Button type="submit" variante="secondary" className="w-full sm:w-auto">Remettre en brouillon</Button>
          </form>
          {dialogueSignature("primary", "md", "w-full sm:w-auto")}
        </>
      )}
      {b.statut === "SIGNE" && (
        <>
          {peutReviser && <ButtonLink href={`/baux/${b.id}/revision`} variante="secondary" className="w-full sm:w-auto">Réviser le loyer</ButtonLink>}
          <ButtonLink href={`/baux/${b.id}/courriers/nouveau`} variante="secondary" className="w-full sm:w-auto">Courrier</ButtonLink>
          <ActionDialogue
            action={cloturerBail}
            libelle="Résilier"
            variante="danger"
            className="col-span-2 w-full sm:col-auto sm:w-auto"
            titre="Résilier ce bail ?"
            description="Le bail passera au statut « Terminé » et le lot redeviendra vacant. Les appels de loyer non réglés postérieurs à la date de départ seront supprimés et le dernier mois recalculé au prorata."
            caches={{ id: String(b.id) }}
            libelleConfirmer="Résilier le bail"
            enCours="Résiliation…"
          >
            <Field label="Date de fin effective" name="dateFinEffective" requis hint="Date du départ du locataire.">
              <Input name="dateFinEffective" type="date" defaultValue={toISODate(auj)} required />
            </Field>
          </ActionDialogue>
        </>
      )}
    </div>
  );

  return (
    <>
      <PageHeader
        titre={`${b.lot.nom} · ${locataire}`}
        sousTitre={`${TYPES_BAIL_COURT[b.type]} · du ${formatDate(b.dateDebut)} au ${formatDate(b.dateFinEffective ?? b.dateFin)} · ${STATUTS_BAIL_COURT[b.statut]}`}
        retour={{ href: "/baux", libelle: "Baux" }}
        actions={actions}
      />
      <Flash sp={sp} />

      <div className="flex flex-col gap-6">
        {!b.lot.bailleur && (
          <Alerte ton="orange" titre="Bailleur non renseigné">
            Le lot n'a pas de bailleur : indiquez-le dans <Link href={`/lots/${b.lot.id}/modifier`} className="underline">la fiche du lot</Link> pour que les avis d'échéance et quittances soient complets.
          </Alerte>
        )}
        {resteDu > 0 && (
          <Alerte ton="rouge" titre={`Impayés : ${formatEuros(resteDu)}`}>
            {pluriel(impayes.length, "échéance en retard ou partiellement réglée", "échéances en retard ou partiellement réglées")}. <Link href={`/loyers?bailId=${b.id}`} className="underline">Voir les loyers</Link>.
          </Alerte>
        )}

        <Stepper etapes={ETAPES.map((s) => STATUTS_BAIL_COURT[s])} courant={ETAPES.indexOf(b.statut)} />

        <div className="grid grid-cols-1 gap-6 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] md:grid-rows-[auto_auto_1fr] md:items-start">
          <Stat sombre libelle="Loyer mensuel charges comprises" valeur={formatEuros(loyerCC)} detail={`${formatEuros(b.loyerHC)} HC + ${formatEuros(b.charges)} de charges · le ${b.jourEcheance} du mois`} className="md:col-start-2 md:row-start-3" />

          <Card className="min-w-0 md:col-start-1 md:row-start-1 md:row-span-3">
            <Onglets
              items={[
                { href: lienOnglet("contrat"), libelle: "Contrat", actif: onglet === "contrat" },
                { href: lienOnglet("loyers"), libelle: `Loyers${b.appels.length ? ` (${b.appels.length})` : ""}`, actif: onglet === "loyers" },
                { href: lienOnglet("courriers"), libelle: `Courriers${b.courriers.length ? ` (${b.courriers.length})` : ""}`, actif: onglet === "courriers" },
                { href: lienOnglet("revisions"), libelle: "Révisions", actif: onglet === "revisions" },
              ]}
            />

            {onglet === "contrat" && (
              <>
                <div className="p-5">
                  <Infos
                    colonnes={3}
                    items={[
                      { label: "Type de bail", valeur: TYPES_BAIL[b.type] },
                      { label: "Durée", valeur: `${dureeEnMois(b.dateDebut, b.dateFin)} mois` },
                      { label: "Début", valeur: formatDate(b.dateDebut) },
                      { label: "Fin", valeur: `${formatDate(b.dateFin)}${reconduit ? " · reconduit tacitement" : ""}` },
                      ...(b.dateFinEffective ? [{ label: "Fin effective", valeur: formatDate(b.dateFinEffective) }] : []),
                      { label: "Loyer hors charges", valeur: formatEuros(b.loyerHC) },
                      { label: "Charges", valeur: b.charges > 0 ? `${formatEuros(b.charges)} · ${b.chargesForfait ? "forfait" : "provision régularisée chaque année"}` : "Aucune" },
                      { label: "Dépôt de garantie", valeur: b.depotGarantie > 0 ? formatEuros(b.depotGarantie) : "Aucun" },
                      { label: "Indice de référence", valeur: regle.revisionIRL ? indice : "Non applicable (bail mobilité)" },
                      { label: "Jour d'échéance", valeur: `Le ${b.jourEcheance} de chaque mois` },
                      { label: "Signé le", valeur: b.dateSignature ? `${formatDate(b.dateSignature)}${b.signatureRef ? ` · réf. ${b.signatureRef}` : ""}` : null },
                      ...(b.type === "MOBILITE" ? [{ label: "Motif du bail mobilité", valeur: b.motifMobilite }] : []),
                      ...(regle.revisionIRL ? [{ label: "Révision du loyer", valeur: b.clauseRevision ? "Annuelle sur l'IRL" : "Pas de clause de révision" }] : []),
                      { label: "Bailleur", valeur: b.lot.bailleur ? <Link href={`/bailleurs/${b.lot.bailleur.id}`} className="text-navy-800 hover:underline">{b.lot.bailleur.nom}</Link> : <span className="text-amber-700">Non renseigné</span> },
                      ...(b.notes ? [{ label: "Notes", valeur: <span className="whitespace-pre-line">{b.notes}</span> }] : []),
                    ]}
                  />
                  <p className="mt-4 text-xs text-slate-500">{regle.resume} Préavis du locataire : {regle.preavisLocataire}.</p>
                </div>
                <div className="flex flex-col gap-3 px-5 pb-5">
                  <div className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-3">
                    <IconeFichier taille={20} className="shrink-0 text-slate-600" />
                    <span className="min-w-[160px] flex-1 text-sm">
                      <strong className="text-navy-900">Contrat de bail</strong> · <span className="text-slate-500">{contratEtat}</span>
                    </span>
                    <ButtonLink href={`/baux/${b.id}/contrat`} variante="secondary" taille="sm">{b.texteContrat ? "Ouvrir" : "Générer"}</ButtonLink>
                  </div>
                  {b.statut === "BROUILLON" && (
                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-navy-200 bg-navy-50 px-3.5 py-3 text-sm text-navy-800">
                      <span className="min-w-[200px] flex-1">
                        <span className="font-bold">Signature électronique.</span> Générez le contrat, envoyez-le en signature dans Omniup Sign puis marquez le bail comme signé. Contrat signé sur papier ? Marquez-le directement.
                      </span>
                      {dialogueSignature("secondary", "sm")}
                    </div>
                  )}
                  {b.statut === "EN_SIGNATURE" && (
                    <Alerte ton="orange" titre={`En attente de signature dans Omniup Sign${b.signatureRef ? ` · réf. ${b.signatureRef}` : ""}`}>
                      Une fois la signature reçue, marquez le bail comme signé : les appels de loyer seront émis automatiquement. Le contrat peut encore être modifié après un retour en brouillon.
                    </Alerte>
                  )}
                  {b.statut === "SIGNE" && (
                    <Alerte ton="vert" titre={`Bail signé${b.dateSignature ? ` le ${formatDate(b.dateSignature)}` : ""}${b.signatureRef ? ` · réf. ${b.signatureRef}` : ""}`}>
                      Les avis d'échéance sont émis automatiquement avant chaque échéance.{reconduit && ` Le bail est reconduit tacitement depuis le ${formatDate(b.dateFin)}.`}
                    </Alerte>
                  )}
                  {b.statut === "TERMINE" && (
                    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-600">
                      <span className="font-bold text-navy-900">Bail terminé le {formatDate(b.dateFinEffective ?? b.dateFin)}.</span> Les appels de loyer restent consultables dans l'onglet Loyers ; pensez à restituer le dépôt de garantie.
                    </div>
                  )}
                </div>
                <div className="border-t border-slate-100 px-5 py-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-bold text-navy-900">Documents du bail{b.documents.length ? ` (${b.documents.length})` : ""}</h3>
                      <p className="text-xs text-slate-500">Avenants, renouvellements, résiliations, actes de caution… établis à partir des modèles.</p>
                    </div>
                    <ButtonLink href={`/modeles?bailId=${b.id}`} taille="sm" variante="secondary">Générer depuis un modèle</ButtonLink>
                  </div>
                  {b.documents.length > 0 && (
                    <ul className="mt-3 divide-y divide-slate-100 rounded-lg border border-slate-200">
                      {b.documents.map((d) => (
                        <li key={d.id}>
                          <Link href={`/documents/${d.id}`} className="flex items-center justify-between gap-3 px-3.5 py-2.5 hover:bg-slate-50">
                            <span className="min-w-0">
                              <span className="block truncate text-sm font-semibold text-navy-900">{d.titre}</span>
                              <span className="block text-xs text-slate-500">{formatDate(d.createdAt)} · {CATEGORIES_MODELE[d.categorie]}</span>
                            </span>
                            {d.dateEnvoi ? <Badge ton="vert">Envoyé le {formatDate(d.dateEnvoi)}</Badge> : <Badge ton="gris">Non envoyé</Badge>}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </>
            )}

            {onglet === "loyers" &&
              (b.appels.length === 0 ? (
                <div className="px-5 py-8 text-center">
                  <p className="text-[15px] font-bold text-navy-900">Aucun appel de loyer</p>
                  <p className="mt-1 text-[13px] text-slate-500">{b.statut === "BROUILLON" || b.statut === "EN_SIGNATURE" ? "Les appels sont générés une fois le bail signé." : "Les appels de loyer sont émis automatiquement quelques jours avant chaque échéance."}</p>
                </div>
              ) : (
                <>
                  <Tableau>
                    <thead className="bg-slate-50">
                      <tr><Th>Période</Th><Th>Échéance</Th><Th droite>Montant</Th><Th droite>Réglé</Th><Th>Statut</Th></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {etats.map(({ appel, etat }) => (
                        <tr key={appel.id} className="hover:bg-slate-50">
                          <Td>
                            <Link href={`/loyers/${appel.id}`} className="font-semibold text-navy-900 hover:underline">{formatPeriode(appel.periode)}</Link>
                            {appel.prorata && <Badge ton="gris" className="ml-2">prorata</Badge>}
                          </Td>
                          <Td className="whitespace-nowrap text-slate-600 tabular-nums">{formatDate(appel.dateEcheance)}</Td>
                          <Td droite>{formatEuros(appel.total)}</Td>
                          <Td droite>{formatEuros(etat.regle)}</Td>
                          <Td><BadgeStatutAppel statut={etat.statut} /></Td>
                        </tr>
                      ))}
                    </tbody>
                  </Tableau>
                  <TableauPied pagination={false}>
                    {pluriel(b.appels.length, "appel de loyer", "appels de loyer")} · <Link href={`/loyers?bailId=${b.id}`} className="font-semibold text-navy-800 hover:underline">Gérer les loyers et quittances</Link>
                  </TableauPied>
                </>
              ))}

            {onglet === "courriers" &&
              (b.courriers.length === 0 ? (
                <div className="px-5 py-8 text-center">
                  <p className="text-[15px] font-bold text-navy-900">Aucun courrier</p>
                  <p className="mb-3 mt-1 text-[13px] text-slate-500">Révision de loyer, relance d'impayé ou courrier libre.</p>
                  <ButtonLink href={`/baux/${b.id}/courriers/nouveau`} variante="secondary">Rédiger un courrier</ButtonLink>
                </div>
              ) : (
                <>
                  <ul className="p-2">
                    {b.courriers.map((c) => (
                      <li key={c.id}>
                        <Link href={`/courriers/${c.id}`} className="flex items-center justify-between gap-3 rounded-lg p-3 hover:bg-slate-50">
                          <span className="min-w-0">
                            <span className="block truncate font-semibold text-navy-900">{c.objet}</span>
                            <span className="block text-xs text-slate-500">{formatDate(c.createdAt)} · {TYPES_COURRIER[c.type]}</span>
                          </span>
                          {c.dateEnvoi ? <Badge ton="vert">Envoyé le {formatDate(c.dateEnvoi)}</Badge> : <Badge ton="gris">Non envoyé</Badge>}
                        </Link>
                      </li>
                    ))}
                  </ul>
                  <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-4 py-2.5 text-[13px] text-slate-500">
                    <span>{pluriel(b.courriers.length, "courrier", "courriers")}</span>
                    <ButtonLink href={`/baux/${b.id}/courriers/nouveau`} taille="sm" variante="secondary">Nouveau courrier</ButtonLink>
                  </div>
                </>
              ))}

            {onglet === "revisions" && (
              <div className="p-5">
                {regle.revisionIRL ? (
                  <>
                    <p className="mb-3 text-sm text-slate-600">Le loyer est révisable chaque année à la date anniversaire du bail, selon l'évolution de l'indice de référence des loyers (IRL) publié par l'INSEE.</p>
                    <Tableau className="rounded-lg border border-slate-200">
                      <thead className="bg-slate-50">
                        <tr><Th>Date</Th><Th>Indice</Th><Th droite>Loyer HC</Th><Th /></tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        <tr>
                          <Td className="tabular-nums">{formatDate(b.dateDebut)}</Td>
                          <Td className="text-slate-600">{b.revisions[0] ? `IRL ${b.revisions[0].irlAncienTrimestre ?? ""} · ${formatNombre(b.revisions[0].irlAncienValeur)}`.replace("  ", " ") : (indice ?? "—")}</Td>
                          <Td droite>{formatEuros(b.revisions[0]?.ancienLoyer ?? b.loyerHC)}</Td>
                          <Td className="text-xs text-slate-500">Loyer initial</Td>
                        </tr>
                        {b.revisions.map((r) => (
                          <tr key={r.id} className="hover:bg-slate-50">
                            <Td className="tabular-nums">{formatDate(r.dateEffet)}</Td>
                            <Td className="text-slate-600">IRL {r.irlNouveauTrimestre ?? ""}{r.irlNouveauTrimestre ? " · " : ""}{formatNombre(r.irlNouveauValeur)}</Td>
                            <Td droite className="font-semibold">{formatEuros(r.nouveauLoyer)}</Td>
                            <Td droite><ButtonLink href={`/baux/${b.id}/courriers/nouveau?type=REVISION_LOYER&revisionId=${r.id}`} taille="sm" variante="secondary">Courrier</ButtonLink></Td>
                          </tr>
                        ))}
                      </tbody>
                    </Tableau>
                    <div className="mt-3.5 flex flex-wrap items-center gap-3">
                      {peutReviser && <ButtonLink href={`/baux/${b.id}/revision`} variante="secondary">Calculer une révision</ButtonLink>}
                      <p className="text-[13px] text-slate-500">
                        {peutReviser && prochaineRevision
                          ? `Prochaine révision possible à partir du ${formatDate(prochaineRevision)}.`
                          : !b.clauseRevision
                            ? "Ce bail ne comporte pas de clause de révision annuelle."
                            : b.statut === "TERMINE"
                              ? "Bail terminé : le loyer n'est plus révisable."
                              : "La révision annuelle sera possible une fois le bail signé."}
                      </p>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-slate-600">Le loyer d'un bail mobilité ne peut pas être révisé en cours de bail.</p>
                )}
              </div>
            )}
          </Card>

          <Card className="md:col-start-2 md:row-start-1">
            <CardHeader titre={b.locataires.length > 1 ? `Locataires (${b.locataires.length})` : "Locataire"} />
            <ul className="divide-y divide-slate-100 overflow-hidden rounded-b-xl">
              {b.locataires.map((l) => (
                <li key={l.id}>
                  <Link href={`/locataires/${l.id}`} className="block px-5 py-3.5 hover:bg-slate-50">
                    <div className="font-semibold text-navy-900">{nomComplet(l)}</div>
                    {l.email ? <div className="mt-0.5 break-all text-[13px] text-slate-500">{l.email}</div> : <div className="mt-0.5 text-[13px] text-amber-700">Email non renseigné (nécessaire aux envois)</div>}
                    {l.telephone && <div className="text-[13px] text-slate-500">{l.telephone}</div>}
                  </Link>
                </li>
              ))}
              {b.locataires.length > 1 && <li className="px-5 py-2.5 text-xs text-slate-500">Titulaires solidaires du bail : les avis, quittances et courriers sont adressés à chacun.</li>}
            </ul>
          </Card>

          <Card className="md:col-start-2 md:row-start-2">
            <CardHeader titre="Lot" />
            <Link href={`/lots/${b.lot.id}`} className="block rounded-b-xl px-5 py-4 hover:bg-slate-50">
              <div className="font-semibold text-navy-900">{b.lot.nom}</div>
              <div className="mt-0.5 text-[13px] text-slate-500">{adresseSurUneLigne(b.lot)}</div>
              <div className="text-[13px] text-slate-500">
                {[TYPES_LOT[b.lot.type], b.lot.surface !== null ? `${formatNombre(b.lot.surface, b.lot.surface % 1 === 0 ? 0 : 1)} m²` : null, b.lot.nbPieces !== null ? pluriel(b.lot.nbPieces, "pièce", "pièces") : null, b.lot.meuble ? "meublé" : null].filter(Boolean).join(" · ")}
              </div>
            </Link>
          </Card>
        </div>
      </div>
    </>
  );
}
