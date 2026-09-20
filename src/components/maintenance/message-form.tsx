"use client";

import { startTransition, useActionState, useEffect, useRef, useState } from "react";
import type { FormState } from "@/lib/forms";
import { TYPES_ACCEPTES } from "@/lib/storage-constantes";
import { televerser, type Preparateur } from "@/lib/envoi-direct";
import { Field, FormMessage, SubmitButton, Textarea } from "@/components/form";
import { ZoneFichier } from "@/components/zone-fichier";
import { Alerte, Button, Spinner } from "@/components/ui";

/**
 * Ajout d'un message au fil d'une demande (locataire ou gestionnaire), avec une pièce jointe facultative
 * envoyée directement au stockage objet quand il est configuré.
 */
export function MessageForm({
  action,
  preparer,
  libelle,
  placeholder,
  aideFichier = "Photo ou PDF · 20 Mo maximum",
}: {
  action: (prev: FormState, fd: FormData) => Promise<FormState>;
  preparer: Preparateur;
  libelle: string;
  placeholder: string;
  aideFichier?: string;
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
    const fd = new FormData(ev.currentTarget);
    const f = fd.get("fichier");
    if (!(f instanceof File) || f.size === 0) return; // pas de pièce jointe : soumission normale
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
      setErreurEnvoi(err instanceof Error ? err.message : "Échec de l'envoi du fichier.");
    } finally {
      setEnvoi(null);
    }
  }

  return (
    <form ref={ref} action={formAction} onSubmit={soumettre} className="flex flex-col gap-3.5">
      <FormMessage state={state} />
      {erreurEnvoi && <Alerte ton="rouge">{erreurEnvoi}</Alerte>}
      <Field label={libelle} name="texte" error={e.texte} requis>
        <Textarea name="texte" rows={3} placeholder={placeholder} invalide={!!e.texte} />
      </Field>
      <ZoneFichier key={generation} name="fichier" accept={TYPES_ACCEPTES} libelle="Joindre une photo ou un document (facultatif)" aide={aideFichier} />
      {e.fichier && <p className="text-xs text-red-600">{e.fichier}</p>}
      {envoi && (
        <div className="flex items-center gap-2.5 text-[13px] text-slate-600" role="status">
          <Spinner className="border-navy-800/30 border-t-navy-800" />
          <span>{envoi}</span>
        </div>
      )}
      <div>
        {envoi ? (
          <Button type="button" disabled>Envoi en cours…</Button>
        ) : (
          <SubmitButton enCours="Envoi…" disabled={pending}>Envoyer</SubmitButton>
        )}
      </div>
    </form>
  );
}
