import Link from "next/link";
import type { ReactNode } from "react";
import { prisma } from "@/lib/prisma";
import { ajouterAnnees, ajouterJours, aujourdhui, formatDate, formatPeriode, jourUTC, periodeDe } from "@/lib/dates";
import { formatEuros, somme } from "@/lib/montants";
import { etatAppel } from "@/lib/loyers";
import { synchroniserAppelsLoyer } from "@/lib/loyers-sync";
import { includeAppel } from "@/lib/pdf/donnees";
import { mailConfigure } from "@/lib/mail";
import { iaConfiguree } from "@/lib/ia-config";
import { ButtonLink, Card, CardHeader, PageHeader, Pastille, Stat, Tableau, Td, Th, type Ton } from "@/components/ui";
import { IconeChevronDroite, IconeCoche } from "@/components/icones";
import { BadgeStatutAppel } from "@/components/loyers/badge-statut";
import { entiteCourante } from "@/lib/entite";
import { includeLocataires, nomsLocataires } from "@/lib/locataires";

export const dynamic = "force-dynamic";

type Tache = { cle: string; href: string; ton: Ton; n: ReactNode; texte: ReactNode; detail?: ReactNode };

const pluriel = (n: number, s = "s") => (n > 1 ? s : "");

export default async function TableauDeBord() {
  await synchroniserAppelsLoyer();
  const auj = aujourdhui();
  const annee = auj.getUTCFullYear();
  const periode = periodeDe(auj);
  const entite = await entiteCourante();
  const entiteId = entite.id;
  const [lots, nbLocataires, baux, appels, depensesAnnee, nbImmeubles] = await Promise.all([
    prisma.lot.findMany({ where: { entiteId }, select: { id: true, baux: { where: { statut: "SIGNE" }, select: { id: true } } } }),
    prisma.locataire.count({ where: { entiteId } }),
    prisma.bail.findMany({ where: { entiteId }, include: { lot: true, locataires: includeLocataires, revisions: { orderBy: { dateEffet: "desc" }, take: 1 } } }),
    prisma.appelLoyer.findMany({ where: { bail: { entiteId } }, include: includeAppel, orderBy: [{ periode: "desc" }, { id: "desc" }] }),
    prisma.depense.aggregate({ where: { entiteId, date: { gte: jourUTC(annee, 1, 1), lt: jourUTC(annee + 1, 1, 1) } }, _sum: { montant: true }, _count: { _all: true } }),
    prisma.immeuble.count({ where: { entiteId } }),
  ]);

  const etats = appels.map((a) => ({ a, etat: etatAppel(a, auj) }));
  const enRetard = etats.filter((x) => x.etat.statut === "EN_RETARD");
  const resteRetard = somme(enRetard.map((x) => x.etat.reste));
  const duMois = etats.filter((x) => x.a.periode === periode);
  const encaisseMois = somme(duMois.flatMap((x) => x.a.paiements.map((p) => p.montant)));
  const avisAEnvoyer = etats.filter((x) => !x.a.dateEnvoiAvis);
  const quittancesAEnvoyer = etats.filter((x) => x.etat.statut === "PAYE" && !x.a.dateEnvoiQuittance);
  const lotsLoues = lots.filter((l) => l.baux.length > 0).length;
  const lotsVacants = lots.length - lotsLoues;
  const bauxEnCours = baux.filter((b) => b.statut === "BROUILLON" || b.statut === "EN_SIGNATURE");
  const revisionsDues = baux.filter((b) => b.statut === "SIGNE" && b.clauseRevision && b.type !== "MOBILITE" && ajouterAnnees(b.revisions[0]?.dateEffet ?? b.dateDebut, 1).getTime() <= auj.getTime());
  const finsProches = baux.filter((b) => b.statut === "SIGNE" && b.type === "MOBILITE" && b.dateFin.getTime() <= ajouterJours(auj, 45).getTime() && b.dateFin.getTime() >= auj.getTime());
  const nbDepenses = depensesAnnee._count._all;
  const totalDepenses = depensesAnnee._sum.montant ?? 0;
  const moisLong = formatPeriode(periode).toLowerCase();
  const moisCourt = new Intl.DateTimeFormat("fr-FR", { timeZone: "UTC", month: "short", year: "numeric" }).format(jourUTC(annee, auj.getUTCMonth() + 1, 1));

  const vide = lots.length === 0;
  const etapes = [
    { libelle: "Créer un lot", fait: lots.length > 0, href: "/lots/nouveau", description: "Appartement ou maison, rattaché à un immeuble et à un bailleur." },
    { libelle: "Créer un locataire", fait: nbLocataires > 0, href: "/locataires/nouveau", description: "Coordonnées et dossier : pièce d'identité, avis d'imposition, justificatifs." },
    { libelle: "Créer un bail", fait: baux.length > 0, href: "/baux/nouveau", description: "Le contrat se génère depuis un modèle, puis les appels de loyer suivent chaque mois." },
  ];
  const premierPas = etapes.some((e) => !e.fait);
  const premiereAFaire = etapes.findIndex((e) => !e.fait);

  const taches: Tache[] = [];
  if (avisAEnvoyer.length) {
    taches.push({ cle: "avis", href: "/loyers", ton: "orange", n: avisAEnvoyer.length, texte: "avis d'échéance à envoyer", detail: mailConfigure() ? undefined : "Envoi d'emails non configuré : téléchargez les PDF" });
  }
  if (quittancesAEnvoyer.length) {
    taches.push({ cle: "quittances", href: "/loyers?statut=PAYE", ton: "orange", n: quittancesAEnvoyer.length, texte: `quittance${pluriel(quittancesAEnvoyer.length)} à envoyer` });
  }
  for (const b of bauxEnCours) {
    taches.push({ cle: `bail-${b.id}`, href: `/baux/${b.id}`, ton: "bleu", n: b.lot.nom, texte: b.statut === "EN_SIGNATURE" ? "bail en signature" : "brouillon de bail", detail: nomsLocataires(b.locataires) });
  }
  if (enRetard.length) {
    taches.push({ cle: "retards", href: "/loyers?statut=EN_RETARD", ton: "rouge", n: enRetard.length, texte: `loyer${pluriel(enRetard.length)} en retard`, detail: `${formatEuros(resteRetard)} à relancer` });
  }
  for (const b of revisionsDues) {
    taches.push({ cle: `rev-${b.id}`, href: `/baux/${b.id}/revision`, ton: "bleu", n: b.lot.nom, texte: "révision annuelle du loyer possible", detail: `${nomsLocataires(b.locataires)} · depuis le ${formatDate(ajouterAnnees(b.revisions[0]?.dateEffet ?? b.dateDebut, 1))}` });
  }
  for (const b of finsProches) {
    taches.push({ cle: `fin-${b.id}`, href: `/baux/${b.id}`, ton: "bleu", n: b.lot.nom, texte: `bail mobilité · se termine le ${formatDate(b.dateFin)}`, detail: nomsLocataires(b.locataires) });
  }

  const derniers = etats.slice(0, 8);

  return (
    <>
      <PageHeader
        titre="Tableau de bord"
        sousTitre={
          vide ? (
            "Bienvenue. Votre base est vide pour le moment."
          ) : (
            <>
              {entite.nom} · <span className="max-sm:hidden">{lots.length} lot{pluriel(lots.length)} · situation au </span>
              {formatDate(auj)}
            </>
          )
        }
        actions={
          !vide && (
            <span className="hidden sm:contents">
              <ButtonLink href="/loyers" variante="secondary">Voir les loyers</ButtonLink>
              <ButtonLink href="/baux/nouveau">Nouveau bail</ButtonLink>
            </span>
          )
        }
      />

      {premierPas && (
        <Card className="mb-6">
          <CardHeader titre="Premiers pas" description="Trois étapes pour émettre votre premier appel de loyer." />
          <ol className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-4 px-5 pb-5 pt-2">
            {etapes.map((e, i) => {
              const courante = i === premiereAFaire;
              return (
                <li key={e.href} className="flex flex-col gap-2.5 rounded-xl border border-slate-200 p-5">
                  <span className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${e.fait ? "bg-emerald-100 text-emerald-800" : courante ? "bg-navy-800 text-white" : "bg-navy-50 text-navy-800"}`} aria-label={e.fait ? "Étape réalisée" : `Étape ${i + 1}`}>
                    {e.fait ? <IconeCoche taille={16} /> : i + 1}
                  </span>
                  <strong className="text-[15px] text-navy-900">{e.libelle}</strong>
                  <p className="flex-1 text-[13px] text-slate-500">{e.description}</p>
                  <ButtonLink href={e.href} variante={courante ? "primary" : "secondary"} className="self-start">{e.libelle}</ButtonLink>
                </li>
              );
            })}
          </ol>
        </Card>
      )}

      {!vide && (
        <>
          <div className="mb-4 grid grid-cols-2 gap-2.5 sm:mb-6 sm:grid-cols-[repeat(auto-fit,minmax(220px,1fr))] sm:gap-4 max-sm:[&>div]:px-3.5 max-sm:[&>div]:py-3.5 max-sm:[&>div>p:first-child]:text-[11px] max-sm:[&>div>p:nth-child(2)]:mt-1 max-sm:[&>div>p:nth-child(2)]:text-[22px] max-sm:[&>div>p:nth-child(3)]:mt-0.5 max-sm:[&>div>p:nth-child(3)]:text-xs">
            <Stat libelle="Lots" valeur={lots.length} detail={`${lotsLoues} loué${pluriel(lotsLoues)}, ${lotsVacants} vacant${pluriel(lotsVacants)}`} />
            <Stat
              libelle={
                <>
                  <span className="sm:hidden">Loyers {moisCourt}</span>
                  <span className="max-sm:hidden">Loyers de {moisLong}</span>
                </>
              }
              valeur={formatEuros(somme(duMois.map((x) => x.a.total)))}
              detail={
                <>
                  <span className="max-sm:hidden">{duMois.length} appel{pluriel(duMois.length)} · </span>encaissé {formatEuros(encaisseMois)}
                </>
              }
              ton="cyan"
            />
            <Stat
              libelle={
                <>
                  <span className="sm:hidden">En retard</span>
                  <span className="max-sm:hidden">Loyers en retard</span>
                </>
              }
              valeur={formatEuros(resteRetard)}
              detail={`${enRetard.length} échéance${pluriel(enRetard.length)}`}
              ton={enRetard.length ? "rouge" : "vert"}
            />
            <Stat
              libelle={`Dépenses ${annee}`}
              valeur={formatEuros(totalDepenses)}
              detail={
                <>
                  {nbDepenses} dépense{pluriel(nbDepenses)}
                  {nbImmeubles > 0 && <span className="max-sm:hidden"> sur {nbImmeubles} immeuble{pluriel(nbImmeubles)}</span>}
                </>
              }
            />
          </div>

          <div className="grid grid-cols-1 items-start gap-4 sm:gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
            <Card>
              <CardHeader titre="À faire" />
              {taches.length === 0 ? (
                <p className="px-5 py-4 text-sm text-slate-500">Rien à signaler.</p>
              ) : (
                <ul className="p-2">
                  {taches.map((t) => (
                    <li key={t.cle}>
                      <Link href={t.href} className="flex min-h-[44px] items-center gap-3 rounded-lg px-3 py-2.5 text-slate-900 hover:bg-slate-50">
                        <Pastille ton={t.ton} />
                        <span className="min-w-0 flex-1 text-sm">
                          <strong className="font-bold">{t.n}</strong> {t.texte}
                          {t.detail && <span className="block truncate text-xs text-slate-500">{t.detail}</span>}
                        </span>
                        <IconeChevronDroite taille={16} className="shrink-0 text-slate-400" />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
              {!iaConfiguree() && (
                <p className="border-t border-slate-100 px-5 py-3 text-xs text-slate-500">
                  Assistant IA non configuré : renseignez ANTHROPIC_API_KEY pour la rédaction des baux et courriers (voir <Link href="/parametres" className="underline hover:text-navy-800">Paramètres</Link>).
                </p>
              )}
            </Card>

            <Card className="hidden min-w-0 sm:block">
              <CardHeader
                titre="Derniers appels de loyer"
                description={formatPeriode(periode)}
                actions={
                  <Link href="/loyers" className="text-[13px] font-semibold text-navy-800 hover:text-brand-cyan-dark">
                    Tout voir
                  </Link>
                }
              />
              {derniers.length === 0 ? (
                <p className="px-5 py-8 text-center text-sm text-slate-500">Aucun appel de loyer : ils apparaîtront automatiquement pour chaque bail signé.</p>
              ) : (
                <Tableau>
                  <thead className="bg-slate-50">
                    <tr>
                      <Th>Lot / locataire</Th>
                      <Th>Échéance</Th>
                      <Th droite>Montant</Th>
                      <Th>Statut</Th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {derniers.map(({ a, etat }) => (
                      <tr key={a.id} className="hover:bg-slate-50">
                        <Td className="py-2.5!">
                          <Link href={`/loyers/${a.id}`} className="whitespace-nowrap font-semibold text-navy-900 hover:underline">{a.bail.lot.nom}</Link>
                          <span className="block text-xs text-slate-500">
                            {nomsLocataires(a.bail.locataires)}
                            {a.periode !== periode && ` · ${formatPeriode(a.periode)}`}
                          </span>
                        </Td>
                        <Td className="py-2.5! text-slate-600 tabular-nums">{formatDate(a.dateEcheance)}</Td>
                        <Td droite className="py-2.5! font-semibold">{formatEuros(a.total)}</Td>
                        <Td className="py-2.5!"><BadgeStatutAppel statut={etat.statut} /></Td>
                      </tr>
                    ))}
                  </tbody>
                </Tableau>
              )}
            </Card>

            <div className="sm:hidden">
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="text-[15px] font-bold text-navy-900">Derniers appels de loyer</h2>
                <Link href="/loyers" className="text-[13px] font-semibold text-navy-800">Tout voir</Link>
              </div>
              {derniers.length === 0 ? (
                <p className="mt-4 rounded-xl border border-dashed border-slate-300 bg-white px-4 py-6 text-center text-sm text-slate-500">Aucun appel de loyer : ils apparaîtront automatiquement pour chaque bail signé.</p>
              ) : (
                <ul className="mt-4 flex flex-col gap-4">
                  {derniers.map(({ a, etat }) => (
                    <li key={a.id}>
                      <Link href={`/loyers/${a.id}`} className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-slate-900">
                        <span className="flex items-start justify-between gap-2">
                          <span className="min-w-0">
                            <span className="block font-semibold text-navy-900">{a.bail.lot.nom}</span>
                            <span className="block text-xs text-slate-500">
                              {nomsLocataires(a.bail.locataires)}
                              {a.periode !== periode && ` · ${formatPeriode(a.periode)}`}
                            </span>
                          </span>
                          <BadgeStatutAppel statut={etat.statut} />
                        </span>
                        <span className="flex justify-between text-[13px] text-slate-600">
                          <span>Échéance {formatDate(a.dateEcheance)}</span>
                          <strong className="text-navy-900 tabular-nums">{formatEuros(a.total)}</strong>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="sticky bottom-0 -mx-4 mt-2 bg-[linear-gradient(to_top,#f4f6fa_70%,rgba(244,246,250,0))] px-4 pb-6 pt-3 sm:hidden">
            <Link href="/baux/nouveau" className="flex h-12 w-full items-center justify-center rounded-[10px] bg-navy-800 text-[15px] font-semibold text-white hover:bg-navy-700">
              Nouveau bail
            </Link>
          </div>
        </>
      )}
    </>
  );
}
