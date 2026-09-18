"use client";

import { useState, type ReactNode } from "react";
import { INDICES, appliquerPourcentage, capaciteEmprunt, coutCredit, fraisNotaire, loyerMaximal, mensualite, partEnPourcentage, pretInFine, rentabilite, revisionLoyerIndice, tauxEffort, variationPourcentage, type CodeIndice } from "@/lib/calculs";
import { arrondir2, formatEuros, formatNombre, parseMontant } from "@/lib/montants";
import { Card, CardHeader } from "@/components/ui";

/* ------------------------------------------------------------------ */
/* Briques d'affichage                                                 */
/* ------------------------------------------------------------------ */

type Ton = "navy" | "vert" | "orange" | "rouge" | "neutre";
type Tuile = { libelle: string; valeur: string; detail?: string; ton?: Ton };
type Table = { titre: string; colonnes: string[]; lignes: string[][]; totalEnGras?: boolean };

const TUILES: Record<Ton, { boite: string; libelle: string }> = {
  navy: { boite: "border-navy-900 bg-navy-900 text-white", libelle: "text-navy-300" },
  vert: { boite: "border-emerald-200 bg-emerald-50 text-emerald-800", libelle: "" },
  orange: { boite: "border-amber-200 bg-amber-50 text-amber-800", libelle: "" },
  rouge: { boite: "border-red-200 bg-red-50 text-red-800", libelle: "" },
  neutre: { boite: "border-slate-200 bg-white text-navy-900", libelle: "text-slate-500" },
};

const CHAMP = "block h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-navy-950 tabular-nums placeholder:text-slate-400 focus:border-brand-cyan focus:outline-none focus:ring-2 focus:ring-brand-cyan/30 disabled:bg-slate-50 disabled:text-slate-500";

function n(v: string, defaut = 0): number {
  const x = parseMontant(v);
  return x === null ? defaut : x;
}

const pct = (x: number, decimales = 2) => `${formatNombre(x, decimales)} %`;
/** Pourcentage « court » pour les détails (33 %, 3,20 %). */
const pctCourt = (x: number) => pct(x, Number.isInteger(x) ? 0 : 2);

function Champ({ id, label, valeur, onChange, unite, aide }: { id: string; label: string; valeur: string; onChange: (v: string) => void; unite?: string; aide?: string }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-navy-900">
        {label}
      </label>
      <div className="relative">
        <input id={id} name={id} inputMode="decimal" value={valeur} onChange={(e) => onChange(e.target.value)} className={`${CHAMP} ${unite ? "pr-16" : ""}`} />
        {unite && <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[13px] text-slate-500">{unite}</span>}
      </div>
      {aide && <p className="mt-1.5 text-xs text-slate-500">{aide}</p>}
    </div>
  );
}

function ChampSelect({ id, label, valeur, onChange, options, aide, disabled }: { id: string; label: string; valeur: string; onChange: (v: string) => void; options: { value: string; label: string }[]; aide?: string; disabled?: boolean }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-navy-900">
        {label}
      </label>
      <select id={id} name={id} value={valeur} onChange={(e) => onChange(e.target.value)} disabled={disabled} className={CHAMP}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {aide && <p className="mt-1.5 text-xs text-slate-500">{aide}</p>}
    </div>
  );
}

/** Sous-titre d'un groupe de champs (calculatrice à plusieurs volets). */
function Legende({ children }: { children: ReactNode }) {
  return <p className="col-span-full text-[13px] font-bold text-navy-900 [&:not(:first-child)]:mt-1 [&:not(:first-child)]:border-t [&:not(:first-child)]:border-slate-100 [&:not(:first-child)]:pt-4">{children}</p>;
}

