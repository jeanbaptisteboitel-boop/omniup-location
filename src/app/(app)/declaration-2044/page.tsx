import Link from "next/link";
import { entierParam, type SearchParams } from "@/lib/params";
import { formatDate } from "@/lib/dates";
import { formatEuros, formatNombre } from "@/lib/montants";
import { CATEGORIES_DEPENSE, TYPES_LOT } from "@/lib/libelles";
import { calculer2044 } from "@/lib/declaration-2044";
import { ABATTEMENT_MICRO_FONCIER, LIBELLES_2044, LIGNES_2044, LIGNES_A_COMPLETER, PLAFOND_DEFICIT_REVENU_GLOBAL, SEUIL_MICRO_FONCIER, type Ligne2044 } from "@/lib/declaration-2044-calcul";
import { entiteCouranteId } from "@/lib/entite";
import { Alerte, Badge, ButtonLink, Card, CardBody, CardHeader, EmptyState, Infos, PageHeader, Stat, Tableau, Td, Th } from "@/components/ui";
import { IconeTelecharger } from "@/components/icones";
import { Select } from "@/components/form";
import { FiltresForm } from "@/components/filtres-form";
import { Flash } from "@/components/flash";

export const metadata = { title: "Aide à la déclaration 2044" };
export const dynamic = "force-dynamic";

const SOUS_TOTAUX: Ligne2044[] = ["215", "240", "261", "263"];
const euros = (x: number) => `${formatNombre(x, 0)} €`;

