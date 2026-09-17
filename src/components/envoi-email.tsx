"use client";

import { useActionState, useEffect, useState } from "react";
import type { FormState } from "@/lib/forms";
import { Field, FormMessage, Input, SubmitButton, Textarea } from "@/components/form";
import { Alerte } from "@/components/ui";

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
    return <Alerte ton="orange">L'envoi d'emails n'est pas configuré. Renseignez les paramètres SMTP dans le fichier .env (voir Paramètres) ; en attendant, téléchargez le PDF et envoyez-le par vos propres moyens.</Alerte>;
  }
  if (!destinataire) {
    return <Alerte ton="orange">Le locataire n'a pas d'adresse email : ajoutez-la dans sa fiche pour lui envoyer {pieceJointe}.</Alerte>;
  }

  return (
    <details open={ouvert} className="rounded-lg border border-slate-200">
      <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-navy-900">{libelleBouton} à {destinataire}</summary>
      <div className="space-y-4 border-t border-slate-100 px-4 py-4">
        <FormMessage state={etat} />
        {actionIA && (
          <form action={generer} className="space-y-2 rounded-md bg-navy-50/60 p-3">
            <FormMessage state={etatIA} />
            <input type="hidden" name="objet" value={objet} />
            <input type="hidden" name="contexte" value={contexteIA ?? ""} />
            <Field label="Assistant IA — consigne pour reformuler le message (facultatif)" name="instructions" hint={iaConfiguree ? "Ex. : ton plus chaleureux, rappeler le changement d'IBAN, message en 3 lignes" : "Assistant IA non configuré (ANTHROPIC_API_KEY)"}>
              <Input name="instructions" disabled={!iaConfiguree} />
            </Field>
            <SubmitButton variante="secondary" taille="sm" enCours="Rédaction…" disabled={!iaConfiguree}>Rédiger avec l'IA</SubmitButton>
          </form>
        )}
        <form action={envoyer} className="space-y-3">
          <Field label="Objet" name="objet" requis>
            <Input name="objet" value={objet} onChange={(ev) => setObjet(ev.target.value)} required />
          </Field>
          <Field label="Message" name="corps" requis hint={`Pièce jointe : ${pieceJointe} (PDF)`}>
            <Textarea name="corps" rows={9} value={corps} onChange={(ev) => setCorps(ev.target.value)} required />
          </Field>
          <SubmitButton variante="accent" enCours="Envoi en cours…">{libelleBouton}</SubmitButton>
        </form>
      </div>
    </details>
  );
}
