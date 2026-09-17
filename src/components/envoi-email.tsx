"use client";

import { useActionState, useEffect, useState } from "react";
import type { FormState } from "@/lib/forms";
import { Field, FormMessage, Input, SubmitButton, Textarea } from "@/components/form";
import { Alerte } from "@/components/ui";
import { IconeEnvoyer, IconeEtincelle } from "@/components/icones";

/** Bloc d'envoi d'un email au locataire (avec pièce jointe PDF générée côté serveur). */
export function EnvoiEmail({
  action,
  actionIA,
  destinataire,
  objetDefaut,
  corpsDefaut,
  contexteIA,
  libelleBouton,
  pieceJointe,
  mailConfigure,
  iaConfiguree,
  ouvert = false,
}: {
  action: (prev: FormState, fd: FormData) => Promise<FormState>;
  actionIA?: (prev: FormState, fd: FormData) => Promise<FormState>;
  destinataire: string | null;
  objetDefaut: string;
  corpsDefaut: string;
  contexteIA?: string;
  libelleBouton: string;
  pieceJointe: string;
  mailConfigure: boolean;
  iaConfiguree: boolean;
  ouvert?: boolean;
}) {
  const [etat, envoyer] = useActionState(action, null);
  const [etatIA, generer] = useActionState(actionIA ?? (async () => null), null);
  const [objet, setObjet] = useState(objetDefaut);
  const [corps, setCorps] = useState(corpsDefaut);

  useEffect(() => {
    if (etatIA?.ok && etatIA.values) {
      if (etatIA.values.objet) setObjet(etatIA.values.objet);
      if (etatIA.values.corps) setCorps(etatIA.values.corps);
    }
  }, [etatIA]);

  if (!mailConfigure) {
    return <Alerte ton="orange">L'envoi d'emails n'est pas configuré. Renseignez RESEND_API_KEY et MAIL_FROM (ou un serveur SMTP) dans le fichier .env (voir Paramètres) ; en attendant, téléchargez le PDF et envoyez-le par vos propres moyens.</Alerte>;
  }
  if (!destinataire) {
    return <Alerte ton="orange">Le locataire n'a pas d'adresse email : ajoutez-la dans sa fiche pour lui envoyer {pieceJointe}.</Alerte>;
  }

  return (
    <details open={ouvert} className="group rounded-xl border border-slate-200 bg-white shadow-card">
      <summary className="flex cursor-pointer items-center gap-3 px-5 py-4 text-sm font-bold text-navy-900">
        <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-cyan-100 text-cyan-900"><IconeEnvoyer taille={16} /></span>
        <span className="flex-1">{libelleBouton} à {destinataire}</span>
        <span className="text-xs font-medium text-slate-500 group-open:hidden">Ouvrir</span>
      </summary>
      <div className="flex flex-col gap-4 border-t border-slate-100 px-5 py-4">
        <FormMessage state={etat} />
        {actionIA && (
          <form action={generer} className="flex flex-col gap-2.5 rounded-lg border border-violet-200 bg-violet-50/40 p-3.5">
            <FormMessage state={etatIA} />
            <input type="hidden" name="objet" value={objet} />
            <input type="hidden" name="contexte" value={contexteIA ?? ""} />
            <div className="flex items-center gap-2.5">
              <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-800"><IconeEtincelle taille={15} /></span>
              <p className="text-sm font-bold text-navy-900">Adapter le message avec l'IA</p>
            </div>
            <Field label="Consigne (facultatif)" name="instructions" hint={iaConfiguree ? "Ex. : ton plus chaleureux, rappeler le changement d'IBAN, message en 3 lignes" : "Assistant IA non configuré (ANTHROPIC_API_KEY)"}>
              <Input name="instructions" disabled={!iaConfiguree} placeholder="ex. Ton plus ferme, rappeler la date d'échéance" />
            </Field>
            <div><SubmitButton variante="secondary" taille="sm" enCours="Rédaction…" disabled={!iaConfiguree}>Rédiger avec l'IA</SubmitButton></div>
          </form>
        )}
        <form action={envoyer} className="flex flex-col gap-3.5">
          <Field label="Objet" name="objet" requis>
            <Input name="objet" value={objet} onChange={(ev) => setObjet(ev.target.value)} required />
          </Field>
          <Field label="Message" name="corps" requis hint={`Pièce jointe : ${pieceJointe} (PDF)`}>
            <Textarea name="corps" rows={9} value={corps} onChange={(ev) => setCorps(ev.target.value)} required />
          </Field>
          <div><SubmitButton variante="accent" enCours="Envoi en cours…"><IconeEnvoyer taille={16} />{libelleBouton}</SubmitButton></div>
        </form>
      </div>
    </details>
  );
}