function Disposition({ titre, aide, champs, tuiles, table, note }: { titre: string; aide: string; champs: ReactNode; tuiles: Tuile[]; table?: Table; note: ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-start">
      <Card>
        <CardHeader titre={titre} description={aide} />
        <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3.5 px-5 py-4">{champs}</div>
      </Card>
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-3">
          {tuiles.map((t) => {
            const ton = TUILES[t.ton ?? "neutre"];
            return (
              <div key={t.libelle} className={`rounded-xl border px-[18px] py-4 ${ton.boite}`}>
                <p className={`text-xs font-semibold uppercase tracking-[.04em] ${ton.libelle}`}>{t.libelle}</p>
                <p className="mt-1.5 text-[22px] font-bold leading-tight tracking-[-0.02em] tabular-nums">{t.valeur}</p>
                {t.detail && <p className="mt-1 text-xs opacity-80">{t.detail}</p>}
              </div>
            );
          })}
        </div>
        {table && (
          <Card className="overflow-x-auto">
            <div className="border-b border-slate-100 px-4 py-3">
              <h3 className="text-sm font-bold text-navy-900">{table.titre}</h3>
            </div>
            <table className="w-full text-[13px]">
              <thead>
                <tr className="bg-slate-50">
                  {table.colonnes.map((c, i) => (
                    <th key={c} scope="col" className={`px-3.5 py-2 text-[11px] font-semibold uppercase tracking-[.04em] text-slate-500 ${i === 0 ? "text-left" : "text-right"}`}>
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {table.lignes.map((l, li) => (
                  <tr key={li} className={table.totalEnGras && li === table.lignes.length - 1 ? "font-bold" : ""}>
                    {l.map((c, i) => (
                      <td key={i} className={`px-3.5 py-2 tabular-nums ${i === 0 ? "text-left" : "text-right"}`}>
                        {c}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
        <p className="text-xs leading-normal text-slate-500">{note}</p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Calculatrices                                                       */
/* ------------------------------------------------------------------ */

function Pourcentages() {
  const [loyer, setLoyer] = useState("900");
  const [revenus, setRevenus] = useState("2 650");
  const [seuil, setSeuil] = useState("33");
  const [ancien, setAncien] = useState("600");
  const [nouveau, setNouveau] = useState("618");
  const [montant, setMontant] = useState("600");
  const [taux, setTaux] = useState("3");
  const [partie, setPartie] = useState("45");
  const [total, setTotal] = useState("320");
  const te = tauxEffort(n(loyer), n(revenus));
  const s = n(seuil, 33);
  const dansLaLimite = te <= s;
  const ecart = arrondir2(n(nouveau) - n(ancien));
  const apres = appliquerPourcentage(n(montant), n(taux));
  return (
    <Disposition
      titre="Pourcentages de loyer"
      aide="Taux d'effort du locataire, loyer maximal conseillé, variation entre deux loyers et quote-parts."
      champs={
        <>
          <Legende>Taux d'effort du locataire</Legende>
          <Champ id="loyer" label="Loyer charges comprises" valeur={loyer} onChange={setLoyer} unite="€" />
          <Champ id="revenus" label="Revenus nets mensuels du locataire" valeur={revenus} onChange={setRevenus} unite="€" />
          <Champ id="seuil" label="Taux d'effort maximal" valeur={seuil} onChange={setSeuil} unite="%" />
          <Legende>Variation entre deux loyers</Legende>
          <Champ id="ancien" label="Ancien loyer" valeur={ancien} onChange={setAncien} unite="€" />
          <Champ id="nouveau" label="Nouveau loyer" valeur={nouveau} onChange={setNouveau} unite="€" />
          <Legende>Appliquer un pourcentage</Legende>
          <Champ id="montant" label="Montant" valeur={montant} onChange={setMontant} unite="€" />
          <Champ id="taux" label="Pourcentage" valeur={taux} onChange={setTaux} unite="%" aide="Négatif pour une baisse." />
          <Legende>Quote-part</Legende>
          <Champ id="partie" label="Partie" valeur={partie} onChange={setPartie} />
          <Champ id="total" label="Total" valeur={total} onChange={setTotal} />
        </>
      }
      tuiles={[
        { libelle: "Taux d'effort", valeur: pct(te), detail: n(revenus) > 0 ? (dansLaLimite ? "Dans la limite" : "Au-dessus du seuil") : "Indiquez les revenus", ton: n(revenus) > 0 ? (dansLaLimite ? "vert" : "rouge") : "neutre" },
        { libelle: "Loyer maximal conseillé", valeur: formatEuros(loyerMaximal(n(revenus), s)), detail: `à ${pctCourt(s)} des revenus` },
        { libelle: "Revenus minimaux requis", valeur: formatEuros(s > 0 ? arrondir2((n(loyer) * 100) / s) : 0), detail: "pour ce loyer" },
        { libelle: "Variation entre les loyers", valeur: pct(variationPourcentage(n(ancien), n(nouveau))), detail: `${formatEuros(ecart)} par mois` },
        { libelle: "Écart annuel", valeur: formatEuros(arrondir2(ecart * 12)), detail: "sur 12 mois" },
        { libelle: "Montant après pourcentage", valeur: formatEuros(apres), detail: `différence ${formatEuros(arrondir2(apres - n(montant)))}` },
        { libelle: "Quote-part", valeur: pct(partEnPourcentage(n(partie), n(total))), detail: `${partie || "0"} sur ${total || "0"}` },
      ]}
      note="Le taux d'effort recommandé est de 33 % des revenus nets ; les garanties (Visale, caution) peuvent permettre d'aller au-delà. Quote-part : tantièmes d'un lot dans la copropriété ou part d'une dépense commune."
    />
  );
}

function Revision() {
  const [indice, setIndice] = useState<CodeIndice>("IRL");
  const [periodicite, setPeriodicite] = useState<"annuelle" | "triennale">("annuelle");
  const [loyer, setLoyer] = useState("820");
  const [ancien, setAncien] = useState("145,17");
  const [nouveau, setNouveau] = useState("147,10");
  const [plafond, setPlafond] = useState("");
  const info = INDICES.find((i) => i.code === indice)!;
  const r = revisionLoyerIndice(n(loyer), n(ancien), n(nouveau), plafond.trim() === "" ? null : n(plafond));
  const regle =
    indice === "IRL"
      ? "Bail d'habitation : révision une fois par an à la date prévue au bail, dans la limite de la variation de l'IRL ; à défaut de demande dans l'année, la révision est perdue pour l'année écoulée (art. 17-1 loi du 6 juillet 1989)."
      : indice === "ILC" || indice === "ILAT"
        ? "Bail commercial : révision triennale légale plafonnée à la variation de l'indice (art. L145-38 C. com.) ; avec une clause d'échelle mobile, indexation annuelle automatique, la variation restant limitée à 10 % du loyer de l'année précédente (art. L145-39)."
        : "ICC : indice conservé pour les baux anciens ; les nouveaux baux commerciaux utilisent l'ILC ou l'ILAT.";
  return (
    <Disposition
      titre="Révision par indice"
      aide="Nouveau loyer = loyer actuel × nouvel indice ÷ indice de référence."
      champs={
        <>
          <ChampSelect id="indice" label="Indice" valeur={indice} onChange={(v) => setIndice(v as CodeIndice)} options={INDICES.map((i) => ({ value: i.code, label: i.libelle }))} aide={info.usage} />
          <ChampSelect
            id="periodicite"
            label="Périodicité"
            valeur={periodicite}
            onChange={(v) => setPeriodicite(v as "annuelle" | "triennale")}
            options={[
              { value: "annuelle", label: "Annuelle — indices à un an d'écart" },
              { value: "triennale", label: "Triennale — indices à trois ans d'écart" },
            ]}
          />
          <Champ id="loyer" label="Loyer actuel hors charges" valeur={loyer} onChange={setLoyer} unite="€" />
          <Champ id="plafond" label="Plafond de hausse" valeur={plafond} onChange={setPlafond} unite="% · facultatif" aide="Ex. : 3,5 % (bouclier IRL 2022-2024) ou plafond contractuel." />
          <Champ id="ancien" label={periodicite === "annuelle" ? "Indice de référence (il y a un an)" : "Indice de référence (il y a trois ans)"} valeur={ancien} onChange={setAncien} />
          <Champ id="nouveau" label="Nouvel indice (même trimestre)" valeur={nouveau} onChange={setNouveau} />
        </>
      }
      tuiles={[
        { libelle: "Nouveau loyer HC", valeur: formatEuros(r.nouveauLoyer), detail: "arrondi au centime", ton: "navy" },
        { libelle: "Augmentation mensuelle", valeur: formatEuros(r.augmentation), detail: r.plafonne ? `hausse limitée au plafond de ${pctCourt(n(plafond))}` : `variation de l'indice ${pct(r.variationIndicePct)}`, ton: r.plafonne ? "orange" : "neutre" },
        { libelle: "Sur 12 mois", valeur: formatEuros(arrondir2(r.augmentation * 12)), detail: "augmentation annuelle" },
      ]}
      note={regle}
    />
  );
}

function Rentabilite() {
  const [prix, setPrix] = useState("165 000");
  const [frais, setFrais] = useState("12 400");
  const [travaux, setTravaux] = useState("8 000");
  const [loyer, setLoyer] = useState("820");
  const [charges, setCharges] = useState("400");
  const [tf, setTf] = useState("980");
  const [pno, setPno] = useState("150");
  const [gestion, setGestion] = useState("0");
  const [vacance, setVacance] = useState("2");
  const [credit, setCredit] = useState("700");
  const r = rentabilite({ prix: n(prix), fraisAcquisition: n(frais), travaux: n(travaux), loyerMensuelHC: n(loyer), chargesNonRecuperablesAnnuelles: n(charges), taxeFonciere: n(tf), assurancePNO: n(pno), gestionPct: n(gestion), vacanceSemaines: n(vacance), mensualiteCredit: n(credit) });
  return (
    <Disposition
      titre="Rentabilité locative"
      aide="Rendement brut et net d'un investissement, cash-flow après crédit."
      champs={
        <>
          <Champ id="prix" label="Prix d'achat" valeur={prix} onChange={setPrix} unite="€" />
          <Champ id="frais" label="Frais d'acquisition" valeur={frais} onChange={setFrais} unite="€" aide="Notaire, agence." />
          <Champ id="travaux" label="Travaux" valeur={travaux} onChange={setTravaux} unite="€" />
          <Champ id="loyer" label="Loyer mensuel hors charges" valeur={loyer} onChange={setLoyer} unite="€" />
          <Champ id="charges" label="Charges annuelles non récupérables" valeur={charges} onChange={setCharges} unite="€ / an" />
          <Champ id="tf" label="Taxe foncière" valeur={tf} onChange={setTf} unite="€ / an" />
          <Champ id="pno" label="Assurance PNO" valeur={pno} onChange={setPno} unite="€ / an" />
          <Champ id="gestion" label="Frais de gestion" valeur={gestion} onChange={setGestion} unite="% des loyers" />
          <Champ id="vacance" label="Vacance locative" valeur={vacance} onChange={setVacance} unite="sem. / an" />
          <Champ id="credit" label="Mensualité de crédit" valeur={credit} onChange={setCredit} unite="€" />
        </>
      }
      tuiles={[
        { libelle: "Rendement brut", valeur: pct(r.rentabiliteBrutePct), detail: "loyers ÷ prix d'achat", ton: "navy" },
        { libelle: "Rendement net", valeur: pct(r.rentabiliteNettePct), detail: "après charges, gestion et vacance", ton: r.rentabiliteNettePct >= 4 ? "vert" : "orange" },
        { libelle: "Investissement total", valeur: formatEuros(r.investissement), detail: "prix, frais et travaux" },
        { libelle: "Revenu net annuel", valeur: formatEuros(r.revenuNetAnnuel), detail: "avant impôt" },
        { libelle: "Cash-flow mensuel", valeur: formatEuros(r.cashFlowMensuel), detail: "après mensualité de crédit", ton: r.cashFlowMensuel < 0 ? "rouge" : "vert" },
      ]}
      table={{
        titre: "Détail annuel",
        colonnes: ["Poste", "Montant"],
        lignes: [
          ["Loyers annuels hors charges", formatEuros(r.loyerAnnuelHC)],
          ["Loyers encaissés (après vacance)", formatEuros(r.loyerAnnuelEncaisse)],
          ["Charges annuelles (charges, taxe foncière, PNO)", formatEuros(r.chargesAnnuelles)],
          ["Frais de gestion", formatEuros(r.fraisGestion)],
          ["Revenu net annuel (avant impôt)", formatEuros(r.revenuNetAnnuel)],
        ],
        totalEnGras: true,
      }}
      note="Brute : loyer annuel ÷ prix. Nette : revenu après charges non récupérables, taxe foncière, assurance PNO, gestion et vacance, rapporté au coût total d'acquisition (avant impôt). Le rendement net ne tient pas compte de la fiscalité ; comptez en moyenne un mois de vacance tous les trois ans."
    />
  );
}

function Notaire() {
  const [prix, setPrix] = useState("165 000");
  const [type, setType] = useState<"ancien" | "neuf">("ancien");
  const [tauxDep, setTauxDep] = useState("4,5");
  const [mobilier, setMobilier] = useState("0");
  const [debours, setDebours] = useState("1 000");
  const neuf = type === "neuf";
  const r = fraisNotaire({ prix: n(prix), neuf, tauxDepartemental: n(tauxDep, 4.5), mobilier: n(mobilier), debours: n(debours, 1000) });
  const tauxDroits = neuf ? 0.715 : n(tauxDep, 4.5) * 1.0237 + 1.2;
  return (
    <Disposition
      titre="Frais de notaire"
      aide="Estimation des frais d'acquisition (droits, émoluments, débours)."
      champs={
        <>
          <Champ id="prix" label="Prix d'achat" valeur={prix} onChange={setPrix} unite="€" />
          <ChampSelect
            id="type"
            label="Type de bien"
            valeur={type}
            onChange={(v) => setType(v as "ancien" | "neuf")}
            options={[
              { value: "ancien", label: "Ancien" },
              { value: "neuf", label: "Neuf (VEFA ou moins de 5 ans)" },
            ]}
            aide={neuf ? "Première vente d'un logement neuf : droits réduits à 0,715 %." : undefined}
          />
          <ChampSelect
            id="tauxDep"
            label="Taxe départementale"
            valeur={tauxDep}
            onChange={setTauxDep}
            disabled={neuf}
            options={[
              { value: "4,5", label: "4,50 % — taux standard" },
              { value: "5", label: "5,00 % — taux majoré voté par le département (2025-2028)" },
              { value: "3,8", label: "3,80 % — Indre, Morbihan, Mayotte" },
            ]}
          />
          <Champ id="mobilier" label="Mobilier inclus" valeur={mobilier} onChange={setMobilier} unite="€" aide="Non soumis aux droits." />
          <Champ id="debours" label="Débours et formalités" valeur={debours} onChange={setDebours} unite="€" />
        </>
      }
      tuiles={[
        { libelle: "Frais estimés", valeur: formatEuros(r.total), detail: `${pct(r.pourcentage, 1)} du prix`, ton: "navy" },
        { libelle: "Droits et taxes", valeur: formatEuros(r.droitsMutation), detail: neuf ? "taxe de publicité foncière 0,715 %" : `droits de mutation ${pct(tauxDroits)}` },
        { libelle: "Émoluments du notaire", valeur: formatEuros(arrondir2(r.emoluments + r.tvaEmoluments)), detail: "TTC" },
        { libelle: "Débours et formalités", valeur: formatEuros(arrondir2(r.debours + r.contributionSecurite)), detail: "estimation, sécurité immobilière incluse" },
      ]}
      table={{
        titre: "Détail",
        colonnes: ["Poste", "Montant"],
        lignes: [
          ["Base taxable (prix hors mobilier)", formatEuros(r.base)],
          [neuf ? "Taxe de publicité foncière (0,715 %)" : "Droits de mutation", formatEuros(r.droitsMutation)],
          ["Émoluments du notaire HT", formatEuros(r.emoluments)],
          ["TVA sur émoluments (20 %)", formatEuros(r.tvaEmoluments)],
          ["Contribution de sécurité immobilière (0,10 %)", formatEuros(r.contributionSecurite)],
          ["Débours", formatEuros(r.debours)],
          ["Total estimé", formatEuros(r.total)],
        ],
        totalEnGras: true,
      }}
      note="Barème des émoluments de l'arrêté du 28 février 2020, dégressif par tranche. Dans l'ancien, les droits comprennent la taxe départementale, les frais d'assiette (2,37 % de celle-ci) et la taxe communale (1,20 %) ; les débours varient selon la commune. Le notaire établit le montant exact."
    />
  );
}

function Capacite() {
  const [revenus, setRevenus] = useState("4 200");
  const [charges, setCharges] = useState("0");
  const [endettement, setEndettement] = useState("35");
  const [taux, setTaux] = useState("3,2");
  const [duree, setDuree] = useState("240");
  const [assurance, setAssurance] = useState("0,3");
  const c = capaciteEmprunt({ revenusMensuels: n(revenus), chargesMensuelles: n(charges), tauxEndettementPct: n(endettement, 35), tauxAnnuelPct: n(taux), dureeMois: Math.round(n(duree)), assuranceTauxAnnuelPct: n(assurance) });
  const endettementActuel = n(revenus) > 0 ? arrondir2((n(charges) / n(revenus)) * 100) : 0;
  return (
    <Disposition
      titre="Capacité d'emprunt"
      aide="Montant empruntable selon vos revenus et le taux d'endettement maximal (35 %)."
      champs={
        <>
          <Champ id="revenus" label="Revenus nets mensuels" valeur={revenus} onChange={setRevenus} unite="€" />
          <Champ id="charges" label="Charges de crédit en cours" valeur={charges} onChange={setCharges} unite="€ / mois" />
          <Champ id="endettement" label="Taux d'endettement maximal" valeur={endettement} onChange={setEndettement} unite="%" />
          <Champ id="taux" label="Taux du prêt" valeur={taux} onChange={setTaux} unite="% / an" />
          <Champ id="duree" label="Durée" valeur={duree} onChange={setDuree} unite="mois" />
          <Champ id="assurance" label="Assurance" valeur={assurance} onChange={setAssurance} unite="% / an" aide="En pourcentage du capital emprunté, par an." />
        </>
      }
      tuiles={[
        { libelle: "Capacité d'emprunt", valeur: formatEuros(c.capital), detail: `sur ${Math.round(n(duree))} mois à ${pctCourt(n(taux))}`, ton: "navy" },
        { libelle: "Mensualité maximale", valeur: formatEuros(c.mensualiteMax), detail: "assurance comprise, après charges en cours" },
        { libelle: "Coût total du crédit", valeur: formatEuros(c.coutTotal), detail: "intérêts et assurance" },
        { libelle: "Taux d'endettement actuel", valeur: pct(endettementActuel, 1), detail: "charges de crédit en cours" },
      ]}
      note="Le HCSF limite le taux d'endettement à 35 % assurance comprise et la durée à 25 ans (27 ans avec travaux). Les revenus locatifs sont généralement retenus à 70 % par les banques."
    />
  );
}

function Mensualite() {
  const [capital, setCapital] = useState("150 000");
  const [taux, setTaux] = useState("3,2");
  const [duree, setDuree] = useState("240");
  const [assurance, setAssurance] = useState("0,3");
  const mois = Math.max(0, Math.round(n(duree)));
  const c = coutCredit(n(capital), n(taux), mois, { tauxAnnuelPct: n(assurance) });
  // Cumul par année à partir de la mensualité constante (intérêts sur le capital restant dû).
  const lignes: string[][] = [];
  const m = mensualite(n(capital), n(taux), mois);
  const r = n(taux) / 100 / 12;
  let restant = n(capital);
  for (let annee = 1; annee <= Math.ceil(mois / 12) && annee <= 40; annee++) {
    let interets = 0;
    let amorti = 0;
    for (let k = 0; k < 12 && (annee - 1) * 12 + k < mois; k++) {
      const i = restant * r;
      const cap = Math.min(restant, m - i);
      interets += i;
      amorti += cap;
      restant -= cap;
    }
    lignes.push([`Année ${annee}`, formatEuros(arrondir2(amorti)), formatEuros(arrondir2(interets)), formatEuros(arrondir2(Math.max(0, restant)))]);
  }
  return (
    <Disposition
      titre="Mensualité d'un prêt"
      aide="Prêt amortissable à taux fixe et mensualités constantes."
      champs={
        <>
          <Champ id="capital" label="Capital emprunté" valeur={capital} onChange={setCapital} unite="€" />
          <Champ id="taux" label="Taux nominal" valeur={taux} onChange={setTaux} unite="% / an" />
          <Champ id="duree" label="Durée" valeur={duree} onChange={setDuree} unite="mois" />
          <Champ id="assurance" label="Assurance" valeur={assurance} onChange={setAssurance} unite="% / an" aide="En pourcentage du capital emprunté, par an." />
        </>
      }
      tuiles={[
        { libelle: "Mensualité", valeur: formatEuros(c.mensualiteTotale), detail: "assurance comprise", ton: "navy" },
        { libelle: "Mensualité hors assurance", valeur: formatEuros(c.mensualite) },
        { libelle: "Assurance mensuelle", valeur: formatEuros(c.assuranceMensuelle) },
        { libelle: "Coût total des intérêts", valeur: formatEuros(c.totalInterets) },
        { libelle: "Coût de l'assurance", valeur: formatEuros(c.totalAssurance) },
        { libelle: "Coût total du crédit", valeur: formatEuros(c.coutTotal), detail: "intérêts et assurance" },
        { libelle: "Montant total remboursé", valeur: formatEuros(c.montantTotalRembourse), detail: "capital, intérêts et assurance" },
      ]}
      table={mois > 0 ? { titre: "Amortissement par année", colonnes: ["Année", "Capital remboursé", "Intérêts", "Restant dû"], lignes } : undefined}
      note="L'assurance emprunteur est calculée sur le capital initial. Le tableau présente le cumul par année, hors assurance."
    />
  );
}

function InFine() {
  const [capital, setCapital] = useState("150 000");
  const [taux, setTaux] = useState("3,5");
  const [duree, setDuree] = useState("180");
  const [assurance, setAssurance] = useState("40");
  const [epargne, setEpargne] = useState("2,5");
  const mois = Math.max(0, Math.round(n(duree)));
  const p = pretInFine(n(capital), n(taux), mois, n(assurance), n(epargne));
  const amortissable = coutCredit(n(capital), n(taux), mois).totalInterets;
  return (
    <Disposition
      titre="Prêt in fine"
      aide="Seuls les intérêts sont payés chaque mois ; le capital est remboursé en une fois à l'échéance."
      champs={
        <>
          <Champ id="capital" label="Capital emprunté" valeur={capital} onChange={setCapital} unite="€" />
          <Champ id="taux" label="Taux nominal" valeur={taux} onChange={setTaux} unite="% / an" />
          <Champ id="duree" label="Durée" valeur={duree} onChange={setDuree} unite="mois" />
          <Champ id="assurance" label="Assurance mensuelle" valeur={assurance} onChange={setAssurance} unite="€" />
          <Champ id="epargne" label="Rendement de l'épargne adossée" valeur={epargne} onChange={setEpargne} unite="% / an" aide="Pour reconstituer le capital au terme." />
        </>
      }
      tuiles={[
        { libelle: "Intérêts mensuels", valeur: formatEuros(p.interetsMensuels), detail: `pendant ${mois} mois`, ton: "navy" },
        { libelle: "Mensualité", valeur: formatEuros(p.mensualite), detail: "intérêts et assurance" },
        { libelle: "Épargne mensuelle nécessaire", valeur: formatEuros(p.epargneMensuelleNecessaire), detail: "pour reconstituer le capital au terme" },
        { libelle: "Effort mensuel total", valeur: formatEuros(arrondir2(p.mensualite + p.epargneMensuelleNecessaire)), detail: "mensualité et épargne" },
        { libelle: "Total des intérêts", valeur: formatEuros(p.totalInterets), detail: `contre ${formatEuros(amortissable)} en amortissable` },
        { libelle: "Coût total", valeur: formatEuros(p.coutTotal), detail: "intérêts et assurance" },
        { libelle: "Capital à rembourser", valeur: formatEuros(p.capitalARembourser), detail: "en une fois au terme" },
      ]}
      note="Le prêt in fine s'accompagne généralement d'un nantissement (assurance-vie). Les intérêts, plus élevés qu'en amortissable, sont intégralement déductibles des revenus fonciers."
    />
  );
}

/* ------------------------------------------------------------------ */
/* Onglets                                                             */
/* ------------------------------------------------------------------ */

const ONGLETS = [
  { cle: "pourcentages", libelle: "Pourcentages de loyer", composant: Pourcentages },
  { cle: "revision", libelle: "Révision par indice", composant: Revision },
  { cle: "rentabilite", libelle: "Rentabilité", composant: Rentabilite },
  { cle: "notaire", libelle: "Frais de notaire", composant: Notaire },
  { cle: "emprunt", libelle: "Capacité d'emprunt", composant: Capacite },
  { cle: "mensualite", libelle: "Mensualité", composant: Mensualite },
  { cle: "infine", libelle: "Prêt in fine", composant: InFine },
] as const;

export function Calculatrices({ initial = "pourcentages" }: { initial?: string }) {
  const [actif, setActif] = useState<string>(ONGLETS.some((o) => o.cle === initial) ? initial : "pourcentages");
  const Composant = ONGLETS.find((o) => o.cle === actif)!.composant;
  return (
    <div className="space-y-6">
      <div role="tablist" className="flex gap-1 overflow-x-auto border-b border-slate-200">
        {ONGLETS.map((o) => (
          <button
            key={o.cle}
            type="button"
            role="tab"
            aria-selected={actif === o.cle}
            onClick={() => {
              setActif(o.cle);
              window.history.replaceState(null, "", `/outils?onglet=${o.cle}`);
            }}
            className={`flex h-11 shrink-0 cursor-pointer items-center whitespace-nowrap px-3.5 text-sm focus:outline-none focus-visible:outline-2 focus-visible:outline-brand-cyan ${actif === o.cle ? "font-bold text-navy-900 shadow-[inset_0_-2px_0_#172c52]" : "font-medium text-slate-500 hover:text-navy-900"}`}
          >
            {o.libelle}
          </button>
        ))}
      </div>
      <Composant />
    </div>
  );
}
