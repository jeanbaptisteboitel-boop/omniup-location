"use client";

import { useActionState, useState } from "react";
import type { FormState } from "@/lib/forms";
import { calculerLoyerRevise, trimestresIRL, variationIRL } from "@/lib/irl";
import { formatEuros, formatNombre, parseMontant } from "@/lib/montants";
import { Field, FormMessage, Input, Select, SubmitButton, valeurInitiale } from "@/components/form";
import { ButtonLink } from "@/components/ui";

/** Révision annuelle du loyer sur l'IRL, présentée comme la boîte de dialogue de la maquette (en-tête, grille, encadré du résultat, pied). */
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
  const ecart = calcul ? Math.round((calcul.loyer - loyerActuel) * 100) / 100 : 0;

  return (
    <form action={formAction}>
      <div className="border-b border-slate-100 px-6 py-5">
        <h2 className="text-lg font-bold text-navy-900">Réviser le loyer</h2>
        <p className="mt-1 text-[13px] text-slate-500">Révision annuelle selon l'indice de référence des loyers (IRL) publié par l'INSEE.</p>
      </div>
      <div className="flex flex-col gap-3.5 px-6 py-5">
        <FormMessage state={state} />
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          <Field label="Date d'effet" name="dateEffet" requis error={e.dateEffet} hint="En principe la date anniversaire du bail.">
            <Input name="dateEffet" type="date" defaultValue={valeurInitiale(state, "dateEffet", dateEffetProposee)} invalide={!!e.dateEffet} />
          </Field>
          <Field label="Loyer actuel hors charges" name="loyerActuel">
            <Input name="loyerActuel" value={formatEuros(loyerActuel)} readOnly disabled className="tabular-nums" />
          </Field>
          <Field label="Trimestre de référence" name="irlAncienTrimestre" error={e.irlAncienTrimestre}>
            <Select name="irlAncienTrimestre" vide="—" options={trimestres} defaultValue={valeurInitiale(state, "irlAncienTrimestre", irlTrimestre)} invalide={!!e.irlAncienTrimestre} />
          </Field>
          <Field label="Indice de référence" name="irlAncienValeur" requis error={e.irlAncienValeur} hint="IRL en vigueur à la signature ou lors de la dernière révision.">
            <Input name="irlAncienValeur" inputMode="decimal" value={ancien} onChange={(ev) => setAncien(ev.target.value)} invalide={!!e.irlAncienValeur} placeholder="ex. : 145,17" />
          </Field>
          <Field label="Trimestre du nouvel indice" name="irlNouveauTrimestre" error={e.irlNouveauTrimestre} hint="Même trimestre, un an plus tard.">
            <Select name="irlNouveauTrimestre" vide="—" options={trimestres} defaultValue={valeurInitiale(state, "irlNouveauTrimestre", "")} invalide={!!e.irlNouveauTrimestre} />
          </Field>
          <Field label="Nouvel indice" name="irlNouveauValeur" requis error={e.irlNouveauValeur} hint="Dernier IRL publié par l'INSEE (insee.fr).">
            <Input name="irlNouveauValeur" inputMode="decimal" value={nouveau} onChange={(ev) => setNouveau(ev.target.value)} invalide={!!e.irlNouveauValeur} placeholder="ex. : 147,10" />
          </Field>
        </div>
        <div className="flex items-center justify-between gap-3 rounded-lg border border-navy-200 bg-navy-50 px-3.5 py-3">
          <span className="text-sm text-navy-800">Nouveau loyer hors charges</span>
          <span className="text-xl font-bold text-navy-900 tabular-nums">{calcul ? formatEuros(calcul.loyer) : "—"}</span>
        </div>
        <p className="text-xs text-slate-500" aria-live="polite">
          {calcul
            ? `${formatEuros(loyerActuel)} × ${nouveau} / ${ancien} = ${formatEuros(calcul.loyer)}, soit ${ecart >= 0 ? "+" : "−"}${formatEuros(Math.abs(ecart))} par mois (variation de l'indice : ${calcul.variation > 0 ? "+" : ""}${formatNombre(calcul.variation)} %).`
            : "Saisissez les deux indices pour calculer le nouveau loyer."}
        </p>
        <p className="text-xs text-slate-500">
          La révision n'est possible qu'une fois par an, à la date prévue au bail (ou à sa date anniversaire), si le bail contient une clause de révision. Elle ne peut excéder la variation de l'IRL sur un an. Si le bailleur ne révise pas dans l'année qui suit la date prévue, il perd le bénéfice de la révision pour l'année écoulée (art. 17-1 de la loi du 6 juillet 1989).
        </p>
      </div>
      <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 px-6 py-4">
        <ButtonLink href={annulerHref} variante="secondary">Annuler</ButtonLink>
        <SubmitButton enCours="Application…">Appliquer la révision</SubmitButton>
      </div>
    </form>
  );
}
