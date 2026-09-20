"use client";

import { startTransition, useActionState, useState } from "react";
import type { FormState } from "@/lib/forms";
import { CATEGORIES_MAINTENANCE, URGENCES_MAINTENANCE, options } from "@/lib/libelles";
import { TYPES_ACCEPTES } from "@/lib/storage-constantes";
import { televerser, type Preparateur } from "@/lib/envoi-direct";
import { Field, FormActions, FormMessage, Input, RadioCarte, Select, SubmitButton, Textarea, valeurInitiale } from "@/components/form";
import { ZoneFichier } from "@/components/zone-fichier";
import { Alerte, ButtonLink, Spinner } from "@/components/ui";

const AIDES_URGENCE: Record<string, string> = {
  NORMALE: "Gêne du quotidien, sans risque immédiat.",
  URGENTE: "Le logement reste habitable mais le problème s'aggrave.",
  TRES_URGENTE: "Fuite importante, panne de chauffage en hiver, porte qui ne ferme plus…",
};

export function DemandeForm({
  action,
  preparer,
  baux,
  annulerHref,
}: {
  action: (prev: FormState, fd: FormData) => Promise<FormState>;
  preparer: Preparateur;
  /** Baux en cours du locataire : le choix n'est proposé que s'il y en a plusieurs. */
  baux: { id: number; libelle: string }[];
  annulerHref: string;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  const [envoi, setEnvoi] = useState<string | null>(null);
  const [erreurEnvoi, setErreurEnvoi] = useState<string | null>(null);
  const e = state?.errors ?? {};

  async function soumettre(ev: React.FormEvent<HTMLFormElement>) {
    const fd = new FormData(ev.currentTarget);
    const f = fd.get("fichier");
    if (!(f instanceof File) || f.size === 0) return; // pas de photo : soumission normale
    ev.preventDefault();
    setErreurEnvoi(null);
    try {
      setEnvoi(`Envoi de ${f.name}…`);
      const r = await televerser(f, preparer);
      if (r.mode === "direct") {
        fd.delete("fichier");
        fd.set("fichiers", JSON.stringify([r.fichier]));
      }
      startTransition(() => formAction(fd));
    } catch (err) {
      setErreurEnvoi(err instanceof Error ? err.message : "Échec de l'envoi de la photo.");
    } finally {
      setEnvoi(null);
    }
  }

  const urgenceInitiale = valeurInitiale(state, "urgence", "NORMALE");
  return (
    <form action={formAction} onSubmit={soumettre} className="flex flex-col gap-[18px]">
      <FormMessage state={state} />
      {erreurEnvoi && <Alerte ton="rouge">{erreurEnvoi}</Alerte>}
      {baux.length > 1 ? (
        <Field label="Logement concerné" name="bailId" error={e.bailId} requis>
          <Select name="bailId" invalide={!!e.bailId} defaultValue={valeurInitiale(state, "bailId", baux[0].id)} options={baux.map((b) => ({ value: String(b.id), label: b.libelle }))} />
        </Field>
      ) : (
        <input type="hidden" name="bailId" value={baux[0].id} />
      )}
      <Field label="Objet" name="objet" error={e.objet} hint="En quelques mots : « Fuite sous l'évier de la cuisine »." requis>
        <Input name="objet" maxLength={200} defaultValue={valeurInitiale(state, "objet", "")} invalide={!!e.objet} />
      </Field>
      <Field label="Catégorie" name="categorie" error={e.categorie} requis>
        <Select name="categorie" invalide={!!e.categorie} defaultValue={valeurInitiale(state, "categorie", "AUTRE")} options={options(CATEGORIES_MAINTENANCE)} />
      </Field>
      <fieldset>
        <legend className="mb-1.5 block text-sm font-semibold text-navy-900">Urgence</legend>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {options(URGENCES_MAINTENANCE).map((o) => (
            <RadioCarte key={o.value} name="urgence" value={o.value} label={o.label} aide={AIDES_URGENCE[o.value]} defaultChecked={urgenceInitiale === o.value} />
          ))}
        </div>
      </fieldset>
      <Field label="Description" name="description" error={e.description} hint="Depuis quand, où exactement, ce que vous avez déjà essayé." requis>
        <Textarea name="description" rows={5} defaultValue={valeurInitiale(state, "description", "")} invalide={!!e.description} />
      </Field>
      <div>
        <p className="mb-1.5 block text-sm font-semibold text-navy-900">Photo (facultative)</p>
        <ZoneFichier name="fichier" accept={TYPES_ACCEPTES} libelle="Glissez-déposez une photo ou cliquez pour parcourir" aide="Photo ou PDF · 20 Mo maximum" />
        {e.fichier && <p className="mt-1.5 text-xs text-red-600">{e.fichier}</p>}
      </div>
      {envoi && (
        <div className="flex items-center gap-2.5 text-[13px] text-slate-600" role="status">
          <Spinner className="border-navy-800/30 border-t-navy-800" />
          <span>{envoi}</span>
        </div>
      )}
      <FormActions>
        {/* Le bouton reste verrouillé pendant l'envoi du fichier puis pendant l'action : pas de double dépôt. */}
        <SubmitButton enCours="Envoi…" disabled={!!envoi || pending}>{pending ? "Envoi…" : "Envoyer la demande"}</SubmitButton>
        <ButtonLink href={annulerHref} variante="ghost">Annuler</ButtonLink>
      </FormActions>
    </form>
  );
}
