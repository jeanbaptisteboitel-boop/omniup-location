"use client";

import { useActionState, useState } from "react";
import type { Bail, TypeBail } from "@prisma/client";
import type { FormState } from "@/lib/forms";
import { MOTIFS_MOBILITE, TYPES_BAIL_COURT } from "@/lib/libelles";
import { REGLES_BAIL, dateFinParDefaut } from "@/lib/bail-regles";
import { parseDateISO, toISODate } from "@/lib/dates";
import { formatEuros, montantPourSaisie, parseMontant } from "@/lib/montants";
import { trimestresIRL } from "@/lib/irl";
import { Checkbox, Field, FormActions, FormMessage, Input, RadioCarte, Select, SubmitButton, Textarea, valeurInitiale } from "@/components/form";
import { Alerte, ButtonLink } from "@/components/ui";
import { useVersion } from "./use-version";

export type LotOption = { id: number; nom: string; adresse: string; codePostal: string; ville: string; meuble: boolean; bailleurPersonneMorale: boolean; loyerIndicatif?: number | null; chargesIndicatives?: number | null };
export type LocataireOption = { id: number; nom: string };

const TYPES: { valeur: TypeBail; aide: string }[] = [
  { valeur: "NON_MEUBLE", aide: "Logement vide, 3 ans" },
  { valeur: "MEUBLE", aide: "Logement meublé, 1 an" },
  { valeur: "MOBILITE", aide: "Meublé, 1 à 10 mois" },
];

const AIDE_DUREE: Record<TypeBail, string> = {
  NON_MEUBLE: "3 ans renouvelables (6 ans si le bailleur est une société).",
  MEUBLE: "1 an renouvelable (9 mois pour un étudiant).",
  MOBILITE: "De 1 à 10 mois, non renouvelable.",
};

