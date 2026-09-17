"use client";

import { useState, type ReactNode } from "react";
import { INDICES, appliquerPourcentage, capaciteEmprunt, coutCredit, fraisNotaire, loyerMaximal, partEnPourcentage, pretInFine, rentabilite, revisionLoyerIndice, tauxEffort, variationPourcentage, type CodeIndice } from "@/lib/calculs";
import { formatEuros, formatNombre, parseMontant } from "@/lib/montants";
import { Alerte, Card, CardBody, CardHeader } from "@/components/ui";

const CHAMP = "block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-navy-950 shadow-sm focus:border-brand-cyan focus:outline-none focus:ring-2 focus:ring-brand-cyan/40";

function Nombre({ label, valeur, onChange, hint, suffixe }: { label: string; valeur: string; onChange: (v: string) => void; hint?: string; suffixe?: string }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium text-navy-900">{label}{suffixe && <span className="text-slate-500"> ({suffixe})</span>}</span>
      <input inputMode="decimal" value={valeur} onChange={(e) => onChange(e.target.value)} className={CHAMP} />
      {hint && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
    </label>
  );
}

function n(v: string, defaut = 0): number {
  const x = parseMontant(v);
  return x === null ? defaut : x;
}

function Resultats({ lignes }: { lignes: { libelle: string; valeur: ReactNode; fort?: boolean }[] }) {
  return (
    <dl className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-slate-50/60">
      {lignes.map((l, i) => (
        <div key={i} className={`flex items-center justify-between gap-4 px-4 py-2 text-sm ${l.fort ? "font-semibold text-navy-900" : ""}`}>
          <dt className="text-slate-600">{l.libelle}</dt>
          <dd className="tabular-nums">{l.valeur}</dd>
        </div>
      ))}
    </dl>
  );
}

const pct = (x: number) => `${formatNombre(x)} %`;

function Pourcentages() {
  const [ancien, setAncien] = useState("600");
  const [nouveau, setNouveau] = useState("618");
  const [montant, setMontant] = useState("600");
  const [taux, setTaux] = useState("3");
  const [loyer, setLoyer] = useState("660");
  const [revenus, setRevenus] = useState("2 400");
  const [partie, setPartie] = useState("45");
  const [total, setTotal] = useState("320");
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader titre="Variation entre deux loyers" />
        <CardBody className="space-y-3">
          <div className="grid grid-cols-2 gap-3"><Nombre label="Ancien loyer" valeur={ancien} onChange={setAncien} suffixe="€" /><Nombre label="Nouveau loyer" valeur={nouveau} onChange={setNouveau} suffixe="€" /></div>
          <Resultats lignes={[{ libelle: "Variation", valeur: pct(variationPourcentage(n(ancien), n(nouveau))), fort: true }, { libelle: "Écart mensuel", valeur: formatEuros(n(nouveau) - n(ancien)) }, { libelle: "Écart annuel", valeur: formatEuros((n(nouveau) - n(ancien)) * 12) }]} />
        </CardBody>
      </Card>
      <Card>
        <CardHeader titre="Appliquer un pourcentage" />
        <CardBody className="space-y-3">
          <div className="grid grid-cols-2 gap-3"><Nombre label="Montant" valeur={montant} onChange={setMontant} suffixe="€" /><Nombre label="Pourcentage" valeur={taux} onChange={setTaux} suffixe="%" hint="Négatif pour une baisse" /></div>
          <Resultats lignes={[{ libelle: "Résultat", valeur: formatEuros(appliquerPourcentage(n(montant), n(taux))), fort: true }, { libelle: "Différence", valeur: formatEuros(appliquerPourcentage(n(montant), n(taux)) - n(montant)) }]} />
        </CardBody>
      </Card>
      <Card>
        <CardHeader titre="Taux d'effort du locataire" description="Part du loyer charges comprises dans les revenus nets mensuels ; les bailleurs retiennent le plus souvent un plafond de 33 à 35 %." />
        <CardBody className="space-y-3">
          <div className="grid grid-cols-2 gap-3"><Nombre label="Loyer charges comprises" valeur={loyer} onChange={setLoyer} suffixe="€" /><Nombre label="Revenus nets mensuels" valeur={revenus} onChange={setRevenus} suffixe="€" /></div>
          <Resultats lignes={[{ libelle: "Taux d'effort", valeur: pct(tauxEffort(n(loyer), n(revenus))), fort: true }, { libelle: "Loyer maximal à 33 %", valeur: formatEuros(loyerMaximal(n(revenus), 33)) }, { libelle: "Revenus nécessaires (3 × loyer)", valeur: formatEuros(n(loyer) * 3) }]} />
        </CardBody>
      </Card>
      <Card>
        <CardHeader titre="Quote-part" description="Ex. : tantièmes d'un lot dans la copropriété, part d'une dépense commune." />
        <CardBody className="space-y-3">
          <div className="grid grid-cols-2 gap-3"><Nombre label="Partie" valeur={partie} onChange={setPartie} /><Nombre label="Total" valeur={total} onChange={setTotal} /></div>
          <Resultats lignes={[{ libelle: "Quote-part", valeur: pct(partEnPourcentage(n(partie), n(total))), fort: true }]} />
        </CardBody>
      </Card>
    </div>
  );
}

