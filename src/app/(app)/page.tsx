import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { STATUTS_BAIL, nomComplet } from "@/lib/libelles";
import { ajouterAnnees, ajouterJours, aujourdhui, formatDate, formatPeriode, jourUTC, periodeDe } from "@/lib/dates";
import { formatEuros, somme } from "@/lib/montants";
import { etatAppel } from "@/lib/loyers";
import { synchroniserAppelsLoyer } from "@/lib/loyers-sync";
import { includeAppel } from "@/lib/pdf/donnees";
import { mailConfigure } from "@/lib/mail";
import { iaConfiguree } from "@/lib/ia-config";
import { ButtonLink, Card, CardBody, CardHeader, PageHeader, Stat } from "@/components/ui";
import { BadgeStatutAppel } from "@/components/loyers/badge-statut";
import { entiteCouranteId } from "@/lib/entite";

export const dynamic = "force-dynamic";

export default async function TableauDeBord() {
  await synchroniserAppelsLoyer();
  const auj = aujourdhui();
  const annee = auj.getUTCFullYear();
  const periode = periodeDe(auj);
  const entiteId = await entiteCouranteId();
  const [lots, nbLocataires, baux, appels, depensesAnnee, nbBailleurs] = await Promise.all([
    prisma.lot.findMany({ where: { entiteId }, include: { baux: { where: { statut: "SIGNE" }, select: { id: true } } } }),
    prisma.locataire.count({ where: { entiteId } }),
    prisma.bail.findMany({ where: { entiteId }, include: { lot: true, locataire: true, revisions: { orderBy: { dateEffet: "desc" }, take: 1 } } }),
    prisma.appelLoyer.findMany({ where: { bail: { entiteId } }, include: includeAppel, orderBy: [{ periode: "desc" }, { id: "desc" }] }),
    prisma.depense.aggregate({ where: { entiteId, date: { gte: jourUTC(annee, 1, 1), lt: jourUTC(annee + 1, 1, 1) } }, _sum: { montant: true } }),
    prisma.bailleur.count({ where: { entiteId } }),
  ]);

  const etats = appels.map((a) => ({ a, etat: etatAppel(a, auj) }));
  const enRetard = etats.filter((x) => x.etat.statut === "EN_RETARD");
  const duMois = etats.filter((x) => x.a.periode === periode);
  const encaisseMois = somme(appels.flatMap((a) => a.paiements.filter((p) => periodeDe(p.date) === periode).map((p) => p.montant)));
  const avisAEnvoyer = etats.filter((x) => !x.a.dateEnvoiAvis);
  const quittancesAEnvoyer = etats.filter((x) => x.etat.statut === "PAYE" && !x.a.dateEnvoiQuittance);
  const lotsLoues = lots.filter((l) => l.baux.length > 0).length;
  const bauxEnCours = baux.filter((b) => b.statut === "BROUILLON" || b.statut === "EN_SIGNATURE");
  const revisionsDues = baux.filter((b) => b.statut === "SIGNE" && b.clauseRevision && b.type !== "MOBILITE" && ajouterAnnees(b.revisions[0]?.dateEffet ?? b.dateDebut, 1).getTime() <= auj.getTime());
  const finsProches = baux.filter((b) => b.statut === "SIGNE" && b.type === "MOBILITE" && b.dateFin.getTime() <= ajouterJours(auj, 45).getTime() && b.dateFin.getTime() >= auj.getTime());
  const premierPas = nbBailleurs === 0 || lots.length === 0 || nbLocataires === 0;

  return (
    <>
      <PageHeader titre="Tableau de bord" sousTitre={`Situation au ${formatDate(auj)}.`} />

      {premierPas && (
        <Card className="mb-6 border-brand-cyan/40">
          <CardHeader titre="Premiers pas" description="Trois étapes pour émettre vos premiers appels de loyer." />
          <CardBody>
            <ol className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
              <li className={`rounded-lg border p-3 ${nbBailleurs ? "border-emerald-200 bg-emerald-50" : "border-slate-200"}`}><span className="font-semibold">1. Bailleur</span> — le propriétaire qui appelle les loyers. {nbBailleurs ? "✓" : <Link href="/bailleurs/nouveau" className="underline">Créer</Link>}</li>
              <li className={`rounded-lg border p-3 ${lots.length ? "border-emerald-200 bg-emerald-50" : "border-slate-200"}`}><span className="font-semibold">2. Lot</span> — appartement ou maison. {lots.length ? "✓" : <Link href="/lots/nouveau" className="underline">Créer</Link>}</li>
              <li className={`rounded-lg border p-3 ${nbLocataires ? "border-emerald-200 bg-emerald-50" : "border-slate-200"}`}><span className="font-semibold">3. Locataire</span> — puis son bail. {nbLocataires ? "✓" : <Link href="/locataires/nouveau" className="underline">Créer</Link>}</li>
            </ol>
          </CardBody>
        </Card>
      )}

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat libelle="Lots" valeur={lots.length} detail={`${lotsLoues} loué${lotsLoues > 1 ? "s" : ""}, ${lots.length - lotsLoues} vacant${lots.length - lotsLoues > 1 ? "s" : ""}`} ton="bleu" />
        <Stat libelle={`Loyers de ${formatPeriode(periode).toLowerCase()}`} valeur={formatEuros(somme(duMois.map((x) => x.a.total)))} detail={`${duMois.length} appel${duMois.length > 1 ? "s" : ""} · encaissé ${formatEuros(encaisseMois)}`} ton="cyan" />
        <Stat libelle="Loyers en retard" valeur={formatEuros(somme(enRetard.map((x) => x.etat.reste)))} detail={`${enRetard.length} échéance${enRetard.length > 1 ? "s" : ""}`} ton={enRetard.length ? "rouge" : "vert"} />
        <Stat libelle={`Dépenses ${annee}`} valeur={formatEuros(depensesAnnee._sum.montant ?? 0)} ton="orange" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader titre="À faire" />
          <CardBody>
            <ul className="space-y-2 text-sm">
              {enRetard.length > 0 && <li>⚠️ <Link href="/loyers?statut=EN_RETARD" className="font-medium text-red-700 underline">{enRetard.length} loyer{enRetard.length > 1 ? "s" : ""} en retard</Link> ({formatEuros(somme(enRetard.map((x) => x.etat.reste)))}) : relancez les locataires.</li>}
              {avisAEnvoyer.length > 0 && <li>📨 <Link href="/loyers" className="font-medium text-navy-800 underline">{avisAEnvoyer.length} avis d'échéance à envoyer</Link>{!mailConfigure() && <span className="text-slate-500"> (envoi d'emails non configuré : téléchargez les PDF)</span>}.</li>}
              {quittancesAEnvoyer.length > 0 && <li>🧾 <Link href="/loyers?statut=PAYE" className="font-medium text-navy-800 underline">{quittancesAEnvoyer.length} quittance{quittancesAEnvoyer.length > 1 ? "s" : ""} à envoyer</Link>.</li>}
              {bauxEnCours.map((b) => (
                <li key={b.id}>✍️ Bail <Link href={`/baux/${b.id}`} className="font-medium text-navy-800 underline">{b.lot.nom} — {nomComplet(b.locataire)}</Link> : {STATUTS_BAIL[b.statut].toLowerCase()}.</li>
              ))}
              {revisionsDues.map((b) => (
                <li key={`rev-${b.id}`}>📈 Révision annuelle possible pour <Link href={`/baux/${b.id}/revision`} className="font-medium text-navy-800 underline">{b.lot.nom} — {nomComplet(b.locataire)}</Link> (depuis le {formatDate(ajouterAnnees(b.revisions[0]?.dateEffet ?? b.dateDebut, 1))}).</li>
              ))}
              {finsProches.map((b) => (
                <li key={`fin-${b.id}`}>⏳ Bail mobilité <Link href={`/baux/${b.id}`} className="font-medium text-navy-800 underline">{b.lot.nom} — {nomComplet(b.locataire)}</Link> se termine le {formatDate(b.dateFin)}.</li>
              ))}
              {!enRetard.length && !avisAEnvoyer.length && !quittancesAEnvoyer.length && !bauxEnCours.length && !revisionsDues.length && !finsProches.length && <li className="text-slate-500">Rien à signaler.</li>}
            </ul>
            {!iaConfiguree() && <p className="mt-4 text-xs text-slate-500">Assistant IA non configuré : renseignez ANTHROPIC_API_KEY pour la rédaction des baux et courriers (voir <Link href="/parametres" className="underline">Paramètres</Link>).</p>}
          </CardBody>
        </Card>

        <Card>
          <CardHeader titre="Derniers appels de loyer" actions={<ButtonLink href="/loyers" taille="sm" variante="secondary">Tous les loyers</ButtonLink>} />
          <CardBody>
            {etats.length === 0 ? (
              <p className="text-sm text-slate-500">Aucun appel de loyer : ils apparaîtront automatiquement pour chaque bail signé.</p>
            ) : (
              <ul className="divide-y divide-slate-100 text-sm">
                {etats.slice(0, 8).map(({ a, etat }) => (
                  <li key={a.id} className="flex items-center justify-between gap-3 py-2">
                    <span className="min-w-0">
                      <Link href={`/loyers/${a.id}`} className="font-medium text-navy-800 hover:underline">{formatPeriode(a.periode)} — {a.bail.lot.nom}</Link>
                      <span className="block truncate text-xs text-slate-500">{nomComplet(a.bail.locataire)} · échéance {formatDate(a.dateEcheance)}</span>
                    </span>
                    <span className="flex shrink-0 items-center gap-2"><span className="tabular-nums">{formatEuros(a.total)}</span><BadgeStatutAppel statut={etat.statut} /></span>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>
    </>
  );
}
