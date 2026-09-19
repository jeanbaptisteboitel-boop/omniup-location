import "server-only";
import { Prisma, type IndiceSerie } from "@prisma/client";
import { prisma } from "../prisma";
import { envoyerEmail, mailConfigure } from "../mail";
import { formatDateHeure } from "../dates";
import { ErreurInsee, fetchSeries, type OptionsClient } from "./client";
import type { SerieSDMX } from "./parseur";
import { libellePeriode, periodesEcoulees, startPeriodPour } from "./periodes";
import { initialiserSeriesDefaut } from "./series-defaut";
import { planifierUpsert } from "./upsert";

/**
 * Synchronisation des séries suivies avec le service SDMX de l'INSEE :
 * - première synchronisation d'une série : historique complet depuis 2000 ;
 * - synchronisations suivantes : les six dernières observations ;
 * - écriture par « upsert » sur (série, période), révisions journalisées ;
 * - journal d'exécution et alertes (échecs répétés, série sans nouveauté, libellé INSEE modifié).
 */

export type Declencheur = "cron" | "manuel" | "premiere-utilisation";
export type DetailSerie = { code: string; idbank: string; creees: number; misesAJour: number; inchangees: number; erreur?: string };
export type ResultatSync = {
  id: number;
  seriesInterrogees: number;
  observationsCreees: number;
  observationsMisesAJour: number;
  erreurs: string[];
  alertes: string[];
  details: DetailSerie[];
};

export const HISTORIQUE_DEPUIS = 2000;
export const DERNIERES_OBSERVATIONS = 6;
/** Alerte à partir de deux synchronisations en échec d'affilée (soit deux jours avec le cron quotidien). */
const SEUIL_ECHECS = 2;
/** Alerte quand plus de deux périodes complètes se sont écoulées sans nouvelle valeur (série arrêtée ou rebasée). */
const SEUIL_PERIODES_SANS_NOUVEAUTE = 2;

export async function synchroniserIndices(options: { declencheur: Declencheur; codes?: string[]; complet?: boolean; client?: OptionsClient; maintenant?: Date }): Promise<ResultatSync> {
  await initialiserSeriesDefaut();
  const journal = await prisma.indiceSynchronisation.create({ data: { declencheur: options.declencheur } });
  const series = await prisma.indiceSerie.findMany({
    where: { active: true, ...(options.codes?.length ? { code: { in: options.codes.map((c) => c.toUpperCase()) } } : {}) },
    orderBy: { code: "asc" },
  });
  const resultat: ResultatSync = { id: journal.id, seriesInterrogees: series.length, observationsCreees: 0, observationsMisesAJour: 0, erreurs: [], alertes: [], details: [] };

  // Une requête par groupe (même fréquence, même profondeur d'historique), les idbanks étant combinés dans l'URL.
  const groupes = new Map<string, IndiceSerie[]>();
  for (const s of series) {
    const complet = !!options.complet || !s.derniereSync;
    const cle = `${s.frequence}:${complet ? "complet" : "recent"}`;
    groupes.set(cle, [...(groupes.get(cle) ?? []), s]);
  }
  for (const [cle, membres] of groupes) {
    const complet = cle.endsWith(":complet");
    const opts = complet ? { startPeriod: startPeriodPour(membres[0].frequence, HISTORIQUE_DEPUIS) } : { lastNObservations: DERNIERES_OBSERVATIONS };
    let recues: SerieSDMX[] | null = null;
    try {
      recues = await fetchSeries(membres.map((m) => m.idbank), opts, options.client);
    } catch (e) {
      if (membres.length === 1) {
        await marquerEchec(membres[0], e, resultat);
        continue;
      }
      // Le lot a échoué : chaque série est reprise séparément pour isoler un idbank fautif sans bloquer les autres.
      for (const s of membres) {
        try {
          await appliquer(s, (await fetchSeries([s.idbank], opts, options.client))[0], resultat);
        } catch (e2) {
          await marquerEchec(s, e2, resultat);
        }
      }
      continue;
    }
    for (const s of membres) {
      try {
        await appliquer(s, recues.find((r) => r.idbank === s.idbank), resultat);
      } catch (e) {
        await marquerEchec(s, e, resultat);
      }
    }
  }

  const maintenant = options.maintenant ?? new Date();
  for (const s of await prisma.indiceSerie.findMany({ where: { active: true }, orderBy: { code: "asc" } })) {
    if (s.echecsConsecutifs >= SEUIL_ECHECS) resultat.alertes.push(`${s.code} : ${s.echecsConsecutifs} synchronisations en échec d'affilée (${s.dernierEchec ?? "cause inconnue"}).`);
    if (s.dernierePeriode && periodesEcoulees(s.dernierePeriode, maintenant) > SEUIL_PERIODES_SANS_NOUVEAUTE) {
      resultat.alertes.push(`${s.code} : aucune nouvelle valeur depuis ${libellePeriode(s.dernierePeriode)} — série peut-être arrêtée ou rebasée par l'INSEE (vérifier l'idbank ${s.idbank} sur insee.fr et, le cas échéant, ajouter la nouvelle série).`);
    }
  }
  resultat.alertes = Array.from(new Set(resultat.alertes));
  if (resultat.alertes.length) await notifierAlertes(resultat, options.declencheur);
  await prisma.indiceSynchronisation.update({
    where: { id: journal.id },
    data: {
      fin: new Date(),
      seriesInterrogees: resultat.seriesInterrogees,
      observationsCreees: resultat.observationsCreees,
      observationsMisesAJour: resultat.observationsMisesAJour,
      erreurs: resultat.erreurs.join("\n") || null,
      alertes: resultat.alertes.join("\n") || null,
    },
  });
  return resultat;
}

