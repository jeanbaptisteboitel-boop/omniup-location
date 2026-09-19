import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { entierParam, texteParam, type SearchParams } from "@/lib/params";
import { aujourdhui, formatDate, formatPeriode, periodeDe } from "@/lib/dates";
import { formatEuros, somme } from "@/lib/montants";
import { etatAppel, numeroAppel, type StatutAppel } from "@/lib/loyers";
import { joursAvanceAvis, synchroniserAppelsLoyer } from "@/lib/loyers-sync";
import { includeAppel } from "@/lib/pdf/donnees";
import { mailConfigure } from "@/lib/mail";
import { envoyerAvisEnAttente, genererAppelsMaintenant } from "@/actions/loyers";
import { Button, ButtonLink, Card, EmptyState, Filtres, PageHeader, Tableau, TableauPied, Td, Th } from "@/components/ui";
import { Select } from "@/components/form";
import { FiltresForm } from "@/components/filtres-form";
import { Flash } from "@/components/flash";
import { BadgeStatutAppel, LIBELLES_STATUT_APPEL } from "@/components/loyers/badge-statut";
import { EtatAvis, EtatQuittance } from "@/components/loyers/etat-envoi";
import { entiteCouranteId } from "@/lib/entite";
import { emailsLocataires, nomsLocataires } from "@/lib/locataires";

export const metadata = { title: "Loyers et quittances" };

const STATUTS: StatutAppel[] = ["PAYE", "PARTIEL", "A_PAYER", "EN_RETARD"];

