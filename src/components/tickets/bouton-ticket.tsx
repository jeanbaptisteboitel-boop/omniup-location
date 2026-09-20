"use client";

import { startTransition, useActionState, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import type { TypeTicket } from "@prisma/client";
import type { FormState } from "@/lib/forms";
import { AIDES_TYPE_TICKET, TYPES_TICKET } from "@/lib/tickets";
import { TYPES_ACCEPTES } from "@/lib/storage-constantes";
import { televerser, type Preparateur } from "@/lib/envoi-direct";
import { Field, FormMessage, Input, RadioCarte, Textarea, valeurInitiale } from "@/components/form";
import { ZoneFichier } from "@/components/zone-fichier";
import { Alerte, Button, Spinner } from "@/components/ui";
import { Dialogue } from "@/components/dialogue";
import { IconeAide } from "@/components/tickets/icone";

const ORDRE: TypeTicket[] = ["AIDE", "BUG", "FONCTIONNALITE"];

/**
 * Bouton d'assistance présent sur toutes les pages : ouvre un ticket (aide, problème, proposition).
 * La page d'où le ticket est ouvert est jointe automatiquement pour faciliter le diagnostic.
 */
export function BoutonTicket({ action, preparer }: { action: (prev: FormState, fd: FormData) => Promise<FormState>; preparer: Preparateur }) {
  const [ouvert, setOuvert] = useState(false);
  const [type, setType] = useState<TypeTicket>("AIDE");
  const [state, formAction, pending] = useActionState(action, null);
  const [envoi, setEnvoi] = useState<string | null>(null);
  const [erreurEnvoi, setErreurEnvoi] = useState<string | null>(null);
  const [generation, setGeneration] = useState(0);
  const ref = useRef<HTMLFormElement>(null);
  const pathname = usePathname();
  const e = state?.errors ?? {};

  useEffect(() => {
    if (state?.ok) {
      ref.current?.reset();
      setGeneration((g) => g + 1);
    }
  }, [state]);

  function fermer() {
    setOuvert(false);
    setErreurEnvoi(null);
  }

  async function soumettre(ev: React.FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    setErreurEnvoi(null);
    const fd = new FormData(ev.currentTarget);
    const f = fd.get("fichier");
    try {
      if (f instanceof File && f.size > 0) {
        setEnvoi(`Envoi de ${f.name}…`);
        const r = await televerser(f, preparer);
        if (r.mode === "direct") {
          fd.delete("fichier");
          fd.set("fichiers", JSON.stringify([r.fichier]));
        }
      }
      startTransition(() => formAction(fd));
    } catch (err) {
      setErreurEnvoi(err instanceof Error ? err.message : "Échec de l'envoi de la pièce jointe.");
    } finally {
      setEnvoi(null);
    }
  }

  const occupe = pending || !!envoi;
  return (
    <>
      <button
        type="button"
        onClick={() => setOuvert(true)}
        aria-label="Assistance : demander de l'aide, signaler un problème ou proposer une amélioration"
        className="fixed bottom-4 right-4 z-40 flex h-12 items-center gap-2 rounded-full bg-navy-900 pl-3.5 pr-4 text-sm font-semibold text-white shadow-tiroir transition-colors hover:bg-navy-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-cyan"
      >
        <IconeAide taille={20} />
        <span className="max-sm:sr-only">Aide</span>
      </button>

      {ouvert && (
        <Dialogue titre="Assistance" onFermer={fermer} largeur="max-w-[560px]">
          <form ref={ref} onSubmit={soumettre} className="flex flex-col gap-3.5 text-left">
            <FormMessage state={state} />
            {erreurEnvoi && <Alerte ton="rouge">{erreurEnvoi}</Alerte>}
            <fieldset>
              <legend className="mb-1.5 block text-sm font-semibold text-navy-900">Votre demande</legend>
              <div role="radiogroup" className="grid grid-cols-1 gap-2">
                {ORDRE.map((t) => (
                  <RadioCarte key={t} name="typeChoix" value={t} checked={type === t} onChange={() => setType(t)} label={TYPES_TICKET[t]} aide={AIDES_TYPE_TICKET[t]} />
                ))}
              </div>
              <input type="hidden" name="type" value={type} />
            </fieldset>
            <Field label="Objet" name="objet" requis error={e.objet}>
              <Input name="objet" defaultValue={valeurInitiale(state, "objet", "")} invalide={!!e.objet} placeholder={type === "BUG" ? "ex. La quittance ne se télécharge pas" : type === "FONCTIONNALITE" ? "ex. Exporter les loyers en Excel" : "ex. Comment réviser un loyer ?"} maxLength={200} />
            </Field>
            <Field
              label="Description"
              name="description"
              requis
              error={e.description}
              hint={type === "BUG" ? "Décrivez ce que vous faisiez, ce que vous attendiez et ce qui s'est passé." : "Décrivez votre besoin le plus précisément possible."}
            >
              <Textarea name="description" rows={5} defaultValue={valeurInitiale(state, "description", "")} invalide={!!e.description} />
            </Field>
            <ZoneFichier key={generation} name="fichier" accept={TYPES_ACCEPTES} libelle="Joindre une capture d'écran (facultatif)" aide="PDF ou image · 20 Mo maximum" />
            {e.fichier && <p className="text-xs text-red-600">{e.fichier}</p>}
            <input type="hidden" name="page" value={pathname ?? ""} />
            <p className="text-xs text-slate-500">La page d'où vous écrivez ({pathname}) et votre navigateur sont joints automatiquement.</p>
            {envoi && (
              <div className="flex items-center gap-2.5 text-[13px] text-slate-600" role="status">
                <Spinner className="border-navy-800/30 border-t-navy-800" />
                <span>{envoi}</span>
              </div>
            )}
            {/* Barre d'action toujours atteignable, même quand le formulaire défile sur un petit écran. */}
            <div className="sticky bottom-0 -mx-6 -mb-6 mt-1 flex flex-wrap justify-end gap-2 border-t border-slate-100 bg-white px-6 py-3">
              <Button type="button" variante="secondary" onClick={fermer}>{state?.ok ? "Fermer" : "Annuler"}</Button>
              <Button type="submit" disabled={occupe}>{envoi ? "Envoi en cours…" : pending ? "Envoi…" : "Envoyer"}</Button>
            </div>
          </form>
        </Dialogue>
      )}
    </>
  );
}
