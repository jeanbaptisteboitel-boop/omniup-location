"use client";

import { startTransition, useActionState, useState } from "react";
import type { Depense } from "@prisma/client";
import type { FormState } from "@/lib/forms";
import { CATEGORIES_DEPENSE, options } from "@/lib/libelles";
import { toISODate } from "@/lib/dates";
import { montantPourSaisie } from "@/lib/montants";
import { affectationVers, type OptionsAffectation } from "@/lib/affectation";
import { TYPES_ACCEPTES } from "@/lib/storage-constantes";
import { televerser, type Preparateur } from "@/lib/envoi-direct";
import { Checkbox, Field, FormActions, FormMessage, Input, Select, SubmitButton, Textarea, valeurInitiale } from "@/components/form";
import { Alerte, ButtonLink } from "@/components/ui";

export function DepenseForm({
  action,
  preparer,
  initial,
  affectations,
  affectationInitiale,
  annulerHref,
  retour,
}: {
  action: (prev: FormState, fd: FormData) => Promise<FormState>;
  preparer: Preparateur;
  initial: Partial<Depense>;
  affectations: OptionsAffectation;
  affectationInitiale?: string;
  annulerHref: string;
  retour?: string;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  const [envoi, setEnvoi] = useState<string | null>(null);
  const [erreurEnvoi, setErreurEnvoi] = useState<string | null>(null);
  const e = state?.errors ?? {};

  /** Si un justificatif est joint et que le stockage objet est configuré, il est envoyé directement au stockage avant l'enregistrement. */
  async function soumettre(ev: React.FormEvent<HTMLFormElement>) {
    const fd = new FormData(ev.currentTarget);
    const f = fd.get("justificatif");
    if (!(f instanceof File) || f.size === 0) return; // soumission normale
    ev.preventDefault();
    setErreurEnvoi(null);
    try {
      setEnvoi("Envoi du justificatif…");
      const r = await televerser(f, preparer);
      if (r.mode === "direct") {
        fd.delete("justificatif");
        fd.set("justificatifChemin", r.fichier.chemin);
        fd.set("justificatifNom", r.fichier.nomFichier);
        fd.set("justificatifMime", r.fichier.mimeType);
      }
      startTransition(() => formAction(fd));
    } catch (err) {
      setErreurEnvoi(err instanceof Error ? err.message : "Échec de l'envoi du justificatif.");
    } finally {
      setEnvoi(null);
    }
  }

  const affectationDefaut = affectationInitiale ?? (initial.lotId || initial.immeubleId ? affectationVers({ lotId: initial.lotId ?? null, immeubleId: initial.immeubleId ?? null }) : "");
  return (
    <form action={formAction} onSubmit={soumettre} className="space-y-6">
      <FormMessage state={state} />
      {erreurEnvoi && <Alerte ton="rouge">{erreurEnvoi}</Alerte>}
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
        <SubmitButton disabled={pending || !!envoi}>{envoi ?? "Enregistrer"}</SubmitButton>
        <ButtonLink href={annulerHref} variante="ghost">Annuler</ButtonLink>
      </FormActions>
    </form>
  );
}
