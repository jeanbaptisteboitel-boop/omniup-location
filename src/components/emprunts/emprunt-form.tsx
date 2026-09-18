"use client";

import { useActionState } from "react";
import type { Emprunt } from "@prisma/client";
import type { FormState } from "@/lib/forms";
import { toISODate } from "@/lib/dates";
import { montantPourSaisie } from "@/lib/montants";
import { affectationVers, type OptionsAffectation } from "@/lib/affectation";
import { Field, FormActions, FormMessage, Input, SubmitButton, Textarea, valeurInitiale } from "@/components/form";
import { ButtonLink } from "@/components/ui";

const SELECT = "block h-10 w-full rounded-lg border bg-white px-3 text-sm text-navy-950 focus:border-brand-cyan focus:outline-none focus:ring-2 focus:ring-brand-cyan/30";

export function EmpruntForm({
  action,
  initial,
  affectations,
  affectationInitiale,
  annulerHref,
  libelleEnvoi = "Enregistrer",
}: {
  action: (prev: FormState, fd: FormData) => Promise<FormState>;
  initial: Partial<Emprunt>;
  affectations: OptionsAffectation;
  affectationInitiale?: string;
  annulerHref: string;
  libelleEnvoi?: string;
}) {
  const [state, formAction] = useActionState(action, null);
  const e = state?.errors ?? {};
  const affectationDefaut = affectationInitiale ?? (initial.lotId || initial.immeubleId ? affectationVers({ lotId: initial.lotId ?? null, immeubleId: initial.immeubleId ?? null }) : "");
  return (
    <form action={formAction} className="flex flex-col gap-[18px]">
      <FormMessage state={state} />
      <div className="grid grid-cols-1 gap-[18px] sm:grid-cols-2">
        <Field label="Intitulé" name="libelle" requis error={e.libelle} className="sm:col-span-2">
          <Input name="libelle" defaultValue={valeurInitiale(state, "libelle", initial.libelle)} invalide={!!e.libelle} placeholder="ex. Prêt Maison Darnétal" />
        </Field>
        <Field label="Banque" name="banque" error={e.banque}>
          <Input name="banque" defaultValue={valeurInitiale(state, "banque", initial.banque)} invalide={!!e.banque} />
        </Field>
        <Field label="Immeuble / lot financé" name="affectation" requis error={e.affectation}>
          <select id="affectation" name="affectation" defaultValue={valeurInitiale(state, "affectation", affectationDefaut)} className={`${SELECT} ${e.affectation ? "border-red-400 shadow-[0_0_0_3px_#fee2e2]" : "border-slate-300"}`}>
            <option value="">Choisir…</option>
            {affectations.immeubles.length > 0 && (
              <optgroup label="Immeubles">
                {affectations.immeubles.map((i) => <option key={i.id} value={`immeuble:${i.id}`}>{i.nom} — {i.ville}</option>)}
              </optgroup>
            )}
            {affectations.lots.length > 0 && (
              <optgroup label="Lots">
                {affectations.lots.map((l) => <option key={l.id} value={`lot:${l.id}`}>{l.nom} — {l.ville}</option>)}
              </optgroup>
            )}
          </select>
        </Field>
        <Field label="Capital emprunté (€)" name="montantInitial" requis error={e.montantInitial}>
          <Input name="montantInitial" inputMode="decimal" defaultValue={valeurInitiale(state, "montantInitial", montantPourSaisie(initial.montantInitial))} invalide={!!e.montantInitial} />
        </Field>
        <Field label="Taux nominal (%)" name="tauxAnnuel" error={e.tauxAnnuel} hint="Hors assurance ; sert à calculer un échéancier théorique">
          <Input name="tauxAnnuel" inputMode="decimal" defaultValue={valeurInitiale(state, "tauxAnnuel", initial.tauxAnnuel !== null && initial.tauxAnnuel !== undefined ? String(initial.tauxAnnuel).replace(".", ",") : "")} invalide={!!e.tauxAnnuel} placeholder="ex. 1,45" />
        </Field>
        <Field label="Durée (mois)" name="dureeMois" error={e.dureeMois}>
          <Input name="dureeMois" inputMode="numeric" defaultValue={valeurInitiale(state, "dureeMois", initial.dureeMois)} invalide={!!e.dureeMois} placeholder="ex. 240" />
        </Field>
        <Field label="Première échéance" name="dateDebut" error={e.dateDebut}>
          <Input name="dateDebut" type="date" defaultValue={valeurInitiale(state, "dateDebut", toISODate(initial.dateDebut))} invalide={!!e.dateDebut} />
        </Field>
        <Field label="Référence du prêt" name="reference" error={e.reference}>
          <Input name="reference" defaultValue={valeurInitiale(state, "reference", initial.reference)} invalide={!!e.reference} />
        </Field>
        <Field label="Assurance emprunteur mensuelle (€)" name="assuranceMensuelle" error={e.assuranceMensuelle}>
          <Input name="assuranceMensuelle" inputMode="decimal" defaultValue={valeurInitiale(state, "assuranceMensuelle", montantPourSaisie(initial.assuranceMensuelle))} invalide={!!e.assuranceMensuelle} />
        </Field>
        <Field label="Notes" name="notes" error={e.notes} className="sm:col-span-2">
          <Textarea name="notes" rows={2} defaultValue={valeurInitiale(state, "notes", initial.notes)} />
        </Field>
      </div>
      <FormActions>
        <SubmitButton>{libelleEnvoi}</SubmitButton>
        <ButtonLink href={annulerHref} variante="secondary">Annuler</ButtonLink>
      </FormActions>
    </form>
  );
}
