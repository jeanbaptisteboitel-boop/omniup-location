import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { entierParam, idDepuis, type ParamsId, type SearchParams } from "@/lib/params";
import { aujourdhui, formatDate } from "@/lib/dates";
import { formatEuros, formatNombre, somme } from "@/lib/montants";
import { totauxParAnnee } from "@/lib/emprunts";
import { mistralConfigure } from "@/lib/mistral-config";
import { analyserFichierEcheancier, genererEcheancierEmprunt, importerEcheancier, supprimerEcheancier, supprimerEmprunt } from "@/actions/emprunts";
import { Button, ButtonLink, Card, CardHeader, PageHeader, Stat, Tableau, Td, Th } from "@/components/ui";
import { Select } from "@/components/form";
import { FiltresForm } from "@/components/filtres-form";
import { ConfirmForm } from "@/components/confirm-form";
import { Flash } from "@/components/flash";
import { ImportEcheancier } from "@/components/emprunts/import-echeancier";
import { ReglesImport } from "@/components/emprunts/regles-import";
import { capitalRestantDu, dureeLisible } from "@/components/emprunts/calculs";
import { entiteCouranteId } from "@/lib/entite";

export default async function EmpruntPage({ params, searchParams }: { params: ParamsId; searchParams: SearchParams }) {
  const id = await idDepuis(params);
  const sp = await searchParams;
  const e = await prisma.emprunt.findFirst({ where: { id, entiteId: await entiteCouranteId() }, include: { lot: true, immeuble: true, echeances: { orderBy: { date: "asc" } } } });
  if (!e) notFound();
  const auj = aujourdhui();
  const anneeCourante = auj.getUTCFullYear();
  const annees = Array.from(new Set(e.echeances.map((x) => x.date.getUTCFullYear()))).sort((x, y) => y - x);
  // Année affichée : celle demandée, sinon l'année en cours, sinon la dernière année couverte par l'échéancier.
  const anneeDemandee = entierParam(sp, "annee");
  const annee = anneeDemandee ?? (annees.includes(anneeCourante) || annees.length === 0 ? anneeCourante : annees[0]);
  const lignes = e.echeances.filter((x) => x.date.getUTCFullYear() === annee);
  const totaux = totauxParAnnee(e.echeances, annee);
  const crd = capitalRestantDu(e, auj);
  const peutGenerer = e.tauxAnnuel !== null && !!e.dureeMois && !!e.dateDebut;
  const bien = e.lot ? { href: `/lots/${e.lot.id}`, nom: e.lot.nom } : e.immeuble ? { href: `/immeubles/${e.immeuble.id}`, nom: e.immeuble.nom } : null;
  const duree = dureeLisible(e.dureeMois);
  const premiere = e.echeances[0];
  const derniere = e.echeances[e.echeances.length - 1];

  return (
    <>
      <PageHeader
        retour={{ href: "/emprunts", libelle: "Emprunts" }}
        titre={e.libelle}
        sousTitre={
          <>
            {e.banque ?? "Banque non renseignée"}
            {bien && <> · <Link href={bien.href} className="hover:text-navy-800 hover:underline">{bien.nom}</Link></>}
            {" · "}
            {formatEuros(e.montantInitial)}
            {duree && ` sur ${duree}`}
            {e.tauxAnnuel !== null && ` à ${formatNombre(e.tauxAnnuel)} %`}
            {e.reference && ` · réf. ${e.reference}`}
          </>
        }
        actions={
          <>
            <ButtonLink href={`/emprunts/${e.id}/modifier`} variante="secondary">Modifier</ButtonLink>
            <ConfirmForm action={supprimerEmprunt} titre="Supprimer cet emprunt ?" message={`« ${e.libelle} » et son échéancier seront supprimés ; les intérêts ne seront plus comptés dans la synthèse annuelle.`} libelleConfirmer="Supprimer">
              <input type="hidden" name="id" value={e.id} />
              <Button type="submit" variante="danger">Supprimer</Button>
            </ConfirmForm>
          </>
        }
      />
      <Flash sp={sp} />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat libelle={`Intérêts ${annee}`} valeur={lignes.length ? formatEuros(totaux.interets) : "—"} detail="déductibles" />
        <Stat libelle={`Assurance ${annee}`} valeur={lignes.length ? formatEuros(totaux.assurance) : "—"} detail="déductible" />
        <Stat libelle="Capital restant dû" valeur={crd !== null ? formatEuros(crd) : "—"} detail={crd !== null ? `au ${formatDate(auj)}` : "échéancier à importer"} />
        <Stat libelle="Échéances importées" valeur={`${e.echeances.length}${e.dureeMois ? ` / ${e.dureeMois}` : ""}`} detail={premiere && derniere ? `du ${formatDate(premiere.date)} au ${formatDate(derniere.date)}` : "aucun échéancier importé"} />
      </div>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-6">
          <Card>
            <CardHeader
              titre={`Échéances ${annee}`}
              actions={
                <>
                  <span className="text-[13px] text-slate-500">{lignes.length} ligne{lignes.length > 1 ? "s" : ""}</span>
                  {annees.length > 1 && (
                    <FiltresForm action={`/emprunts/${e.id}`}>
                      <div>
                        <Select name="annee" aria-label="Année" defaultValue={String(annee)} options={annees.map((a) => ({ value: String(a), label: String(a) }))} />
                      </div>
                    </FiltresForm>
                  )}
                </>
              }
            />
            {lignes.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <p className="text-[15px] font-bold text-navy-900">Aucune échéance importée</p>
                <p className="mt-1 text-[13px] text-slate-500">{e.echeances.length ? `L'échéancier ne comporte aucune échéance en ${annee}.` : "Importez l'échéancier de la banque pour calculer les intérêts déductibles."}</p>
              </div>
            ) : (
              <Tableau>
                <thead className="bg-slate-50">
                  <tr>
                    <Th>Date</Th>
                    <Th droite>Capital</Th>
                    <Th droite>Intérêts</Th>
                    <Th droite>Assurance</Th>
                    <Th droite>Total</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {lignes.map((x) => (
                    <tr key={x.id}>
                      <Td className="whitespace-nowrap tabular-nums">{formatDate(x.date)}</Td>
                      <Td droite>{formatEuros(x.capital)}</Td>
                      <Td droite className="font-semibold">{formatEuros(x.interets)}</Td>
                      <Td droite className="text-slate-600">{formatEuros(x.assurance)}</Td>
                      <Td droite>{formatEuros(x.total)}</Td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-slate-200 bg-slate-50">
                    <td className="px-4 py-2.5 font-semibold text-slate-600">Total {annee}</td>
                    <td className="px-4 py-2.5 text-right font-bold tabular-nums">{formatEuros(totaux.capital)}</td>
                    <td className="px-4 py-2.5 text-right font-bold tabular-nums">{formatEuros(totaux.interets)}</td>
                    <td className="px-4 py-2.5 text-right font-bold tabular-nums">{formatEuros(totaux.assurance)}</td>
                    <td className="px-4 py-2.5 text-right font-bold tabular-nums">{formatEuros(totaux.total)}</td>
                  </tr>
                </tfoot>
              </Tableau>
            )}
          </Card>

          {annees.length > 1 && (
            <Card>
              <CardHeader titre="Totaux par année" description="Intérêts et assurance à reporter chaque année sur la déclaration des revenus fonciers." />
              <Tableau>
                <thead className="bg-slate-50">
                  <tr>
                    <Th>Année</Th>
                    <Th droite>Capital remboursé</Th>
                    <Th droite>Intérêts</Th>
                    <Th droite>Assurance</Th>
                    <Th droite>Total payé</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {annees.map((a) => {
                    const t = totauxParAnnee(e.echeances, a);
                    return (
                      <tr key={a} className={a === annee ? "bg-navy-50/50" : "hover:bg-slate-50"}>
                        <Td><Link href={`/emprunts/${e.id}?annee=${a}`} className="font-semibold text-navy-900 hover:underline">{a}</Link></Td>
                        <Td droite>{formatEuros(t.capital)}</Td>
                        <Td droite className="font-semibold">{formatEuros(t.interets)}</Td>
                        <Td droite className="text-slate-600">{formatEuros(t.assurance)}</Td>
                        <Td droite>{formatEuros(t.total)}</Td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-slate-200 bg-slate-50">
                    <td className="px-4 py-2.5 font-semibold text-slate-600">Total</td>
                    <td className="px-4 py-2.5 text-right font-bold tabular-nums">{formatEuros(somme(e.echeances.map((x) => x.capital)))}</td>
                    <td className="px-4 py-2.5 text-right font-bold tabular-nums">{formatEuros(somme(e.echeances.map((x) => x.interets)))}</td>
                    <td className="px-4 py-2.5 text-right font-bold tabular-nums">{formatEuros(somme(e.echeances.map((x) => x.assurance)))}</td>
                    <td className="px-4 py-2.5 text-right font-bold tabular-nums">{formatEuros(somme(e.echeances.map((x) => x.total)))}</td>
                  </tr>
                </tfoot>
              </Tableau>
            </Card>
          )}
        </div>

        <Card>
          <CardHeader titre="Importer l'échéancier" description="Le tableau d'amortissement de la banque est lu automatiquement." />
          <div className="flex flex-col gap-3 px-5 py-4">
            <ImportEcheancier actionAnalyser={analyserFichierEcheancier.bind(null, e.id)} actionImporter={importerEcheancier.bind(null, e.id)} iaConfiguree={mistralConfigure()} aDejaDesEcheances={e.echeances.length > 0} />
            <ReglesImport />
          </div>
          <div className="flex flex-col gap-2.5 border-t border-slate-100 px-5 py-4">
            <p className="text-[13px] text-slate-500">Sans tableau de la banque, un échéancier théorique peut être calculé à partir du taux, de la durée et de la première échéance.</p>
            <div className="flex flex-wrap items-center gap-2">
              <form action={genererEcheancierEmprunt}>
                <input type="hidden" name="id" value={e.id} />
                <Button type="submit" taille="sm" variante="secondary" disabled={!peutGenerer} title={peutGenerer ? undefined : "Renseignez le taux, la durée et la date de première échéance"}>Générer l'échéancier théorique</Button>
              </form>
              {e.echeances.length > 0 && (
                <ConfirmForm action={supprimerEcheancier} titre="Vider l'échéancier ?" message={`Les ${e.echeances.length} échéances de cet emprunt seront supprimées.`} libelleConfirmer="Vider l'échéancier">
                  <input type="hidden" name="id" value={e.id} />
                  <Button type="submit" taille="sm" variante="danger">Vider l'échéancier</Button>
                </ConfirmForm>
              )}
            </div>
          </div>
        </Card>
      </div>
    </>
  );
}

// Durée maximale d'exécution sur Vercel (OCR des échéanciers).
export const maxDuration = 300;