function Notaire() {
  const [prix, setPrix] = useState("200 000");
  const [neuf, setNeuf] = useState(false);
  const [tauxDep, setTauxDep] = useState("4,5");
  const [mobilier, setMobilier] = useState("0");
  const [debours, setDebours] = useState("1 000");
  const r = fraisNotaire({ prix: n(prix), neuf, tauxDepartemental: n(tauxDep, 4.5), mobilier: n(mobilier), debours: n(debours, 1000) });
  return (
    <Card>
      <CardHeader titre="Frais de notaire (estimation)" description="Droits de mutation, émoluments du notaire (barème 2020), contribution de sécurité immobilière et débours. Le notaire établit le montant exact." />
      <CardBody className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-3">
          <Nombre label="Prix du bien" valeur={prix} onChange={setPrix} suffixe="€" />
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={neuf} onChange={(e) => setNeuf(e.target.checked)} className="h-4 w-4" /> Logement neuf (VEFA ou première vente d'un logement de moins de 5 ans) : droits réduits à 0,715 %</label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-navy-900">Taxe départementale (ancien)</span>
            <select value={tauxDep} onChange={(e) => setTauxDep(e.target.value)} className={CHAMP} disabled={neuf}>
              <option value="4,5">4,50 % — taux standard</option>
              <option value="5">5,00 % — taux majoré voté par le département (2025-2028)</option>
              <option value="3,8">3,80 % — Indre, Morbihan, Mayotte</option>
            </select>
          </label>
          <div className="grid grid-cols-2 gap-3"><Nombre label="Mobilier inclus" valeur={mobilier} onChange={setMobilier} suffixe="€" hint="Non soumis aux droits" /><Nombre label="Débours et formalités" valeur={debours} onChange={setDebours} suffixe="€" /></div>
        </div>
        <Resultats lignes={[
          { libelle: "Base taxable", valeur: formatEuros(r.base) },
          { libelle: neuf ? "Taxe de publicité foncière (0,715 %)" : "Droits de mutation", valeur: formatEuros(r.droitsMutation) },
          { libelle: "Émoluments du notaire HT", valeur: formatEuros(r.emoluments) },
          { libelle: "TVA sur émoluments (20 %)", valeur: formatEuros(r.tvaEmoluments) },
          { libelle: "Contribution de sécurité immobilière (0,10 %)", valeur: formatEuros(r.contributionSecurite) },
          { libelle: "Débours", valeur: formatEuros(r.debours) },
          { libelle: "Total estimé", valeur: `${formatEuros(r.total)} (${pct(r.pourcentage)})`, fort: true },
        ]} />
      </CardBody>
    </Card>
  );
}

function Emprunt() {
  const [revenus, setRevenus] = useState("3 000");
  const [charges, setCharges] = useState("0");
  const [endettement, setEndettement] = useState("35");
  const [taux, setTaux] = useState("3,2");
  const [duree, setDuree] = useState("240");
  const [assurance, setAssurance] = useState("0,3");
  const c = capaciteEmprunt({ revenusMensuels: n(revenus), chargesMensuelles: n(charges), tauxEndettementPct: n(endettement, 35), tauxAnnuelPct: n(taux), dureeMois: Math.round(n(duree)), assuranceTauxAnnuelPct: n(assurance) });
  return (
    <Card>
      <CardHeader titre="Capacité d'emprunt immobilier" description="Mensualité maximale selon le taux d'endettement (35 % assurance comprise, recommandation HCSF), puis capital empruntable." />
      <CardBody className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="grid grid-cols-2 gap-3">
          <Nombre label="Revenus nets mensuels" valeur={revenus} onChange={setRevenus} suffixe="€" />
          <Nombre label="Charges de crédit en cours" valeur={charges} onChange={setCharges} suffixe="€ / mois" />
          <Nombre label="Taux d'endettement maximal" valeur={endettement} onChange={setEndettement} suffixe="%" />
          <Nombre label="Taux du prêt" valeur={taux} onChange={setTaux} suffixe="% / an" />
          <Nombre label="Durée" valeur={duree} onChange={setDuree} suffixe="mois" />
          <Nombre label="Assurance" valeur={assurance} onChange={setAssurance} suffixe="% du capital / an" />
        </div>
        <Resultats lignes={[
          { libelle: "Mensualité maximale (assurance comprise)", valeur: formatEuros(c.mensualiteMax) },
          { libelle: "Capital empruntable", valeur: formatEuros(c.capital), fort: true },
          { libelle: "Coût total du crédit (intérêts + assurance)", valeur: formatEuros(c.coutTotal) },
        ]} />
      </CardBody>
    </Card>
  );
}

function Mensualite() {
  const [capital, setCapital] = useState("150 000");
  const [taux, setTaux] = useState("3,2");
  const [duree, setDuree] = useState("240");
  const [assurance, setAssurance] = useState("0,3");
  const c = coutCredit(n(capital), n(taux), Math.round(n(duree)), { tauxAnnuelPct: n(assurance) });
  return (
    <Card>
      <CardHeader titre="Mensualité et coût d'un prêt immobilier" description="Prêt amortissable à mensualités constantes." />
      <CardBody className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="grid grid-cols-2 gap-3">
          <Nombre label="Capital emprunté" valeur={capital} onChange={setCapital} suffixe="€" />
          <Nombre label="Taux nominal" valeur={taux} onChange={setTaux} suffixe="% / an" />
          <Nombre label="Durée" valeur={duree} onChange={setDuree} suffixe="mois" />
          <Nombre label="Assurance" valeur={assurance} onChange={setAssurance} suffixe="% du capital / an" />
        </div>
        <Resultats lignes={[
          { libelle: "Mensualité hors assurance", valeur: formatEuros(c.mensualite) },
          { libelle: "Assurance mensuelle", valeur: formatEuros(c.assuranceMensuelle) },
          { libelle: "Mensualité totale", valeur: formatEuros(c.mensualiteTotale), fort: true },
          { libelle: "Total des intérêts", valeur: formatEuros(c.totalInterets) },
          { libelle: "Total de l'assurance", valeur: formatEuros(c.totalAssurance) },
          { libelle: "Coût total du crédit", valeur: formatEuros(c.coutTotal), fort: true },
          { libelle: "Montant total remboursé", valeur: formatEuros(c.montantTotalRembourse) },
        ]} />
      </CardBody>
    </Card>
  );
}

function InFine() {
  const [capital, setCapital] = useState("150 000");
  const [taux, setTaux] = useState("3,5");
  const [duree, setDuree] = useState("180");
  const [assurance, setAssurance] = useState("40");
  const [epargne, setEpargne] = useState("2,5");
  const p = pretInFine(n(capital), n(taux), Math.round(n(duree)), n(assurance), n(epargne));
  return (
    <Card>
      <CardHeader titre="Prêt in fine" description="Seuls les intérêts (et l'assurance) sont payés chaque mois ; le capital est remboursé en une fois au terme, souvent grâce à une épargne nantie. Les intérêts, plus élevés, sont intégralement déductibles des revenus fonciers." />
      <CardBody className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="grid grid-cols-2 gap-3">
          <Nombre label="Capital emprunté" valeur={capital} onChange={setCapital} suffixe="€" />
          <Nombre label="Taux nominal" valeur={taux} onChange={setTaux} suffixe="% / an" />
          <Nombre label="Durée" valeur={duree} onChange={setDuree} suffixe="mois" />
          <Nombre label="Assurance mensuelle" valeur={assurance} onChange={setAssurance} suffixe="€" />
          <Nombre label="Rendement de l'épargne adossée" valeur={epargne} onChange={setEpargne} suffixe="% / an" hint="Pour reconstituer le capital au terme" />
        </div>
        <Resultats lignes={[
          { libelle: "Intérêts mensuels", valeur: formatEuros(p.interetsMensuels) },
          { libelle: "Mensualité (intérêts + assurance)", valeur: formatEuros(p.mensualite), fort: true },
          { libelle: "Total des intérêts", valeur: formatEuros(p.totalInterets) },
          { libelle: "Coût total (intérêts + assurance)", valeur: formatEuros(p.coutTotal) },
          { libelle: "Capital à rembourser au terme", valeur: formatEuros(p.capitalARembourser) },
          { libelle: "Épargne mensuelle nécessaire", valeur: formatEuros(p.epargneMensuelleNecessaire) },
          { libelle: "Effort mensuel total", valeur: formatEuros(p.mensualite + p.epargneMensuelleNecessaire), fort: true },
        ]} />
      </CardBody>
    </Card>
  );
}

function Revision() {
  const [indice, setIndice] = useState<CodeIndice>("IRL");
  const [periodicite, setPeriodicite] = useState<"annuelle" | "triennale">("annuelle");
  const [loyer, setLoyer] = useState("600");
  const [ancien, setAncien] = useState("145,87");
  const [nouveau, setNouveau] = useState("148,20");
  const [plafond, setPlafond] = useState("");
  const info = INDICES.find((i) => i.code === indice)!;
  const r = revisionLoyerIndice(n(loyer), n(ancien), n(nouveau), plafond.trim() === "" ? null : n(plafond));
  return (
    <Card>
      <CardHeader titre="Révision de loyer par indice" description="Nouveau loyer = loyer actuel × nouvel indice ÷ indice de référence. Révision annuelle (IRL, clause d'échelle mobile) ou triennale (indices du même trimestre à trois ans d'écart)." />
      <CardBody className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-3">
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-navy-900">Indice</span>
            <select value={indice} onChange={(e) => setIndice(e.target.value as CodeIndice)} className={CHAMP}>
              {INDICES.map((i) => <option key={i.code} value={i.code}>{i.libelle}</option>)}
            </select>
            <span className="mt-1 block text-xs text-slate-500">{info.usage}</span>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-navy-900">Périodicité</span>
            <select value={periodicite} onChange={(e) => setPeriodicite(e.target.value as "annuelle" | "triennale")} className={CHAMP}>
              <option value="annuelle">Annuelle — indices à un an d'écart</option>
              <option value="triennale">Triennale — indices à trois ans d'écart (baux commerciaux, art. L145-38)</option>
            </select>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <Nombre label="Loyer actuel" valeur={loyer} onChange={setLoyer} suffixe="€" />
            <Nombre label="Plafond de hausse" valeur={plafond} onChange={setPlafond} suffixe="% facultatif" hint="Ex. : 3,5 % (bouclier IRL 2022-2024) ou plafond contractuel" />
            <Nombre label={periodicite === "annuelle" ? "Indice de référence (il y a un an)" : "Indice de référence (il y a trois ans)"} valeur={ancien} onChange={setAncien} />
            <Nombre label="Nouvel indice (même trimestre)" valeur={nouveau} onChange={setNouveau} />
          </div>
        </div>
        <div className="space-y-3">
          <Resultats lignes={[
            { libelle: "Variation de l'indice", valeur: pct(r.variationIndicePct) },
            { libelle: "Nouveau loyer", valeur: formatEuros(r.nouveauLoyer), fort: true },
            { libelle: "Augmentation mensuelle", valeur: formatEuros(r.augmentation) },
            { libelle: "Augmentation annuelle", valeur: formatEuros(r.augmentation * 12) },
          ]} />
          {r.plafonne && <Alerte ton="orange">Hausse limitée au plafond de {formatNombre(n(plafond))} %.</Alerte>}
          <Alerte ton="bleu">
            {indice === "IRL" ? "Bail d'habitation : révision une fois par an à la date prévue au bail, dans la limite de la variation de l'IRL ; à défaut de demande dans l'année, la révision est perdue pour l'année écoulée (art. 17-1 loi du 6 juillet 1989)." : indice === "ILC" || indice === "ILAT" ? "Bail commercial : révision triennale légale plafonnée à la variation de l'indice (art. L145-38 C. com.) ; avec une clause d'échelle mobile, indexation annuelle automatique, la variation restant limitée à 10 % du loyer de l'année précédente (art. L145-39)." : "ICC : indice conservé pour les baux anciens ; les nouveaux baux commerciaux utilisent l'ILC ou l'ILAT."}
          </Alerte>
        </div>
      </CardBody>
    </Card>
  );
}

function Rentabilite() {
  const [prix, setPrix] = useState("150 000");
  const [frais, setFrais] = useState("12 000");
  const [travaux, setTravaux] = useState("8 000");
  const [loyer, setLoyer] = useState("650");
  const [charges, setCharges] = useState("400");
  const [tf, setTf] = useState("900");
  const [pno, setPno] = useState("150");
  const [gestion, setGestion] = useState("0");
  const [vacance, setVacance] = useState("2");
  const [credit, setCredit] = useState("700");
  const r = rentabilite({ prix: n(prix), fraisAcquisition: n(frais), travaux: n(travaux), loyerMensuelHC: n(loyer), chargesNonRecuperablesAnnuelles: n(charges), taxeFonciere: n(tf), assurancePNO: n(pno), gestionPct: n(gestion), vacanceSemaines: n(vacance), mensualiteCredit: n(credit) });
  return (
    <Card>
      <CardHeader titre="Rentabilité locative" description="Brute : loyer annuel ÷ prix. Nette : revenu après charges non récupérables, taxe foncière, assurance PNO, gestion et vacance, rapporté au coût total d'acquisition (avant impôt)." />
      <CardBody className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="grid grid-cols-2 gap-3">
          <Nombre label="Prix d'achat" valeur={prix} onChange={setPrix} suffixe="€" />
          <Nombre label="Frais d'acquisition" valeur={frais} onChange={setFrais} suffixe="€" hint="Notaire, agence" />
          <Nombre label="Travaux" valeur={travaux} onChange={setTravaux} suffixe="€" />
          <Nombre label="Loyer mensuel hors charges" valeur={loyer} onChange={setLoyer} suffixe="€" />
          <Nombre label="Charges non récupérables" valeur={charges} onChange={setCharges} suffixe="€ / an" />
          <Nombre label="Taxe foncière" valeur={tf} onChange={setTf} suffixe="€ / an" />
          <Nombre label="Assurance PNO" valeur={pno} onChange={setPno} suffixe="€ / an" />
          <Nombre label="Frais de gestion" valeur={gestion} onChange={setGestion} suffixe="% des loyers" />
          <Nombre label="Vacance locative" valeur={vacance} onChange={setVacance} suffixe="semaines / an" />
          <Nombre label="Mensualité de crédit" valeur={credit} onChange={setCredit} suffixe="€" />
        </div>
        <Resultats lignes={[
          { libelle: "Investissement total", valeur: formatEuros(r.investissement) },
          { libelle: "Loyers annuels hors charges", valeur: formatEuros(r.loyerAnnuelHC) },
          { libelle: "Loyers encaissés (après vacance)", valeur: formatEuros(r.loyerAnnuelEncaisse) },
          { libelle: "Charges annuelles", valeur: formatEuros(r.chargesAnnuelles) },
          { libelle: "Frais de gestion", valeur: formatEuros(r.fraisGestion) },
          { libelle: "Revenu net annuel (avant impôt)", valeur: formatEuros(r.revenuNetAnnuel) },
          { libelle: "Rentabilité brute", valeur: pct(r.rentabiliteBrutePct), fort: true },
          { libelle: "Rentabilité nette", valeur: pct(r.rentabiliteNettePct), fort: true },
          { libelle: "Cash-flow mensuel (après crédit)", valeur: <span className={r.cashFlowMensuel < 0 ? "text-red-700" : "text-emerald-700"}>{formatEuros(r.cashFlowMensuel)}</span>, fort: true },
        ]} />
      </CardBody>
    </Card>
  );
}

const ONGLETS = [
  { cle: "pourcentages", libelle: "Pourcentages de loyer", composant: Pourcentages },
  { cle: "revision", libelle: "Révision de loyer", composant: Revision },
  { cle: "rentabilite", libelle: "Rentabilité", composant: Rentabilite },
  { cle: "notaire", libelle: "Frais de notaire", composant: Notaire },
  { cle: "emprunt", libelle: "Capacité d'emprunt", composant: Emprunt },
  { cle: "mensualite", libelle: "Mensualité de prêt", composant: Mensualite },
  { cle: "infine", libelle: "Prêt in fine", composant: InFine },
] as const;

export function Calculatrices({ initial = "pourcentages" }: { initial?: string }) {
  const [actif, setActif] = useState<string>(ONGLETS.some((o) => o.cle === initial) ? initial : "pourcentages");
  const Composant = ONGLETS.find((o) => o.cle === actif)!.composant;
  return (
    <div className="space-y-6">
      <nav className="flex flex-wrap gap-2 text-sm">
        {ONGLETS.map((o) => (
          <button key={o.cle} type="button" onClick={() => setActif(o.cle)} className={`rounded-full px-3 py-1 ${actif === o.cle ? "bg-navy-800 text-white" : "bg-white text-navy-800 ring-1 ring-slate-200 hover:bg-slate-50"}`}>
            {o.libelle}
          </button>
        ))}
      </nav>
      <Composant />
    </div>
  );
}
