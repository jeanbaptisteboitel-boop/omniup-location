"use client";

import { useActionState } from "react";
import type { Depense } from "@prisma/client";
import type { FormState } from "@/lib/forms";
import { CATEGORIES_DEPENSE, options } from "@/lib/libelles";
import { toISODate } from "@/lib/dates";
import { montantPourSaisie } from "@/lib/montants";
import { affectationVers, type OptionsAffectation } from "@/lib/affectation";
import { TYPES_ACCEPTES } from "@/lib/storage-constantes";
import { Checkbox, Field, FormActions, FormMessage, Input, Select, SubmitButton, Textarea, valeurInitiale } from "@/components/form";
import { ButtonLink } from "@/components/ui";

export function DepenseForm({
  action,
  initial,
  affectations,
  affectationInitiale,
  annulerHref,
  retour,
}: {
  action: (prev: FormState, fd: FormData) => Promise<FormState>;
  initial: Partial<Depense>;
  affectations: OptionsAffectation;
  affectationInitiale?: string;
  annulerHref: string;
  retour?: string;
}) {
  const [state, formAction] = useActionState(action, null);
  const e = state?.errors ?? {};
  const affectationDefaut = affectationInitiale ?? (initial.lotId || initial.immeubleId ? affectationVers({ lotId: initial.lotId ?? null, immeubleId: initial.immeubleId ?? null }) : "");
  return (
    <form action={formAction} className="space-y-6">
      <FormMessage state={state} />
      {retour && <input type="hidden" name="retour" value={retour} />}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Date" name="date" requis error={e.date}>
          <Input name="date" type="date" defaultValue={valeurInitiale(state, "date", toISODate(initial.date))} invalide={!!e.date} />
        </Field>
        <Field label="Montant TTC (€)" name="montant" requis error={e.montant}>
          <Input name="montant" inputMode="decimal" defaultValue={valeurInitiale(state, "montant", montantPourSaisie(initial.montant))} invalide={!!e.montant} />
        </Field>
        <Field label="Libellé" name="libelle" requis error={e.libelle} className="sm:col-span-2" hint="Ex. : Remplacement chaudière, Taxe foncière 2026, Appel de fonds T3">
          <Input name="libelle" defaultValue={valeurInitiale(state, "libelle", initial.libelle)} invalide={!!e.libelle} />
        </Field>
        <Field label="Catégorie" name="categorie" requis error={e.categorie} hint="Reprend les rubriques de la déclaration des revenus fonciers (2044)">
          <Select name="categorie" options={options(CATEGORIES_DEPENSE)} defaultValue={valeurInitiale(state, "categorie", initial.categorie ?? "REPARATION_ENTRETIEN")} />
        </Field>
        <Field label="Bien concerné" name="affectation" requis error={e.affectation} hint="Un lot, ou un immeuble pour une dépense commune à plusieurs lots">
          <select id="affectation" name="affectation" defaultValue={valeurInitiale(state, "affectation", affectationDefaut)} className={`block w-full rounded-md border bg-white px-3 py-2 text-sm shadow-sm focus:border-brand-cyan focus:outline-none focus:ring-2 focus:ring-brand-cyan/40 ${e.affectation ? "border-red-400" : "border-slate-300"}`}>
            <option value="">— Choisir —</option>
            {affectations.lots.length > 0 && (
              <optgroup label="Lots">
                {affectations.lots.map((l) => (
                  <option key={l.id} value={`lot:${l.id}`}>{l.nom} — {l.ville}</option>
                ))}
              </optgroup>
            )}
            {affectations.immeubles.length > 0 && (
              <optgroup label="Immeubles (dépenses communes)">
                {affectations.immeubles.map((i) => (
                  <option key={i.id} value={`immeuble:${i.id}`}>{i.nom} — {i.ville}</option>
                ))}
              </optgroup>
            )}
          </select>
        </Field>
        <Field label="Fournisseur" name="fournisseur" error={e.fournisseur}>
          <Input name="fournisseur" defaultValue={valeurInitiale(state, "fournisseur", initial.fournisseur)} placeholder="Artisan, syndic, assureur, Trésor public…" />
        </Field>
        <Field label="Justificatif" name="justificatif" error={e.justificatif} hint="Facture, avis d'imposition, appel de fonds… (PDF ou image, 20 Mo max.)">
          <Input name="justificatif" type="file" accept={TYPES_ACCEPTES} invalide={!!e.justificatif} className="file:mr-3 file:rounded file:border-0 file:bg-navy-50 file:px-3 file:py-1 file:text-navy-800" />
        </Field>
        {initial.justificatifChemin && initial.id && (
          <div className="sm:col-span-2 flex flex-wrap items-center gap-4 text-sm">
            <a href={`/api/depenses/${initial.id}/justificatif`} target="_blank" rel="noopener" className="text-navy-800 underline">Justificatif actuel : {initial.justificatifNom}</a>
            <Checkbox name="supprimerJustificatif" label="Supprimer le justificatif actuel" />
          </div>
        )}
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
