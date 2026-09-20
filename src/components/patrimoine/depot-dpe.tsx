"use client";

import { startTransition, useActionState, useRef, useState } from "react";
import type { FormState } from "@/lib/forms";
import { TYPES_ACCEPTES } from "@/lib/storage-constantes";
import { televerser, type Preparateur } from "@/lib/envoi-direct";
import { FormMessage } from "@/components/form";
import { ZoneFichier } from "@/components/zone-fichier";
import { Alerte, Button, Spinner } from "@/components/ui";

/** Dépôt du fichier du DPE ; envoi direct vers le stockage objet quand il est configuré. */
export function DepotDpe({ action, preparer }: { action: (prev: FormState, fd: FormData) => Promise<FormState>; preparer: Preparateur }) {
  const [state, formAction, pending] = useActionState(action, null);
  const [envoi, setEnvoi] = useState<string | null>(null);
  const [erreurEnvoi, setErreurEnvoi] = useState<string | null>(null);
  const ref = useRef<HTMLFormElement>(null);
  const e = state?.errors ?? {};

  async function soumettre(ev: React.FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    setErreurEnvoi(null);
    const fd = new FormData(ev.currentTarget);
    const f = fd.get("fichier");
    if (!(f instanceof File) || f.size === 0) {
      setErreurEnvoi("Choisissez le fichier du diagnostic.");
      return;
    }
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

  const occupe = pending || !!envoi;
  return (
    <form ref={ref} onSubmit={soumettre} className="flex flex-col gap-3">
      <FormMessage state={state} />
      {erreurEnvoi && <Alerte ton="rouge">{erreurEnvoi}</Alerte>}
      <ZoneFichier name="fichier" accept={TYPES_ACCEPTES} libelle="Glissez-déposez le DPE ou cliquez pour le choisir" aide="PDF ou photo · 20 Mo maximum" />
      {e.fichier && <p className="text-xs text-red-600">{e.fichier}</p>}
      {envoi && (
        <div className="flex items-center gap-2.5 text-[13px] text-slate-600" role="status">
          <Spinner className="border-navy-800/30 border-t-navy-800" />
          <span>{envoi}</span>
        </div>
      )}
      <div>
        <Button type="submit" variante="secondary" taille="sm" disabled={occupe}>{envoi ? "Envoi en cours…" : pending ? "Enregistrement…" : "Joindre le diagnostic"}</Button>
      </div>
    </form>
  );
}
