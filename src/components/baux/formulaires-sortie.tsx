"use client";

import { useActionState, useState } from "react";
import type { OrigineConge } from "@prisma/client";
import type { FormState } from "@/lib/forms";
import { MODES_PAIEMENT, options } from "@/lib/libelles";
import { MOTIFS_CONGE_BAILLEUR, MOTIFS_PREAVIS_REDUIT, finPreavis, preavisMois } from "@/lib/sortie-bail";
import { parseDateISO, toISODate } from "@/lib/dates";
import { montantPourSaisie } from "@/lib/montants";
import { Field, FormMessage, Input, RadioCarte, Select, SubmitButton, Textarea, valeurInitiale } from "@/components/form";

type Action = (prev: FormState, fd: FormData) => Promise<FormState>;
const MODES = options(MODES_PAIEMENT);

/** Encaissement du dépôt de garantie. */
export function DepotForm({ action, montantPrevu, dateDefaut }: { action: Action; montantPrevu: number; dateDefaut: string }) {
  const [state, formAction] = useActionState(action, null);
  const e = state?.errors ?? {};
  return (
    <form action={formAction} className="flex flex-col gap-3.5">
      <FormMessage state={state} />
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
        <Field label="Date d'encaissement" name="depotRecuLe" requis error={e.depotRecuLe}>
          <Input name="depotRecuLe" type="date" defaultValue={valeurInitiale(state, "depotRecuLe", dateDefaut)} invalide={!!e.depotRecuLe} />
        </Field>
        <Field label="Montant reçu (€)" name="depotRecuMontant" requis error={e.depotRecuMontant} hint={`Prévu au bail : ${montantPourSaisie(montantPrevu)} €`}>
          <Input name="depotRecuMontant" inputMode="decimal" defaultValue={valeurInitiale(state, "depotRecuMontant", montantPourSaisie(montantPrevu))} invalide={!!e.depotRecuMontant} />
        </Field>
        <Field label="Mode de règlement" name="depotRecuMode" requis error={e.depotRecuMode}>
          <Select name="depotRecuMode" options={MODES} defaultValue={valeurInitiale(state, "depotRecuMode", "VIREMENT")} />
        </Field>
        <Field label="Référence" name="depotRecuReference" error={e.depotRecuReference} hint="N° de chèque, référence du virement…">
          <Input name="depotRecuReference" defaultValue={valeurInitiale(state, "depotRecuReference", "")} />
        </Field>
      </div>
      <div>
        <SubmitButton>Enregistrer l'encaissement</SubmitButton>
      </div>
    </form>
  );
}