/** Enregistre les observations reçues pour une série (créations, révisions journalisées) et met à jour ses métadonnées. */
async function appliquer(s: IndiceSerie, serie: SerieSDMX | undefined, resultat: ResultatSync): Promise<void> {
  if (!serie) throw new ErreurInsee(`Série ${s.idbank} absente de la réponse de l'INSEE.`);
  if (s.libelleInsee && serie.titre && serie.titre !== s.libelleInsee) {
    resultat.alertes.push(`${s.code} : le libellé INSEE de la série ${s.idbank} a changé (« ${s.libelleInsee} » → « ${serie.titre} »).`);
  }
  const existantes = await prisma.indiceObservation.findMany({
    where: { serieId: s.id, periode: { in: serie.observations.map((o) => o.periode) } },
    select: { periode: true, valeur: true, statut: true },
  });
  const plan = planifierUpsert(existantes.map((e) => ({ periode: e.periode, valeur: e.valeur.toString(), statut: e.statut })), serie.observations);
  const maintenant = new Date();
  const ecritures = [
    ...(plan.aCreer.length
      ? [prisma.indiceObservation.createMany({ data: plan.aCreer.map((o) => ({ serieId: s.id, periode: o.periode, debutPeriode: o.debutPeriode, valeur: new Prisma.Decimal(o.valeur), statut: o.statut, recupereLe: maintenant })), skipDuplicates: true })]
      : []),
    ...plan.aMettreAJour.flatMap((m) => [
      prisma.indiceObservation.update({ where: { serieId_periode: { serieId: s.id, periode: m.periode } }, data: { valeur: new Prisma.Decimal(m.nouvelle.valeur), statut: m.nouvelle.statut, recupereLe: maintenant } }),
      prisma.indiceRevision.create({
        data: { serieId: s.id, periode: m.periode, ancienneValeur: new Prisma.Decimal(m.ancienne.valeur), nouvelleValeur: new Prisma.Decimal(m.nouvelle.valeur), ancienStatut: m.ancienne.statut, nouveauStatut: m.nouvelle.statut },
      }),
    ]),
  ];
  if (ecritures.length) await prisma.$transaction(ecritures);
  const derniere = await prisma.indiceObservation.findFirst({ where: { serieId: s.id }, orderBy: { debutPeriode: "desc" }, select: { periode: true } });
  await prisma.indiceSerie.update({
    where: { id: s.id },
    data: {
      derniereSync: maintenant,
      dernierePeriode: derniere?.periode ?? s.dernierePeriode,
      libelleInsee: serie.titre ?? s.libelleInsee,
      base: s.base ?? (serie.base ? `base ${libellePeriode(serie.base)}` : null),
      echecsConsecutifs: 0,
      dernierEchec: null,
    },
  });
  resultat.observationsCreees += plan.aCreer.length;
  resultat.observationsMisesAJour += plan.aMettreAJour.length;
  resultat.details.push({ code: s.code, idbank: s.idbank, creees: plan.aCreer.length, misesAJour: plan.aMettreAJour.length, inchangees: plan.inchangees });
}

async function marquerEchec(s: IndiceSerie, e: unknown, resultat: ResultatSync): Promise<void> {
  const message = e instanceof Error ? e.message : String(e);
  resultat.erreurs.push(`${s.code} (${s.idbank}) : ${message}`);
  resultat.details.push({ code: s.code, idbank: s.idbank, creees: 0, misesAJour: 0, inchangees: 0, erreur: message });
  await prisma.indiceSerie.update({ where: { id: s.id }, data: { echecsConsecutifs: { increment: 1 }, dernierEchec: message.slice(0, 500) } });
}

/** Alerte par email (ALERTES_EMAIL) quand l'envoi d'emails est configuré ; sinon les alertes restent visibles dans le journal et sur la page Indices. */
async function notifierAlertes(resultat: ResultatSync, declencheur: Declencheur): Promise<void> {
  const destinataire = (process.env.ALERTES_EMAIL ?? "").trim();
  if (!destinataire || !mailConfigure()) return;
  try {
    await envoyerEmail({
      a: destinataire,
      objet: "OMNIUP Location — alerte sur les indices INSEE",
      texte: [
        `Synchronisation des indices INSEE (${declencheur}) du ${formatDateHeure(new Date())} :`,
        "",
        ...resultat.alertes.map((a) => `- ${a}`),
        ...(resultat.erreurs.length ? ["", "Erreurs :", ...resultat.erreurs.map((e) => `- ${e}`)] : []),
        "",
        "Page Indices INSEE de l'application : journal des synchronisations et gestion des séries.",
      ].join("\n"),
    });
  } catch (e) {
    resultat.erreurs.push(`Alerte non envoyée par email : ${e instanceof Error ? e.message : String(e)}`);
  }
}
