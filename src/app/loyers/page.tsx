import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { entierParam, texteParam, type SearchParams } from "@/lib/params";
import { nomComplet } from "@/lib/libelles";
import { aujourdhui, formatDate, formatPeriode, periodeDe } from "@/lib/dates";
import { formatEuros, somme } from "@/lib/montants";
import { STATUTS_APPEL, etatAppel, numeroAppel, type StatutAppel } from "@/lib/loyers";
import { synchroniserAppelsLoyer } from "@/lib/loyers-sync";
import { includeAppel } from "@/lib/pdf/donnees";
import { mailConfigure } from "@/lib/mail";
import { envoyerAvisEnAttente, genererAppelsMaintenant } from "@/actions/loyers";
import { Badge, Button, ButtonLink, Card, EmptyState, PageHeader, Stat, Tableau, Td, Th } from "@/components/ui";
import { Flash } from "@/components/flash";
import { BadgeStatutAppel } from "@/components/loyers/badge-statut";

export const metadata = { title: "Loyers et quittances" };

const STATUTS: StatutAppel[] = ["A_PAYER", "EN_RETARD", "PARTIEL", "PAYE"];

export default async function LoyersPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  await synchroniserAppelsLoyer();
  const auj = aujourdhui();
  const filtreStatut = texteParam(sp, "statut") as StatutAppel | null;
  const bailId = entierParam(sp, "bailId");
  const periode = texteParam(sp, "periode");

  const appels = await prisma.appelLoyer.findMany({ where: { ...(bailId ? { bailId } : {}), ...(periode ? { periode } : {}) }, include: includeAppel, orderBy: [{ periode: "desc" }, { id: "desc" }] });
  const lignes = appels.map((a) => ({ a, etat: etatAppel(a, auj) }));
  const filtrees = filtreStatut && STATUTS.includes(filtreStatut) ? lignes.filter((l) => l.etat.statut === filtreStatut) : lignes;

  const periodeCourante = periodeDe(auj);
  const enRetard = lignes.filter((l) => l.etat.statut === "EN_RETARD");
  const aEncaisser = somme(lignes.filter((l) => l.etat.reste > 0).map((l) => l.etat.reste));
  const encaisseMois = somme(lignes.flatMap((l) => l.a.paiements.filter((p) => periodeDe(p.date) === periodeCourante).map((p) => p.montant)));
  const avisNonEnvoyes = lignes.filter((l) => !l.a.dateEnvoiAvis && l.a.bail.locataire.email).length;
  const compteur = (s: StatutAppel) => lignes.filter((l) => l.etat.statut === s).length;
  const lien = (params: Record<string, string | null>) => {
    const q = new URLSearchParams();
    const base: Record<string, string | null> = { statut: filtreStatut, bailId: bailId ? String(bailId) : null, periode, ...params };
    for (const [k, v] of Object.entries(base)) if (v) q.set(k, v);
    const s = q.toString();
    return `/loyers${s ? `?${s}` : ""}`;
  };

  return (
    <>
      <PageHeader
        titre="Loyers et quittances"
        sousTitre="Appels de loyer émis automatiquement pour les baux signés, paiements et quittances."
        actions={
          <>
            <form action={genererAppelsMaintenant}><Button type="submit" variante="secondary">Émettre les appels du moment</Button></form>
            {mailConfigure() && avisNonEnvoyes > 0 && (
              <form action={envoyerAvisEnAttente}><Button type="submit" variante="accent">Envoyer les {avisNonEnvoyes} avis non envoyés</Button></form>
            )}
          </>
        }
      />
      <Flash sp={sp} />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Stat libelle="Reste à encaisser" valeur={formatEuros(aEncaisser)} detail={`${lignes.filter((l) => l.etat.reste > 0).length} échéance(s) non soldée(s)`} ton="bleu" />
        <Stat libelle="En retard" valeur={formatEuros(somme(enRetard.map((l) => l.etat.reste)))} detail={`${enRetard.length} échéance(s) dépassée(s)`} ton={enRetard.length ? "rouge" : "vert"} />
        <Stat libelle={`Encaissé en ${formatPeriode(periodeCourante).toLowerCase()}`} valeur={formatEuros(encaisseMois)} ton="vert" />
      </div>

      <nav className="mb-4 flex flex-wrap items-center gap-2 text-sm">
        <Link href={lien({ statut: null })} className={`rounded-full px-3 py-1 ${!filtreStatut ? "bg-navy-800 text-white" : "bg-white text-navy-800 ring-1 ring-slate-200 hover:bg-slate-50"}`}>Tous ({lignes.length})</Link>
        {STATUTS.map((s) => (
          <Link key={s} href={lien({ statut: s })} className={`rounded-full px-3 py-1 ${filtreStatut === s ? "bg-navy-800 text-white" : "bg-white text-navy-800 ring-1 ring-slate-200 hover:bg-slate-50"}`}>
            {STATUTS_APPEL[s]} ({compteur(s)})
          </Link>
        ))}
        {(bailId || periode) && <Link href="/loyers" className="ml-2 text-xs text-slate-500 underline">Retirer les filtres{bailId ? " (bail)" : ""}{periode ? ` (${formatPeriode(periode)})` : ""}</Link>}
      </nav>

      {filtrees.length === 0 ? (
        <EmptyState titre="Aucun appel de loyer" description={lignes.length === 0 ? "Les appels de loyer sont émis automatiquement pour chaque bail signé, quelques jours avant l'échéance." : "Aucune échéance ne correspond à ce filtre."} action={lignes.length === 0 ? <ButtonLink href="/baux">Voir les baux</ButtonLink> : undefined} />
      ) : (
        <Card>
          <Tableau>
            <thead className="bg-slate-50"><tr><Th>Période</Th><Th>Lot / locataire</Th><Th>Échéance</Th><Th droite>Montant</Th><Th droite>Réglé</Th><Th>Statut</Th><Th>Avis</Th><Th>Quittance</Th><Th /></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {filtrees.map(({ a, etat }) => (
                <tr key={a.id} className="hover:bg-slate-50">
                  <Td><Link href={`/loyers/${a.id}`} className="font-medium text-navy-800 hover:underline">{formatPeriode(a.periode)}</Link><span className="block text-xs text-slate-500">{numeroAppel(a.id)}{a.prorata ? " · prorata" : ""}</span></Td>
                  <Td><Link href={`/baux/${a.bailId}`} className="hover:underline">{a.bail.lot.nom}</Link><span className="block text-xs text-slate-500">{nomComplet(a.bail.locataire)}</span></Td>
                  <Td>{formatDate(a.dateEcheance)}</Td>
                  <Td droite>{formatEuros(a.total)}</Td>
                  <Td droite>{formatEuros(etat.regle)}</Td>
                  <Td><BadgeStatutAppel statut={etat.statut} /></Td>
                  <Td>{a.dateEnvoiAvis ? <Badge ton="vert">Envoyé {formatDate(a.dateEnvoiAvis)}</Badge> : <Badge ton="gris">À envoyer</Badge>}</Td>
                  <Td>{a.dateEnvoiQuittance ? <Badge ton="vert">Envoyée {formatDate(a.dateEnvoiQuittance)}</Badge> : etat.statut === "PAYE" ? <Badge ton="orange">À envoyer</Badge> : <span className="text-xs text-slate-400">—</span>}</Td>
                  <Td droite><ButtonLink href={`/loyers/${a.id}`} taille="sm" variante="secondary">Détail</ButtonLink></Td>
                </tr>
              ))}
            </tbody>
          </Tableau>
        </Card>
      )}
    </>
  );
}
