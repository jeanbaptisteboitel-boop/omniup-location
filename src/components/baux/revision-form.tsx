"use client";

import { useActionState, useState } from "react";
import type { FormState } from "@/lib/forms";
import { calculerLoyerRevise, trimestresIRL, variationIRL } from "@/lib/irl";
import { formatEuros, parseMontant } from "@/lib/montants";
import { Field, FormActions, FormMessage, Input, Select, SubmitButton, valeurInitiale } from "@/components/form";
import { Alerte, ButtonLink } from "@/components/ui";

export function RevisionForm({
  action,
  loyerActuel,
  irlTrimestre,
  irlValeur,
  dateEffetProposee,
  annulerHref,
}: {
  action: (prev: FormState, fd: FormData) => Promise<FormState>;
  loyerActuel: number;
  irlTrimestre: string | null;
  irlValeur: number | null;
  dateEffetProposee: string;
  annulerHref: string;
}) {
  const [state, formAction] = useActionState(action, null);
  const e = state?.errors ?? {};
  const [ancien, setAncien] = useState(valeurInitiale(state, "irlAncienValeur", irlValeur !== null ? String(irlValeur).replace(".", ",") : ""));
  const [nouveau, setNouveau] = useState(valeurInitiale(state, "irlNouveauValeur", ""));
  const trimestres = trimestresIRL(new Date().getFullYear()).map((t) => ({ value: t, label: t }));

  const a = parseMontant(ancien);
  const n = parseMontant(nouveau);
  const calcul = a && n && a > 0 && n > 0 ? { loyer: calculerLoyerRevise(loyerActuel, a, n), variation: variationIRL(a, n) } : null;

  return (
    <form action={formAction} className="space-y-6">
      <FormMessage state={state} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Date d'effet de la révision" name="dateEffet" requis error={e.dateEffet} hint="En principe la date anniversaire du bail">
          <Input name="dateEffet" type="date" defaultValue={valeurInitiale(state, "dateEffet", dateEffetProposee)} invalide={!!e.dateEffet} />
        </Field>
        <div className="hidden sm:block" />
        <Field label="Trimestre de l'IRL de référence (ancien)" name="irlAncienTrimestre" error={e.irlAncienTrimestre}>
          <Select name="irlAncienTrimestre" vide="—" options={trimestres} defaultValue={valeurInitiale(state, "irlAncienTrimestre", irlTrimestre)} />
        </Field>
        <Field label="Valeur de l'IRL de référence (ancien)" name="irlAncienValeur" requis error={e.irlAncienValeur}>
          <Input name="irlAncienValeur" inputMode="decimal" value={ancien} onChange={(ev) => setAncien(ev.target.value)} invalide={!!e.irlAncienValeur} />
        </Field>
        <Field label="Trimestre du nouvel IRL" name="irlNouveauTrimestre" error={e.irlNouveauTrimestre} hint="Même trimestre, un an plus tard">
          <Select name="irlNouveauTrimestre" vide="—" options={trimestres} defaultValue={valeurInitiale(state, "irlNouveauTrimestre", "")} />
        </Field>
        <Field label="Valeur du nouvel IRL" name="irlNouveauValeur" requis error={e.irlNouveauValeur} hint="Dernier indice publié par l'INSEE (insee.fr, « indice de référence des loyers »)">
          <Input name="irlNouveauValeur" inputMode="decimal" value={nouveau} onChange={(ev) => setNouveau(ev.target.value)} invalide={!!e.irlNouveauValeur} />
        </Field>
      </div>
      <Alerte ton={calcul ? "vert" : "bleu"} titre="Calcul">
        <p>Loyer actuel hors charges : <strong>{formatEuros(loyerActuel)}</strong></p>
        {calcul ? (
          <p>
            Nouveau loyer : <strong>{formatEuros(calcul.loyer)}</strong> (variation de l'indice : {calcul.variation > 0 ? "+" : ""}{String(calcul.variation).replace(".", ",")} %) — formule : {formatEuros(loyerActuel)} × {nouveau} / {ancien}
          </p>
        ) : (
          <p>Saisissez les deux indices pour voir le nouveau loyer.</p>
        )}
      </Alerte>
      <FormActions>
        <SubmitButton>Appliquer la révision</SubmitButton>
        <ButtonLink href={annulerHref} variante="ghost">Annuler</ButtonLink>
      </FormActions>
    </form>
  );
}