export default async function Declaration2044Page({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const annee = entierParam(sp, "annee") ?? new Date().getFullYear() - 1;
  const r = await calculer2044(annee, await entiteCouranteId());
  const anneesProposees = Array.from(new Set([...r.annees, annee])).sort((x, y) => y - x);
  const { cases } = r.resultat;
  const vide = r.colonnes.length === 0;
  return (
    <>
      <PageHeader
        titre="Aide à la déclaration 2044"
        sousTitre={`Revenus fonciers ${annee} au régime réel : montants à reporter ligne par ligne sur le formulaire n° 2044, une colonne par immeuble. Les locations meublées relèvent des BIC et sont écartées.`}
        actions={
          <>
            <FiltresForm>
              <div>
                <Select name="annee" aria-label="Année des revenus" defaultValue={String(annee)} options={anneesProposees.map((a) => ({ value: String(a), label: `Revenus ${a}` }))} className="font-semibold" />
              </div>
            </FiltresForm>
            <ButtonLink href={`/api/export/declaration-2044.pdf?annee=${annee}`} title={`État d'aide au remplissage ${annee} en PDF`}><IconeTelecharger taille={16} />État PDF</ButtonLink>
          </>
        }
      />
      <Flash sp={sp} />

      {vide ? (
        <EmptyState titre={`Aucune recette ni dépense de location nue en ${annee}`} description="L'état se construit à partir des paiements encaissés et des dépenses saisies dans l'année pour les lots loués nus (baux non meublés, commerciaux ou professionnels)." />
      ) : (
        <>
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Stat libelle="Recettes brutes (215)" valeur={euros(r.totalCases["215"])} detail="loyers encaissés, hors charges récupérables et hors TVA" ton="cyan" />
            <Stat libelle="Frais et charges (240)" valeur={euros(r.totalCases["240"])} detail="hors intérêts d'emprunt" />
            <Stat libelle="Intérêts d'emprunt (250)" valeur={euros(r.totalCases["250"])} detail="assurance emprunteur comprise" />
            <Stat libelle="Résultat foncier (420)" valeur={euros(r.resultat.ligne420)} detail={cases["4BA"] !== undefined ? "bénéfice · case 4BA de la 2042" : "déficit · cases 4BB et 4BC de la 2042"} sombre />
          </div>

          <Card className="mb-6">
            <CardHeader titre="Report sur la déclaration 2042" description="Cadre 420 à 442 du formulaire : résultat total et, en cas de déficit, répartition entre le revenu global et les revenus fonciers des années suivantes." />
            <CardBody>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Stat libelle="Case 4BA · bénéfice" valeur={euros(cases["4BA"] ?? 0)} detail="revenus fonciers nets imposables" ton={cases["4BA"] ? "vert" : "gris"} />
                <Stat libelle="Case 4BC · déficit sur le revenu global" valeur={euros(cases["4BC"] ?? 0)} detail={`dans la limite de ${formatNombre(PLAFOND_DEFICIT_REVENU_GLOBAL, 0)} € par an`} ton={cases["4BC"] ? "orange" : "gris"} />
                <Stat libelle="Case 4BB · déficit reportable" valeur={euros(cases["4BB"] ?? 0)} detail="sur les revenus fonciers des 10 années suivantes" ton={cases["4BB"] ? "orange" : "gris"} />
              </div>
              <Tableau className="mt-4">
                <thead className="bg-slate-50">
                  <tr><Th>Ligne</Th><Th>Calcul</Th><Th droite>Montant</Th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {r.resultat.etapes.map((e) => (
                    <tr key={e.ligne}>
                      <Td className="font-semibold text-navy-900">{e.ligne}</Td>
                      <Td className="text-slate-600">{e.libelle}</Td>
                      <Td droite className={`whitespace-nowrap ${e.montant < 0 ? "text-red-700" : ""}`}>{euros(e.montant)}</Td>
                    </tr>
                  ))}
                </tbody>
              </Tableau>
              {cases["4BC"] !== undefined && cases["4BC"] > 0 && <p className="mt-3 text-xs text-slate-500">La part du déficit imputée sur le revenu global suppose de conserver le bien en location jusqu'au 31 décembre de la troisième année suivant l'imputation.</p>}
            </CardBody>
          </Card>

          <Card className="mb-6">
            <CardHeader titre="Cadres 210 à 263 : montants par immeuble" description="Euros entiers, comme sur le formulaire (sous-totaux recalculés sur les lignes arrondies). Les lignes grisées ne peuvent pas être calculées par l'application : complétez-les si vous êtes concerné." />
            <Tableau>
              <thead className="bg-slate-50">
                <tr>
                  <Th>Ligne</Th>
                  {r.colonnes.map((c) => (
                    <Th key={c.cle} droite>
                      Immeuble {c.numero}
                      <span className="block font-normal normal-case tracking-normal text-slate-500">{c.nom} · {c.nombreLocaux} loc{c.nombreLocaux > 1 ? "aux" : "al"}</span>
                    </Th>
                  ))}
                  <Th droite>Total</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {LIGNES_2044.map((l) => {
                  const sousTotal = SOUS_TOTAUX.includes(l);
                  const aCompleter = LIGNES_A_COMPLETER.includes(l);
                  return (
                    <tr key={l} className={sousTotal ? "bg-slate-50 font-semibold" : aCompleter ? "text-slate-400" : ""}>
                      <Td>
                        <span className={`mr-2 font-semibold ${sousTotal ? "text-navy-900" : "text-navy-800"}`}>{l}</span>
                        <span className={sousTotal ? "text-navy-900" : aCompleter ? "text-slate-400" : "text-slate-600"}>{LIBELLES_2044[l]}</span>
                        {aCompleter && <span className="ml-2 text-xs italic">à compléter le cas échéant</span>}
                      </Td>
                      {r.colonnes.map((c) => (
                        <Td key={c.cle} droite className={`whitespace-nowrap ${c.cases[l] < 0 ? "text-red-700" : ""}`}>{c.cases[l] !== 0 || !aCompleter ? euros(c.cases[l]) : "—"}</Td>
                      ))}
                      <Td droite className={`whitespace-nowrap font-semibold ${r.totalCases[l] < 0 ? "text-red-700" : ""}`}>{r.totalCases[l] !== 0 || !aCompleter ? euros(r.totalCases[l]) : "—"}</Td>
                    </tr>
                  );
                })}
              </tbody>
            </Tableau>
          </Card>

          {r.colonnes.map((c) => (
            <Card key={c.cle} className="mb-6">
              <CardHeader titre={`Immeuble ${c.numero} · ${c.nom}`} description={c.adresse} />
              <CardBody>
                <Infos
                  colonnes={3}
                  items={[
                    { label: "Lots", valeur: c.lots.map((l) => <span key={l.id} className="block"><Link href={`/lots/${l.id}`} className="text-navy-800 hover:underline">{l.nom}</Link> <span className="text-slate-500">· {TYPES_LOT[l.type].toLowerCase()}</span></span>) },
                    { label: "Locaux loués dans l'année", valeur: `${c.nombreLocaux} (ligne 222 : ${euros(c.cases["222"])})` },
                    { label: "Charges récupérables encaissées", valeur: `${formatEuros(c.chargesRecuperables)} · non retenues (ni en recettes, ni en charges)` },
                    ...(c.tvaCollectee > 0 ? [{ label: "TVA collectée", valeur: `${formatEuros(c.tvaCollectee)} · hors revenus fonciers` }] : []),
                    { label: "Résultat de l'immeuble (263)", valeur: <span className={c.cases["263"] < 0 ? "text-red-700" : ""}>{euros(c.cases["263"])}</span> },
                  ]}
                />
                {c.notes.length > 0 && (
                  <Alerte ton="orange" titre="Points de vigilance" className="mt-4">
                    <ul className="list-disc pl-5">{c.notes.map((n, i) => <li key={i}>{n}</li>)}</ul>
                  </Alerte>
                )}
                {c.travaux.length > 0 && (
                  <div className="mt-5">
                    <h3 className="mb-2 text-sm font-bold text-navy-900">Rubrique 400 · paiement des travaux (ligne 224)</h3>
                    <Tableau>
                      <thead className="bg-slate-50"><tr><Th>Date</Th><Th>Nature des travaux</Th><Th>Entrepreneur</Th><Th>Bien</Th><Th droite>Montant</Th></tr></thead>
                      <tbody className="divide-y divide-slate-100">
                        {c.travaux.map((t, i) => (
                          <tr key={i}><Td className="whitespace-nowrap tabular-nums">{formatDate(t.date)}</Td><Td>{t.libelle} <Badge ton="gris">{CATEGORIES_DEPENSE[t.categorie]}</Badge></Td><Td>{t.fournisseur ?? <span className="text-slate-400">à préciser</span>}</Td><Td>{t.bien}</Td><Td droite>{formatEuros(t.montant)}</Td></tr>
                        ))}
                      </tbody>
                    </Tableau>
                  </div>
                )}
                {c.interets.length > 0 && (
                  <div className="mt-5">
                    <h3 className="mb-2 text-sm font-bold text-navy-900">Rubrique 410 · intérêts d'emprunt (ligne 250)</h3>
                    <Tableau>
                      <thead className="bg-slate-50"><tr><Th>Emprunt</Th><Th>Organisme prêteur</Th><Th>Date du prêt</Th><Th droite>Intérêts</Th><Th droite>Assurance</Th></tr></thead>
                      <tbody className="divide-y divide-slate-100">
                        {c.interets.map((e, i) => (
                          <tr key={i}><Td>{e.emprunt}</Td><Td>{e.banque ?? <span className="text-slate-400">à préciser</span>}</Td><Td className="tabular-nums">{e.dateDebut ? formatDate(e.dateDebut) : "—"}</Td><Td droite>{formatEuros(e.interets)}</Td><Td droite>{formatEuros(e.assurance)}</Td></tr>
                        ))}
                      </tbody>
                    </Tableau>
                  </div>
                )}
              </CardBody>
            </Card>
          ))}

          <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-start">
            <Card>
              <CardHeader titre="Régime micro-foncier" description={`Si vos recettes brutes foncières de l'année (tous biens du foyer, parts de SCI comprises) n'excèdent pas ${formatNombre(SEUIL_MICRO_FONCIER, 0)} €, vous pouvez déclarer le total en case 4BE de la 2042 sans remplir la 2044 : un abattement de ${Math.round(ABATTEMENT_MICRO_FONCIER * 100)} % s'applique.`} />
              <CardBody>
                {r.microFoncier.eligible ? (
                  <Infos
                    colonnes={1}
                    items={[
                      { label: "Recettes brutes", valeur: euros(r.microFoncier.recettesBrutes) },
                      { label: "Revenu net imposable au micro-foncier", valeur: euros(r.microFoncier.revenuNetMicro) },
                      { label: "Revenu net au régime réel (2044)", valeur: <span className={r.microFoncier.revenuNetReel < 0 ? "text-red-700" : ""}>{euros(r.microFoncier.revenuNetReel)}</span> },
                      { label: "Lecture", valeur: r.microFoncier.revenuNetReel < r.microFoncier.revenuNetMicro ? "Le régime réel est plus favorable cette année ; l'option pour le réel engage pour 3 ans." : "Le micro-foncier est plus favorable cette année (aucune 2044 à remplir)." },
                    ]}
                  />
                ) : (
                  <p className="text-sm text-slate-600">Recettes brutes de {euros(r.microFoncier.recettesBrutes)} : au-delà du seuil, le régime réel (formulaire 2044) s'impose.</p>
                )}
              </CardBody>
            </Card>
            <Card>
              <CardHeader titre="Hors champ des revenus fonciers et à affecter" description="Locations meublées (bénéfices industriels et commerciaux) et dépenses sans ligne prédéfinie." />
              <CardBody>
                {r.horsChamp.lots.length === 0 && r.depensesNonAffectees.length === 0 ? (
                  <p className="text-sm text-slate-500">Rien à signaler : toutes les recettes et dépenses de l'année relèvent des revenus fonciers et ont trouvé leur ligne.</p>
                ) : (
                  <div className="flex flex-col gap-4 text-sm">
                    {r.horsChamp.lots.length > 0 && (
                      <div>
                        <p className="mb-1.5 font-semibold text-navy-900">Locations meublées : à déclarer en BIC (micro-BIC ou réel, formulaire 2042 C PRO)</p>
                        <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
                          {r.horsChamp.lots.map((l) => (
                            <li key={l.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2"><Link href={`/lots/${l.id}`} className="text-navy-800 hover:underline">{l.nom}</Link><span className="tabular-nums text-slate-600">{formatEuros(l.loyers)} encaissés · {formatEuros(l.depenses)} de dépenses</span></li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {r.depensesNonAffectees.length > 0 && (
                      <div>
                        <p className="mb-1.5 font-semibold text-navy-900">Dépenses « autre » à rattacher vous-même à une ligne (221 à 229) ou à écarter</p>
                        <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
                          {r.depensesNonAffectees.map((d, i) => (
                            <li key={i} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2"><span>{formatDate(d.date)} · {d.libelle}{d.bien ? ` · ${d.bien}` : ""}</span><span className="tabular-nums">{formatEuros(d.montant)}</span></li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </CardBody>
            </Card>
          </div>

          <p className="text-xs text-slate-500">
            État d'aide au remplissage établi à partir des paiements encaissés dans l'année (comptabilité de caisse) et des dépenses saisies à leur date, sur le périmètre des locations nues. Les provisions sur charges récupérables et la TVA collectée sont écartées. Les lignes 212, 213, 214, 224bis, 225, 226, 228, 230 et 262 dépendent d'éléments que l'application ne connaît pas. Vérifiez chaque montant avant de le reporter ; cet état ne remplace ni la notice du formulaire ni l'appréciation du déclarant.
          </p>
        </>
      )}
    </>
  );
}
