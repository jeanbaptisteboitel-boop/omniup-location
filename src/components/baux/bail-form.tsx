"use client";

import { useActionState, useState } from "react";
import type { Bail, TypeBail } from "@prisma/client";
import type { FormState } from "@/lib/forms";
import { MOTIFS_MOBILITE, TYPES_BAIL, options } from "@/lib/libelles";
import { REGLES_BAIL, dateFinParDefaut } from "@/lib/bail-regles";
import { parseDateISO, toISODate } from "@/lib/dates";
import { montantPourSaisie } from "@/lib/montants";
import { trimestresIRL } from "@/lib/irl";
import { Checkbox, Field, FormActions, FormMessage, Input, Select, SubmitButton, Textarea, valeurInitiale } from "@/components/form";
import { Alerte, ButtonLink } from "@/components/ui";

export type LotOption = { id: number; nom: string; adresse: string; codePostal: string; ville: string; meuble: boolean; bailleurPersonneMorale: boolean };
export type LocataireOption = { id: number; nom: string };

export function BailForm({
  action,
  initial,
  lots,
  locataires,
  annulerHref,
  verrouille = false,
}: {
  action: (prev: FormState, fd: FormData) => Promise<FormState>;
  initial: Partial<Bail>;
  lots: LotOption[];
  locataires: LocataireOption[];
  annulerHref: string;
  verrouille?: boolean;
}) {
  const [state, formAction] = useActionState(action, null);
  const e = state?.errors ?? {};

  const [type, setType] = useState<TypeBail>((valeurInitiale(state, "type", initial.type ?? "NON_MEUBLE") || "NON_MEUBLE") as TypeBail);
  const [lotId, setLotId] = useState(valeurInitiale(state, "lotId", initial.lotId));
  const [dateDebut, setDateDebut] = useState(valeurInitiale(state, "dateDebut", toISODate(initial.dateDebut)));
  const [dateFin, setDateFin] = useState(valeurInitiale(state, "dateFin", toISODate(initial.dateFin)));
  const [finManuelle, setFinManuelle] = useState(!!initial.dateFin || !!state?.values?.dateFin);

  const regle = REGLES_BAIL[type];
  const lot = lots.find((l) => String(l.id) === lotId);

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
  }

  const anneeCourante = new Date().getFullYear();
  const trimestres = trimestresIRL(anneeCourante).map((t) => ({ value: t, label: t }));

  return (
    <form action={formAction} className="space-y-6">
      <FormMessage state={state} />
      {verrouille && <Alerte ton="orange">Ce bail est signé : le lot, le locataire, le type et la date de début ne sont plus modifiables.</Alerte>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Lot" name="lotId" requis error={e.lotId}>
          <Select
            name="lotId"
            vide="— Choisir un lot —"
            options={lots.map((l) => ({ value: String(l.id), label: `${l.nom} — ${l.adresse}, ${l.codePostal} ${l.ville}${l.meuble ? " (meublé)" : ""}` }))}
            value={lotId}
            onChange={(ev) => changerLot(ev.target.value)}
            invalide={!!e.lotId}
            disabled={verrouille}
          />
        </Field>
        <Field label="Locataire" name="locataireId" requis error={e.locataireId}>
          <Select name="locataireId" vide="— Choisir un locataire —" options={locataires.map((l) => ({ value: String(l.id), label: l.nom }))} defaultValue={valeurInitiale(state, "locataireId", initial.locataireId)} invalide={!!e.locataireId} disabled={verrouille} />
        </Field>

        <Field label="Type de bail" name="type" requis error={e.type} className="sm:col-span-2">
          <Select name="type" options={options(TYPES_BAIL)} value={type} onChange={(ev) => changerType(ev.target.value as TypeBail)} disabled={verrouille} />
        </Field>
        <div className="sm:col-span-2">
          <Alerte ton="bleu" titre={regle.libelle}>
            <p>{regle.resume}</p>
            <p className="mt-1 text-xs">Préavis du locataire : {regle.preavisLocataire}. Congé du bailleur : {regle.preavisBailleur}.</p>
            {lot && !lot.meuble && type !== "NON_MEUBLE" && <p className="mt-1 text-xs font-semibold text-amber-800">Le lot choisi n'est pas indiqué comme meublé.</p>}
          </Alerte>
        </div>

        {type === "MOBILITE" && (
          <Field label="Motif du bail mobilité" name="motifMobilite" requis error={e.motifMobilite} className="sm:col-span-2" hint="Situation du locataire justifiant le recours au bail mobilité (art. 25-12 de la loi du 6 juillet 1989)">
            <Select name="motifMobilite" vide="— Choisir —" options={MOTIFS_MOBILITE.map((m) => ({ value: m, label: m }))} defaultValue={valeurInitiale(state, "motifMobilite", initial.motifMobilite)} invalide={!!e.motifMobilite} />
          </Field>
        )}

        <Field label="Date de début" name="dateDebut" requis error={e.dateDebut}>
          <Input name="dateDebut" type="date" value={dateDebut} onChange={(ev) => changerDebut(ev.target.value)} invalide={!!e.dateDebut} disabled={verrouille} />
        </Field>
        <Field label="Date de fin" name="dateFin" requis error={e.dateFin} hint={finManuelle ? undefined : "Proposée automatiquement selon la durée légale ; modifiable"}>
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

        <Field label="Loyer mensuel hors charges (€)" name="loyerHC" requis error={e.loyerHC}>
          <Input name="loyerHC" inputMode="decimal" defaultValue={valeurInitiale(state, "loyerHC", montantPourSaisie(initial.loyerHC))} invalide={!!e.loyerHC} />
        </Field>
        <Field label="Charges mensuelles (€)" name="charges" error={e.charges}>
          <Input name="charges" inputMode="decimal" defaultValue={valeurInitiale(state, "charges", montantPourSaisie(initial.charges ?? 0))} invalide={!!e.charges} />
        </Field>
        <div className="sm:col-span-2">
          {type === "MOBILITE" ? (
            <>
              <input type="hidden" name="chargesForfait" value="on" />
              <Checkbox name="chargesForfait_affichage" label="Charges au forfait" hint="Obligatoire pour un bail mobilité (pas de régularisation)" checked disabled />
            </>
          ) : (
            <Checkbox
              name="chargesForfait"
              label="Charges au forfait"
              hint={type === "MEUBLE" ? "Sinon, provisions sur charges régularisées annuellement" : "Pour un logement vide, les charges sont en principe des provisions régularisées chaque année"}
              defaultChecked={state?.values ? state.values.chargesForfait === "on" : !!initial.chargesForfait}
            />
          )}
        </div>

        <Field label="Dépôt de garantie (€)" name="depotGarantie" error={e.depotGarantie} hint={regle.depotMaxMois === 0 ? "Interdit pour un bail mobilité" : `Maximum : ${regle.depotMaxMois} mois de loyer hors charges`}>
          <Input name="depotGarantie" inputMode="decimal" defaultValue={valeurInitiale(state, "depotGarantie", montantPourSaisie(initial.depotGarantie ?? 0))} invalide={!!e.depotGarantie} disabled={type === "MOBILITE"} />
        </Field>
        <Field label="Jour d'échéance du loyer" name="jourEcheance" requis error={e.jourEcheance} hint="Jour du mois auquel le loyer est payable (terme à échoir)">
          <Input name="jourEcheance" inputMode="numeric" defaultValue={valeurInitiale(state, "jourEcheance", initial.jourEcheance ?? 1)} invalide={!!e.jourEcheance} />
        </Field>

        {type !== "MOBILITE" && (
          <>
            <div className="sm:col-span-2">
              <Checkbox name="clauseRevision" label="Clause de révision annuelle du loyer (IRL)" hint="Le loyer pourra être révisé chaque année à la date anniversaire selon l'indice de référence des loyers" defaultChecked={state?.values ? state.values.clauseRevision === "on" : initial.clauseRevision ?? true} />
            </div>
            <Field label="Trimestre de l'IRL de référence" name="irlTrimestre" error={e.irlTrimestre} hint="Dernier indice publié à la date de signature">
              <Select name="irlTrimestre" vide="—" options={trimestres} defaultValue={valeurInitiale(state, "irlTrimestre", initial.irlTrimestre)} />
            </Field>
            <Field label="Valeur de l'IRL de référence" name="irlValeur" error={e.irlValeur} hint="Publié par l'INSEE (ex. : 145,17)">
              <Input name="irlValeur" inputMode="decimal" defaultValue={valeurInitiale(state, "irlValeur", initial.irlValeur !== null && initial.irlValeur !== undefined ? String(initial.irlValeur).replace(".", ",") : "")} invalide={!!e.irlValeur} />
            </Field>
          </>
        )}

        <Field label="Notes" name="notes" error={e.notes} className="sm:col-span-2">
          <Textarea name="notes" rows={3} defaultValue={valeurInitiale(state, "notes", initial.notes)} placeholder="Garant, clauses particulières, état des lieux…" />
        </Field>
      </div>

      <FormActions>
        <SubmitButton>Enregistrer</SubmitButton>
        <ButtonLink href={annulerHref} variante="ghost">Annuler</ButtonLink>
      </FormActions>
    </form>
  );
}
