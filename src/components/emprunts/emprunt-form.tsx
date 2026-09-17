"use client";

import { useActionState } from "react";
import type { Emprunt } from "@prisma/client";
import type { FormState } from "@/lib/forms";
import { toISODate } from "@/lib/dates";
import { montantPourSaisie } from "@/lib/montants";
import { affectationVers, type OptionsAffectation } from "@/lib/affectation";
import { Field, FormActions, FormMessage, Input, SubmitButton, Textarea, valeurInitiale } from "@/components/form";
import { ButtonLink } from "@/components/ui";

export function EmpruntForm({
  action,
  initial,
  affectations,
  affectationInitiale,
  annulerHref,
}: {
  action: (prev: FormState, fd: FormData) => Promise<FormState>;
  initial: Partial<Emprunt>;
  affectations: OptionsAffectation;
  affectationInitiale?: string;
  annulerHref: string;
}) {
  const [state, formAction] = useActionState(action, null);
  const e = state?.errors ?? {};
  const affectationDefaut = affectationInitiale ?? (initial.lotId || initial.immeubleId ? affectationVers({ lotId: initial.lotId ?? null, immeubleId: initial.immeubleId ?? null }) : "");
  return (
    <form action={formAction} className="space-y-6">
      <FormMessage state={state} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Libellé" name="libelle" requis error={e.libelle} className="sm:col-span-2" hint="Ex. : Prêt immobilier Crédit Agricole – appartement Rouen">
          <Input name="libelle" defaultValue={valeurInitiale(state, "libelle", initial.libelle)} invalide={!!e.libelle} />
        </Field>
        <Field label="Banque" name="banque" error={e.banque}>
          <Input name="banque" defaultValue={valeurInitiale(state, "banque", initial.banque)} />
        </Field>
        <Field label="Référence du prêt" name="reference" error={e.reference}>
          <Input name="reference" defaultValue={valeurInitiale(state, "reference", initial.reference)} />
        </Field>
        <Field label="Bien financé" name="affectation" requis error={e.affectation}>
          <select id="affectation" name="affectation" defaultValue={valeurInitiale(state, "affectation", affectationDefaut)} className={`block w-full rounded-md border bg-white px-3 py-2 text-sm shadow-sm focus:border-brand-cyan focus:outline-none focus:ring-2 focus:ring-brand-cyan/40 ${e.affectation ? "border-red-400" : "border-slate-300"}`}>
            <option value="">— Choisir —</option>
            {affectations.lots.length > 0 && (
              <optgroup label="Lots">
                {affectations.lots.map((l) => <option key={l.id} value={`lot:${l.id}`}>{l.nom} — {l.ville}</option>)}
              </optgroup>
            )}
            {affectations.immeubles.length > 0 && (
              <optgroup label="Immeubles">
                {affectations.immeubles.map((i) => <option key={i.id} value={`immeuble:${i.id}`}>{i.nom} — {i.ville}</option>)}
              </optgroup>
            )}
          </select>
        </Field>
        <Field label="Montant emprunté (€)" name="montantInitial" requis error={e.montantInitial}>
          <Input name="montantInitial" inputMode="decimal" defaultValue={valeurInitiale(state, "montantInitial", montantPourSaisie(initial.montantInitial))} invalide={!!e.montantInitial} />
        </Field>
        <Field label="Taux annuel (%)" name="tauxAnnuel" error={e.tauxAnnuel} hint="Taux nominal hors assurance, pour générer un échéancier théorique">
          <Input name="tauxAnnuel" inputMode="decimal" defaultValue={valeurInitiale(state, "tauxAnnuel", initial.tauxAnnuel !== null && initial.tauxAnnuel !== undefined ? String(initial.tauxAnnuel).replace(".", ",") : "")} invalide={!!e.tauxAnnuel} />
        </Field>
        <Field label="Durée (mois)" name="dureeMois" error={e.dureeMois}>
          <Input name="dureeMois" inputMode="numeric" defaultValue={valeurInitiale(state, "dureeMois", initial.dureeMois)} invalide={!!e.dureeMois} />
        </Field>
        <Field label="Date de première échéance" name="dateDebut" error={e.dateDebut}>
          <Input name="dateDebut" type="date" defaultValue={valeurInitiale(state, "dateDebut", toISODate(initial.dateDebut))} invalide={!!e.dateDebut} />
        </Field>
        <Field label="Assurance emprunteur mensuelle (€)" name="assuranceMensuelle" error={e.assuranceMensuelle}>
          <Input name="assuranceMensuelle" inputMode="decimal" defaultValue={valeurInitiale(state, "assuranceMensuelle", montantPourSaisie(initial.assuranceMensuelle))} invalide={!!e.assuranceMensuelle} />
        </Field>
        <Field label="Notes" name="notes" error={e.notes} className="sm:col-span-2">
          <Textarea name="notes" rows={2} defaultValue={valeurInitiale(state, "notes", initial.notes)} />
        </Field>
      </div>
      <FormActions>
        <SubmitButton>Enregistrer</SubmitButton>
        <ButtonLink href={annulerHref} variante="ghost">Annuler</ButtonLink>
      </FormActions>
    </form>
  );
}
