"use client";

import { startTransition, useActionState, useEffect, useRef, useState } from "react";
import type { FormState } from "@/lib/forms";
import { TYPES_ACCEPTES } from "@/lib/storage-constantes";
import { televerser, type Preparateur } from "@/lib/envoi-direct";
import { Field, FormMessage, Input, valeurInitiale } from "@/components/form";
import { ZoneFichier } from "@/components/zone-fichier";
import { Alerte, Button, Spinner } from "@/components/ui";

/**
 * Attestation d'assurance habitation : compagnie, numéro de police, période de couverture et justificatif.
 * Le fichier est obligatoire lorsque le locataire dépose l'attestation depuis son espace.
 */
export function AttestationForm({
  action,
  preparer,
  fichierObligatoire = false,
  libelleEnvoi = "Enregistrer l'attestation",
}: {
  action: (prev: FormState, fd: FormData) => Promise<FormState>;
  preparer: Preparateur;
  fichierObligatoire?: boolean;
  libelleEnvoi?: string;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  const [envoi, setEnvoi] = useState<string | null>(null);
  const [erreurEnvoi, setErreurEnvoi] = useState<string | null>(null);
  const [generation, setGeneration] = useState(0);
  const ref = useRef<HTMLFormElement>(null);
  const e = state?.errors ?? {};

  useEffect(() => {
    if (state?.ok) {
      ref.current?.reset();
      setGeneration((g) => g + 1);
    }
  }, [state]);

  async function soumettre(ev: React.FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    setErreurEnvoi(null);
    const fd = new FormData(ev.currentTarget);
    const f = fd.get("fichier");
    const avecFichier = f instanceof File && f.size > 0;
    if (fichierObligatoire && !avecFichier) {
      setErreurEnvoi("Sélectionnez le fichier de votre attestation (PDF ou photo).");
      return;
    }
    try {
      if (avecFichier) {
        setEnvoi(`Envoi de ${(f as File).name}…`);
        const r = await televerser(f as File, preparer);
        if (r.mode === "direct") {
          fd.delete("fichier");
          fd.set("fichiers", JSON.stringify([r.fichier]));
        }
      }
      startTransition(() => formAction(fd));
    } catch (err) {
      setErreurEnvoi(err instanceof Error ? err.message : "Échec de l'envoi du fichier.");
    } finally {
      setEnvoi(null);
    }
  }

  const occupe = pending || !!envoi;
  return (
    <form ref={ref} onSubmit={soumettre} className="flex flex-col gap-3.5">
      <FormMessage state={state} />
      {erreurEnvoi && <Alerte ton="rouge">{erreurEnvoi}</Alerte>}
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
        <Field label="Compagnie d'assurance" name="compagnie" error={e.compagnie}>
          <Input name="compagnie" defaultValue={valeurInitiale(state, "compagnie", "")} placeholder="ex. MAIF, AXA, Macif…" />
        </Field>
        <Field label="Numéro de contrat" name="numeroPolice" error={e.numeroPolice}>
          <Input name="numeroPolice" defaultValue={valeurInitiale(state, "numeroPolice", "")} placeholder="ex. 1234567890" />
        </Field>
        <Field label="Début de la garantie" name="dateDebut" error={e.dateDebut}>
          <Input name="dateDebut" type="date" defaultValue={valeurInitiale(state, "dateDebut", "")} invalide={!!e.dateDebut} />
        </Field>
        <Field label="Échéance de la garantie" name="dateEcheance" requis error={e.dateEcheance} hint="Date jusqu'à laquelle le logement est assuré.">
          <Input name="dateEcheance" type="date" defaultValue={valeurInitiale(state, "dateEcheance", "")} invalide={!!e.dateEcheance} required />
        </Field>
      </div>
      <ZoneFichier key={generation} name="fichier" accept={TYPES_ACCEPTES} libelle={`Glissez-déposez l'attestation ou cliquez pour parcourir${fichierObligatoire ? "" : " (facultatif)"}`} aide="PDF ou photo · 20 Mo maximum" />
      {e.fichier && <p className="text-xs text-red-600">{e.fichier}</p>}
      {envoi && (
        <div className="flex items-center gap-2.5 text-[13px] text-slate-600" role="status">
          <Spinner className="border-navy-800/30 border-t-navy-800" />
          <span>{envoi}</span>
        </div>
      )}
      <div>
        <Button type="submit" disabled={occupe}>{envoi ? "Envoi en cours…" : pending ? "Enregistrement…" : libelleEnvoi}</Button>
      </div>
    </form>
  );
}