/** Réception du congé : origine, date, préavis et départ annoncé. */
export function CongeForm({ action, type, dateDefaut }: { action: Action; type: Parameters<typeof preavisMois>[0]; dateDefaut: string }) {
  const [state, formAction] = useActionState(action, null);
  const e = state?.errors ?? {};
  const [origine, setOrigine] = useState<OrigineConge>((valeurInitiale(state, "congeOrigine", "LOCATAIRE") || "LOCATAIRE") as OrigineConge);
  const [recuLe, setRecuLe] = useState(valeurInitiale(state, "congeRecuLe", dateDefaut));
  const [reduit, setReduit] = useState(false);
  const [mois, setMois] = useState(String(preavisMois(type, "LOCATAIRE")));
  const [departManuel, setDepartManuel] = useState<string | null>(null);

  function changerOrigine(o: OrigineConge) {
    setOrigine(o);
    setReduit(false);
    setMois(String(preavisMois(type, o)));
  }
  function changerPreavis(r: boolean) {
    setReduit(r);
    setMois(String(preavisMois(type, origine, r)));
  }
  const debut = parseDateISO(recuLe);
  const nbMois = Number(mois);
  const departAuto = debut && Number.isFinite(nbMois) ? toISODate(finPreavis(debut, nbMois)) : "";
  const depart = departManuel ?? departAuto;
  const legal = preavisMois(type, origine);

  return (
    <form action={formAction} className="flex flex-col gap-3.5">
      <FormMessage state={state} />
      <fieldset>
        <legend className="mb-1.5 block text-sm font-semibold text-navy-900">Congé donné par<span className="ml-1 text-red-600">*</span></legend>
        <div role="radiogroup" className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <RadioCarte name="origineChoix" value="LOCATAIRE" checked={origine === "LOCATAIRE"} onChange={() => changerOrigine("LOCATAIRE")} label="Le locataire" aide={`Préavis de ${preavisMois(type, "LOCATAIRE")} mois`} />
          <RadioCarte name="origineChoix" value="BAILLEUR" checked={origine === "BAILLEUR"} onChange={() => changerOrigine("BAILLEUR")} label="Le bailleur" aide={preavisMois(type, "BAILLEUR") ? `Préavis de ${preavisMois(type, "BAILLEUR")} mois, motif obligatoire` : "Congé impossible sur ce type de bail"} />
        </div>
        <input type="hidden" name="congeOrigine" value={origine} />
      </fieldset>
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
        <Field label="Congé reçu le" name="congeRecuLe" requis error={e.congeRecuLe} hint="Date de réception de la lettre recommandée ou de l'acte.">
          <Input name="congeRecuLe" type="date" value={recuLe} onChange={(ev) => setRecuLe(ev.target.value)} invalide={!!e.congeRecuLe} />
        </Field>
        <Field label="Durée du préavis (mois)" name="congePreavisMois" requis error={e.congePreavisMois} hint={Number(mois) < legal ? `Préavis légal : ${legal} mois. Précisez le motif de la réduction.` : `Préavis légal : ${legal} mois.`}>
          <Input name="congePreavisMois" inputMode="numeric" value={mois} onChange={(ev) => { setMois(ev.target.value); setDepartManuel(null); }} invalide={!!e.congePreavisMois} />
        </Field>
        <Field label="Départ prévu le" name="congeDateDepart" error={e.congeDateDepart} hint={departManuel === null ? "Calculé d'après le préavis ; modifiable en cas d'accord." : "Date choisie manuellement."}>
          <Input name="congeDateDepart" type="date" value={depart} onChange={(ev) => setDepartManuel(ev.target.value)} invalide={!!e.congeDateDepart} />
        </Field>
        {origine === "LOCATAIRE" && (
          <div className="flex items-end pb-2.5">
            <label className="flex cursor-pointer items-start gap-2 text-sm text-navy-900">
              <input type="checkbox" checked={reduit} onChange={(ev) => changerPreavis(ev.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded border-slate-300 accent-navy-800" />
              <span>
                Préavis réduit à 1 mois
                <span className="block text-xs text-slate-500">Zone tendue ou cas prévus par l'article 15 I</span>
              </span>
            </label>
          </div>
        )}
      </div>
      <Field label="Motif" name="congeMotif" error={e.congeMotif} hint={origine === "BAILLEUR" ? "Reprise, vente ou motif légitime et sérieux : le motif doit figurer dans le congé." : "Motif justifiant un préavis réduit, le cas échéant."}>
        <Textarea name="congeMotif" rows={2} defaultValue={valeurInitiale(state, "congeMotif", "")} placeholder={origine === "BAILLEUR" ? MOTIFS_CONGE_BAILLEUR.join(" · ") : MOTIFS_PREAVIS_REDUIT.slice(0, 4).join(" · ")} />
      </Field>
      <div>
        <SubmitButton>Enregistrer le congé</SubmitButton>
      </div>
    </form>
  );
}

/** État des lieux de sortie : date et conformité à l'entrée (détermine le délai de restitution). */
export function EtatLieuxForm({ action, dateDefaut }: { action: Action; dateDefaut: string }) {
  const [state, formAction] = useActionState(action, null);
  const e = state?.errors ?? {};
  const [conforme, setConforme] = useState(true);
  return (
    <form action={formAction} className="flex flex-col gap-3.5">
      <FormMessage state={state} />
      <Field label="Réalisé le" name="etatLieuxSortieLe" requis error={e.etatLieuxSortieLe} className="max-w-xs">
        <Input name="etatLieuxSortieLe" type="date" defaultValue={valeurInitiale(state, "etatLieuxSortieLe", dateDefaut)} invalide={!!e.etatLieuxSortieLe} />
      </Field>
      <fieldset>
        <legend className="mb-1.5 block text-sm font-semibold text-navy-900">Comparaison avec l'état des lieux d'entrée</legend>
        <div role="radiogroup" className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <RadioCarte name="conformeChoix" value="oui" checked={conforme} onChange={() => setConforme(true)} label="Conforme" aide="Restitution du dépôt dans le mois" />
          <RadioCarte name="conformeChoix" value="non" checked={!conforme} onChange={() => setConforme(false)} label="Non conforme" aide="Restitution dans les deux mois, retenues justifiées" />
        </div>
        {conforme && <input type="hidden" name="etatLieuxConforme" value="on" />}
      </fieldset>
      <div>
        <SubmitButton>Enregistrer l'état des lieux</SubmitButton>
      </div>
    </form>
  );
}

/** Retenue sur le dépôt de garantie (réparation, ménage, dette locative). */
export function RetenueForm({ action }: { action: Action }) {
  const [state, formAction] = useActionState(action, null);
  const e = state?.errors ?? {};
  return (
    <form action={formAction} className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <Field label="Motif de la retenue" name="libelle" requis error={e.libelle} className="min-w-0 flex-1">
        <Input name="libelle" defaultValue={valeurInitiale(state, "libelle", "")} invalide={!!e.libelle} placeholder="ex. Remise en état du mur du séjour (devis Peinture SA)" />
      </Field>
      <Field label="Montant (€)" name="montant" requis error={e.montant} className="sm:w-40">
        <Input name="montant" inputMode="decimal" defaultValue={valeurInitiale(state, "montant", "")} invalide={!!e.montant} />
      </Field>
      <div className="shrink-0 pb-0.5">
        <SubmitButton variante="secondary">Ajouter</SubmitButton>
      </div>
    </form>
  );
}

/** Restitution effective du dépôt de garantie. */
export function RestitutionForm({ action, montantPropose, dateDefaut }: { action: Action; montantPropose: number; dateDefaut: string }) {
  const [state, formAction] = useActionState(action, null);
  const e = state?.errors ?? {};
  return (
    <form action={formAction} className="flex flex-col gap-3.5">
      <FormMessage state={state} />
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
        <Field label="Versé le" name="depotRestitueLe" requis error={e.depotRestitueLe}>
          <Input name="depotRestitueLe" type="date" defaultValue={valeurInitiale(state, "depotRestitueLe", dateDefaut)} invalide={!!e.depotRestitueLe} />
        </Field>
        <Field label="Montant (€)" name="depotRestitueMontant" error={e.depotRestitueMontant} hint="Décompte ci-dessus par défaut.">
          <Input name="depotRestitueMontant" inputMode="decimal" defaultValue={valeurInitiale(state, "depotRestitueMontant", montantPourSaisie(montantPropose))} invalide={!!e.depotRestitueMontant} />
        </Field>
        <Field label="Mode" name="depotRestitueMode" requis error={e.depotRestitueMode}>
          <Select name="depotRestitueMode" options={MODES} defaultValue={valeurInitiale(state, "depotRestitueMode", "VIREMENT")} />
        </Field>
      </div>
      <div>
        <SubmitButton>Enregistrer la restitution</SubmitButton>
      </div>
    </form>
  );
}