export function BailForm({
  action,
  initial,
  lots,
  locataires,
  annulerHref,
  verrouille = false,
  libelleEnvoi = "Enregistrer",
}: {
  action: (prev: FormState, fd: FormData) => Promise<FormState>;
  initial: Partial<Bail>;
  lots: LotOption[];
  locataires: LocataireOption[];
  annulerHref: string;
  verrouille?: boolean;
  libelleEnvoi?: string;
}) {
  const [state, formAction] = useActionState(action, null);
  const e = state?.errors ?? {};
  // Remonte le formulaire à chaque réponse du serveur : les champs contrôlés (type, lot, dates…) et les valeurs
  // par défaut re-soumises (valeurInitiale) sont alors resynchronisés après la réinitialisation automatique de React.
  const version = useVersion(state);

  const [type, setType] = useState<TypeBail>((valeurInitiale(state, "type", initial.type ?? "NON_MEUBLE") || "NON_MEUBLE") as TypeBail);
  const [lotId, setLotId] = useState(valeurInitiale(state, "lotId", initial.lotId));
  const [dateDebut, setDateDebut] = useState(valeurInitiale(state, "dateDebut", toISODate(initial.dateDebut)));
  const [dateFin, setDateFin] = useState(valeurInitiale(state, "dateFin", toISODate(initial.dateFin)));
  const [finManuelle, setFinManuelle] = useState(!!initial.dateFin || !!state?.values?.dateFin);
  const [loyerHC, setLoyerHC] = useState(valeurInitiale(state, "loyerHC", montantPourSaisie(initial.loyerHC)));
  const [charges, setCharges] = useState(valeurInitiale(state, "charges", montantPourSaisie(initial.charges ?? 0)));

  const regle = REGLES_BAIL[type];
  const lot = lots.find((l) => String(l.id) === lotId);
  // Après une erreur serveur, React réinitialise le formulaire : les <select> non contrôlés sont remontés (key) sur la valeur re-soumise.
  const locataireInitial = valeurInitiale(state, "locataireId", initial.locataireId);
  const motifInitial = valeurInitiale(state, "motifMobilite", initial.motifMobilite);
  const irlTrimestreInitial = valeurInitiale(state, "irlTrimestre", initial.irlTrimestre);
  const montantLoyer = parseMontant(loyerHC) ?? 0;
  const total = montantLoyer + (parseMontant(charges) ?? 0);
  const plafondDepot = regle.depotMaxMois * montantLoyer;

  function finAuto(t: TypeBail, debut: string, idLot: string): string {
    const d = parseDateISO(debut);
    if (!d) return "";
    const l = lots.find((x) => String(x.id) === idLot);
    return toISODate(dateFinParDefaut(t, d, !!l?.bailleurPersonneMorale));
  }
  function changerType(t: TypeBail) {
    setType(t);
    if (!finManuelle) setDateFin(finAuto(t, dateDebut, lotId));
  }
  function changerDebut(v: string) {
    setDateDebut(v);
    if (!finManuelle) setDateFin(finAuto(type, v, lotId));
  }
  function changerLot(v: string) {
    setLotId(v);
    if (!finManuelle) setDateFin(finAuto(type, dateDebut, v));
    const l = lots.find((x) => String(x.id) === v);
    // Pré-remplit le loyer et les charges indicatifs du lot tant qu'ils n'ont pas été saisis.
    if (l && l.loyerIndicatif !== null && l.loyerIndicatif !== undefined && (parseMontant(loyerHC) ?? 0) === 0) {
      setLoyerHC(montantPourSaisie(l.loyerIndicatif));
      if ((parseMontant(charges) ?? 0) === 0) setCharges(montantPourSaisie(l.chargesIndicatives ?? 0));
    }
  }

  const trimestres = trimestresIRL(new Date().getFullYear()).map((t) => ({ value: t, label: t }));
  const aideDuree = `${AIDE_DUREE[type]}${finManuelle ? "" : " Proposée automatiquement ; modifiable."}`;
  const aideDepot = regle.depotMaxMois === 0 ? "Aucun dépôt de garantie autorisé en bail mobilité." : `Plafond légal : ${regle.depotMaxMois} mois de loyer hors charges${montantLoyer > 0 ? `, soit ${formatEuros(plafondDepot)}` : ""}.`;

  return (
    <form key={version} action={formAction} className="flex flex-col gap-5">
      <FormMessage state={state} />
      {verrouille && <Alerte ton="orange">Ce bail est signé : le lot, le locataire, le type et la date de début ne sont plus modifiables.</Alerte>}

      <div className="grid grid-cols-1 gap-[18px] sm:grid-cols-2">
        <fieldset className="sm:col-span-2">
          <legend className="mb-1.5 block text-sm font-semibold text-navy-900">
            Type de bail<span className="ml-1 text-red-600">*</span>
          </legend>
          <div role="radiogroup" className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {TYPES.map((t) => (
              <RadioCarte key={t.valeur} name="typeChoix" value={t.valeur} checked={type === t.valeur} onChange={() => changerType(t.valeur)} disabled={verrouille} label={TYPES_BAIL_COURT[t.valeur]} aide={t.aide} />
            ))}
          </div>
          {/* Valeur transmise au serveur (reflète la carte cochée). */}
          <select name="type" value={type} onChange={(ev) => changerType(ev.target.value as TypeBail)} disabled={verrouille} tabIndex={-1} aria-hidden="true" className="sr-only">
            {TYPES.map((t) => (
              <option key={t.valeur} value={t.valeur}>{TYPES_BAIL_COURT[t.valeur]}</option>
            ))}
          </select>
          {e.type ? (
            <p className="mt-1.5 text-xs text-red-600">{e.type}</p>
          ) : (
            <p className="mt-1.5 text-xs text-slate-500">
              {regle.resume} Préavis du locataire : {regle.preavisLocataire}. Congé du bailleur : {regle.preavisBailleur}.
            </p>
          )}
          {lot && !lot.meuble && type !== "NON_MEUBLE" && <p className="mt-1.5 text-xs font-semibold text-amber-800">Le lot choisi n'est pas indiqué comme meublé.</p>}
        </fieldset>

        <Field label="Lot" name="lotId" requis error={e.lotId}>
          <Select
            name="lotId"
            vide="Choisir un lot…"
            options={lots.map((l) => ({ value: String(l.id), label: `${l.nom} — ${l.adresse}, ${l.codePostal} ${l.ville}${l.meuble ? " (meublé)" : ""}` }))}
            value={lotId}
            onChange={(ev) => changerLot(ev.target.value)}
            invalide={!!e.lotId}
            disabled={verrouille}
          />
        </Field>
        <Field label="Locataire" name="locataireId" requis error={e.locataireId}>
          <Select key={locataireInitial} name="locataireId" vide="Choisir un locataire…" options={locataires.map((l) => ({ value: String(l.id), label: l.nom }))} defaultValue={locataireInitial} invalide={!!e.locataireId} disabled={verrouille} />
        </Field>

        {type === "MOBILITE" && (
          <Field label="Motif du bail mobilité" name="motifMobilite" requis error={e.motifMobilite} className="sm:col-span-2" hint="Situation du locataire justifiant le recours au bail mobilité (art. 25-12 de la loi du 6 juillet 1989).">
            <Select key={motifInitial} name="motifMobilite" vide="Choisir un motif…" options={MOTIFS_MOBILITE.map((m) => ({ value: m, label: m }))} defaultValue={motifInitial} invalide={!!e.motifMobilite} />
          </Field>
        )}

        <Field label="Date de début" name="dateDebut" requis error={e.dateDebut}>
          <Input name="dateDebut" type="date" value={dateDebut} onChange={(ev) => changerDebut(ev.target.value)} invalide={!!e.dateDebut} disabled={verrouille} />
        </Field>
        <Field label="Date de fin" name="dateFin" requis error={e.dateFin} hint={aideDuree}>
          <Input
            name="dateFin"
            type="date"
            value={dateFin}
            onChange={(ev) => {
              setFinManuelle(true);
              setDateFin(ev.target.value);
            }}
            invalide={!!e.dateFin}
          />
        </Field>

        <Field label="Loyer hors charges (€)" name="loyerHC" requis error={e.loyerHC}>
          <Input name="loyerHC" inputMode="decimal" value={loyerHC} onChange={(ev) => setLoyerHC(ev.target.value)} invalide={!!e.loyerHC} />
        </Field>
        <div>
          <Field label="Charges (€)" name="charges" error={e.charges}>
            <Input name="charges" inputMode="decimal" value={charges} onChange={(ev) => setCharges(ev.target.value)} invalide={!!e.charges} />
          </Field>
          <div className="mt-2">
            {type === "MOBILITE" ? (
              <>
                <input type="hidden" name="chargesForfait" value="on" />
                <Checkbox name="chargesForfait_affichage" label="Charges au forfait (sans régularisation)" hint="Obligatoire pour un bail mobilité" checked disabled />
              </>
            ) : (
              <Checkbox
                name="chargesForfait"
                label="Charges au forfait (sans régularisation)"
                hint={type === "MEUBLE" ? "Sinon, provisions sur charges régularisées chaque année" : "Pour un logement vide, les charges sont en principe des provisions régularisées chaque année"}
                defaultChecked={state?.values ? state.values.chargesForfait === "on" : !!initial.chargesForfait}
              />
            )}
          </div>
        </div>

        <Field label="Dépôt de garantie (€)" name="depotGarantie" error={e.depotGarantie} hint={aideDepot}>
          <Input name="depotGarantie" inputMode="decimal" defaultValue={valeurInitiale(state, "depotGarantie", montantPourSaisie(initial.depotGarantie ?? 0))} invalide={!!e.depotGarantie} disabled={type === "MOBILITE"} />
        </Field>
        <Field label="Jour d'échéance du loyer" name="jourEcheance" requis error={e.jourEcheance} hint="Jour du mois auquel le loyer est payable (terme à échoir).">
          <Input name="jourEcheance" inputMode="numeric" defaultValue={valeurInitiale(state, "jourEcheance", initial.jourEcheance ?? 1)} invalide={!!e.jourEcheance} />
        </Field>

        {type !== "MOBILITE" && (
          <>
            <fieldset className="sm:col-span-2">
              <legend className="mb-1.5 block text-sm font-semibold text-navy-900">Indice de référence</legend>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Select key={irlTrimestreInitial} name="irlTrimestre" aria-label="Trimestre de l'IRL de référence" vide="Trimestre…" options={trimestres} defaultValue={irlTrimestreInitial} invalide={!!e.irlTrimestre} />
                <Input name="irlValeur" aria-label="Valeur de l'IRL de référence" inputMode="decimal" placeholder="Valeur, ex. : 145,17" defaultValue={valeurInitiale(state, "irlValeur", initial.irlValeur !== null && initial.irlValeur !== undefined ? String(initial.irlValeur).replace(".", ",") : "")} invalide={!!e.irlValeur} />
              </div>
              {e.irlTrimestre || e.irlValeur ? <p className="mt-1.5 text-xs text-red-600">{e.irlTrimestre ?? e.irlValeur}</p> : <p className="mt-1.5 text-xs text-slate-500">Dernier IRL publié par l'INSEE à la signature : trimestre et valeur.</p>}
            </fieldset>
            <div className="sm:col-span-2">
              <Checkbox name="clauseRevision" label="Clause de révision annuelle du loyer (IRL)" hint="Le loyer pourra être révisé chaque année à la date anniversaire selon l'indice de référence des loyers" defaultChecked={state?.values ? state.values.clauseRevision === "on" : (initial.clauseRevision ?? true)} />
            </div>
          </>
        )}

        <Field label="Notes" name="notes" error={e.notes} className="sm:col-span-2">
          <Textarea name="notes" rows={3} defaultValue={valeurInitiale(state, "notes", initial.notes)} invalide={!!e.notes} placeholder="Garant, clauses particulières, état des lieux…" />
        </Field>
      </div>

      <div className="flex items-center justify-between gap-3 rounded-lg border border-navy-200 bg-navy-50 px-3.5 py-3 text-sm text-navy-800">
        <span>Loyer mensuel charges comprises</span>
        <strong className="text-lg text-navy-900 tabular-nums">{formatEuros(total)}</strong>
      </div>

      <FormActions>
        <SubmitButton>{libelleEnvoi}</SubmitButton>
        <ButtonLink href={annulerHref} variante="secondary">Annuler</ButtonLink>
      </FormActions>
    </form>
  );
}