export default async function LoyersPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  await synchroniserAppelsLoyer();
  const auj = aujourdhui();
  const statutDemande = texteParam(sp, "statut") as StatutAppel | null;
  const filtreStatut = statutDemande && STATUTS.includes(statutDemande) ? statutDemande : null;
  const bailId = entierParam(sp, "bailId");
  const lotId = entierParam(sp, "lotId");
  const periode = texteParam(sp, "periode");
  const entiteId = await entiteCouranteId();

  // Tous les appels de l'entité : le résumé et les listes déroulantes portent sur l'ensemble, le tableau sur la sélection.
  const appels = await prisma.appelLoyer.findMany({ where: { bail: { entiteId } }, include: includeAppel, orderBy: [{ periode: "desc" }, { dateEcheance: "asc" }, { id: "desc" }] });
  const lignes = appels.map((a) => ({ a, etat: etatAppel(a, auj) }));
  const filtrees = lignes.filter(
    ({ a, etat }) => (!filtreStatut || etat.statut === filtreStatut) && (!bailId || a.bailId === bailId) && (!lotId || a.bail.lotId === lotId) && (!periode || a.periode === periode),
  );
  const filtreActif = !!(filtreStatut || bailId || lotId || periode);

  const periodeCourante = periodeDe(auj);
  const duMois = lignes.filter((l) => l.a.periode === periodeCourante);
  const appelesDuMois = somme(duMois.map((l) => l.a.total));
  const encaissesDuMois = somme(duMois.map((l) => l.etat.regle));
  const enRetardDuMois = duMois.filter((l) => l.etat.statut === "EN_RETARD").length;
  const avisEnAttente = lignes.filter((l) => !l.a.dateEnvoiAvis && emailsLocataires(l.a.bail.locataires).length > 0).length;

  const periodes = Array.from(new Set(lignes.map((l) => l.a.periode))).sort((x, y) => (x < y ? 1 : -1));
  const lots = Array.from(new Map(lignes.map((l) => [l.a.bail.lotId, l.a.bail.lot.nom])).entries())
    .map(([id, nom]) => ({ value: String(id), label: nom }))
    .sort((x, y) => x.label.localeCompare(y.label, "fr"));

  const totalMontant = somme(filtrees.map((l) => l.a.total));
  const totalRegle = somme(filtrees.map((l) => l.etat.regle));
  const pluriel = filtrees.length > 1 ? "s" : "";

  return (
    <>
      <PageHeader
        titre="Loyers et quittances"
        sousTitre={`${formatPeriode(periodeCourante)} : ${formatEuros(appelesDuMois)} appelés · ${formatEuros(encaissesDuMois)} encaissés · ${enRetardDuMois} en retard`}
        actions={
          <>
            {mailConfigure() &&
              (avisEnAttente > 0 ? (
                <form action={envoyerAvisEnAttente}>
                  <Button type="submit" variante="secondary">Envoyer les {avisEnAttente} avis en attente</Button>
                </form>
              ) : (
                <Button type="button" variante="secondary" disabled title="Aucun avis d'échéance en attente d'envoi">Tous les avis sont envoyés</Button>
              ))}
            <form action={genererAppelsMaintenant}>
              <Button type="submit">Émettre les appels du moment</Button>
            </form>
          </>
        }
      />
      <Flash sp={sp} />

      <Filtres>
        <FiltresForm>
          {bailId && <input type="hidden" name="bailId" value={bailId} />}
          <div>
            <Select name="periode" aria-label="Période" defaultValue={periode ?? ""} vide="Toutes les périodes" options={periodes.map((p) => ({ value: p, label: formatPeriode(p) }))} />
          </div>
          <div>
            <Select name="statut" aria-label="Statut" defaultValue={filtreStatut ?? ""} vide="Tous les statuts" options={STATUTS.map((s) => ({ value: s, label: LIBELLES_STATUT_APPEL[s] }))} />
          </div>
          <div>
            <Select name="lotId" aria-label="Lot" defaultValue={lotId ? String(lotId) : ""} vide="Tous les lots" options={lots} className="min-w-[200px]" />
          </div>
          {filtreActif && <ButtonLink href="/loyers" variante="ghost">Réinitialiser</ButtonLink>}
        </FiltresForm>
      </Filtres>

      {filtrees.length === 0 ? (
        <EmptyState
          titre="Aucun appel de loyer"
          description={
            lignes.length === 0
              ? `Les appels de loyer sont émis automatiquement pour chaque bail signé, ${joursAvanceAvis()} jours avant le début du mois.`
              : `Aucune échéance ne correspond à ces filtres. Les appels sont émis automatiquement pour les baux signés, ${joursAvanceAvis()} jours avant le début de chaque mois.`
          }
          action={lignes.length === 0 ? <ButtonLink href="/baux" variante="secondary">Voir les baux</ButtonLink> : <ButtonLink href="/loyers" variante="secondary">Réinitialiser les filtres</ButtonLink>}
        />
      ) : (
        <>
          {/* Tableau (écrans moyens et larges) */}
          <Card className="hidden md:block">
            <Tableau>
              <thead className="bg-slate-50">
                <tr>
                  <Th>Période</Th>
                  <Th>Lot / locataire</Th>
                  <Th>Échéance</Th>
                  <Th droite>Montant</Th>
                  <Th droite>Réglé</Th>
                  <Th>Statut</Th>
                  <Th>Avis</Th>
                  <Th>Quittance</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtrees.map(({ a, etat }) => (
                  <tr key={a.id} className="hover:bg-slate-50">
                    <Td className="whitespace-nowrap">
                      <Link href={`/loyers/${a.id}`} className="font-semibold text-navy-900 hover:underline">{formatPeriode(a.periode)}</Link>
                      <span className="block text-xs text-slate-500">{numeroAppel(a.id)}{a.prorata ? " · prorata" : ""}</span>
                    </Td>
                    <Td>
                      <Link href={`/baux/${a.bailId}`} className="font-semibold text-navy-900 hover:underline">{a.bail.lot.nom}</Link>
                      <span className="block text-xs text-slate-500">{nomsLocataires(a.bail.locataires)}</span>
                    </Td>
                    <Td className="text-slate-600 tabular-nums">{formatDate(a.dateEcheance)}</Td>
                    <Td droite className="font-semibold">{formatEuros(a.total)}</Td>
                    <Td droite className="text-slate-600">{formatEuros(etat.regle)}</Td>
                    <Td><BadgeStatutAppel statut={etat.statut} /></Td>
                    <Td className="whitespace-nowrap"><EtatAvis date={a.dateEnvoiAvis} /></Td>
                    <Td className="whitespace-nowrap"><EtatQuittance date={a.dateEnvoiQuittance} paye={etat.statut === "PAYE"} /></Td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-200 bg-slate-50">
                  <td colSpan={3} className="px-4 py-2.5 text-[13px] font-semibold text-slate-600">{filtrees.length} échéance{pluriel}</td>
                  <td className="px-4 py-2.5 text-right font-bold tabular-nums">{formatEuros(totalMontant)}</td>
                  <td className="px-4 py-2.5 text-right font-bold tabular-nums">{formatEuros(totalRegle)}</td>
                  <td colSpan={3} />
                </tr>
              </tfoot>
            </Tableau>
            <TableauPied>{filtrees.length} échéance{pluriel} · page 1 sur 1</TableauPied>
          </Card>

          {/* Cartes empilées (mobile) */}
          <div className="flex flex-col gap-3.5 md:hidden">
            {filtrees.map(({ a, etat }) => (
              <Link key={a.id} href={`/loyers/${a.id}`} className="flex flex-col gap-2.5 rounded-xl border border-slate-200 bg-white px-4 py-3.5 shadow-card">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-semibold text-navy-900">{a.bail.lot.nom}</div>
                    <div className="text-xs text-slate-500">{nomsLocataires(a.bail.locataires)} · {formatPeriode(a.periode)}</div>
                  </div>
                  <BadgeStatutAppel statut={etat.statut} />
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs text-slate-500">
                  <div>Échéance<br /><strong className="text-[13px] text-slate-900">{formatDate(a.dateEcheance)}</strong></div>
                  <div>Montant<br /><strong className="text-[13px] text-slate-900 tabular-nums">{formatEuros(a.total)}</strong></div>
                  <div>Réglé<br /><strong className="text-[13px] text-slate-900 tabular-nums">{formatEuros(etat.regle)}</strong></div>
                </div>
                <div className="flex items-center justify-between border-t border-slate-100 pt-2.5 text-xs">
                  <EtatAvis date={a.dateEnvoiAvis} className="text-xs" />
                  <EtatQuittance date={a.dateEnvoiQuittance} paye={etat.statut === "PAYE"} className="text-xs" />
                </div>
              </Link>
            ))}
            <p className="text-center text-[13px] text-slate-500">{filtrees.length} échéance{pluriel} · {formatEuros(totalMontant)} appelés · {formatEuros(totalRegle)} réglés</p>
          </div>
        </>
      )}
    </>
  );
}

// Durée maximale d'exécution sur Vercel (rédaction IA, OCR, envois d'emails).
export const maxDuration = 300;
