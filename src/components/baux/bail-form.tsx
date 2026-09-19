"use client";

import { useActionState, useEffect, useState } from "react";
import type { Bail, TypeBail } from "@prisma/client";
import type { FormState } from "@/lib/forms";
import { MOTIFS_MOBILITE, TYPES_BAIL_COURT } from "@/lib/libelles";
import { REGLES_BAIL, dateFinParDefaut } from "@/lib/bail-regles";
import { parseDateISO, toISODate } from "@/lib/dates";
import { formatEuros, montantPourSaisie, parseMontant } from "@/lib/montants";
import { trimestresIRL } from "@/lib/irl";
import { dernierIndice, formatIndice, valeurTrimestre } from "@/lib/insee/utils";
import { joindre } from "@/lib/locataires";
import { Checkbox, Field, FormActions, FormMessage, Input, RadioCarte, Select, SubmitButton, Textarea, valeurInitiale } from "@/components/form";
import { Alerte, ButtonLink } from "@/components/ui";
import { StatutIndices } from "@/components/indices/statut-indices";
import { useIndicesINSEE } from "@/components/indices/use-indices";
import { useVersion } from "./use-version";

export type LotOption = { id: number; nom: string; adresse: string; codePostal: string; ville: string; meuble: boolean; bailleurPersonneMorale: boolean; loyerIndicatif?: number | null; chargesIndicatives?: number | null };
export type LocataireOption = { id: number; nom: string; detail?: string | null };

const TYPES: { valeur: TypeBail; aide: string }[] = [
  { valeur: "NON_MEUBLE", aide: "Logement vide, 3 ans" },
  { valeur: "MEUBLE", aide: "Logement meublé, 1 an" },
  { valeur: "MOBILITE", aide: "Meublé, 1 à 10 mois" },
];

const AIDE_DUREE: Record<TypeBail, string> = {
  NON_MEUBLE: "3 ans renouvelables (6 ans si le bailleur est une société).",
  MEUBLE: "1 an renouvelable (9 mois pour un étudiant).",
  MOBILITE: "De 1 à 10 mois, non renouvelable.",
};

const normaliser = (s: string) => s.toLocaleLowerCase("fr-FR").normalize("NFD").replace(/[\u0300-\u036f]/g, "");

/** Identifiants re-soumis après une erreur serveur (« 3,5 »), sinon la sélection initiale. */
function idsDepuis(valeur: string | undefined, defaut: number[]): number[] {
  if (valeur === undefined) return defaut;
  return Array.from(new Set(valeur.split(",").map((v) => Number(v.trim())).filter((n) => Number.isInteger(n) && n > 0)));
}

export function BailForm({
  action,
  initial,
  locataireIdsInitiaux = [],
  lots,
  locataires,
  annulerHref,
  verrouille = false,
  libelleEnvoi = "Enregistrer",
}: {
  action: (prev: FormState, fd: FormData) => Promise<FormState>;
  initial: Partial<Bail>;
  /** Locataires déjà titulaires (modification) ou présélectionnés (création depuis une fiche). */
  locataireIdsInitiaux?: number[];
  lots: LotOption[];
  locataires: LocataireOption[];
  annulerHref: string;
  verrouille?: boolean;
  libelleEnvoi?: string;
}) {
  const [state, formAction] = useActionState(action, null);
  const e = state?.errors ?? {};
  // Remonte le formulaire à chaque réponse du serveur : les champs contrôlés (type, lot, dates…) et les valeurs
  // par défaut re-soumises (valeurInitiale) sont alors resynchronisés après la réinitialisation automatique de React.
  const version = useVersion(state);

  const [type, setType] = useState<TypeBail>((valeurInitiale(state, "type", initial.type ?? "NON_MEUBLE") || "NON_MEUBLE") as TypeBail);
  const [lotId, setLotId] = useState(valeurInitiale(state, "lotId", initial.lotId));
  const [dateDebut, setDateDebut] = useState(valeurInitiale(state, "dateDebut", toISODate(initial.dateDebut)));
  const [dateFin, setDateFin] = useState(valeurInitiale(state, "dateFin", toISODate(initial.dateFin)));
  const [finManuelle, setFinManuelle] = useState(!!initial.dateFin || !!state?.values?.dateFin);
  const [loyerHC, setLoyerHC] = useState(valeurInitiale(state, "loyerHC", montantPourSaisie(initial.loyerHC)));
  const [charges, setCharges] = useState(valeurInitiale(state, "charges", montantPourSaisie(initial.charges ?? 0)));

  // Locataires titulaires : cases à cocher (couple, colocation), avec un filtre quand la liste est longue.
  const [selection, setSelection] = useState<number[]>(() => idsDepuis(state?.values?.locataireIds, locataireIdsInitiaux));
  const [recherche, setRecherche] = useState("");
  const rechercheNorm = normaliser(recherche.trim());
  const selectionnes = locataires.filter((l) => selection.includes(l.id));
  function basculer(id: number) {
    setSelection((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }
  // L'erreur du serveur sur les locataires ne s'affiche que tant que la sélection fautive n'a pas été modifiée.
  const [selectionSoumise, setSelectionSoumise] = useState<number[] | null>(null);
  useEffect(() => {
    if (state) setSelectionSoumise(selection);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);
  const erreurLocataires = e.locataireIds && (selectionSoumise === null || selectionSoumise.join(",") === selection.join(",")) ? e.locataireIds : null;

  // Indice de référence des loyers : le dernier IRL publié par l'INSEE est proposé pour un nouveau bail.
  const indices = useIndicesINSEE("IRL", type !== "MOBILITE");
  const [irlTrimestre, setIrlTrimestre] = useState(valeurInitiale(state, "irlTrimestre", initial.irlTrimestre));
  const [irlValeur, setIrlValeur] = useState(valeurInitiale(state, "irlValeur", initial.irlValeur !== null && initial.irlValeur !== undefined ? String(initial.irlValeur).replace(".", ",") : ""));
  useEffect(() => {
    if (indices.statut !== "ok" || !indices.serie || irlTrimestre || irlValeur.trim()) return;
    const dernier = dernierIndice(indices.serie);
    if (dernier) {
      setIrlTrimestre(dernier.trimestre);
      setIrlValeur(formatIndice(dernier.valeur));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [indices]);
  function changerTrimestreIRL(t: string) {
    setIrlTrimestre(t);
    const o = indices.serie ? valeurTrimestre(indices.serie, t) : null;
    if (o) setIrlValeur(formatIndice(o.valeur));
  }
  function utiliserDernierIRL() {
    const d = indices.serie ? dernierIndice(indices.serie) : null;
    if (d) {
      setIrlTrimestre(d.trimestre);
      setIrlValeur(formatIndice(d.valeur));
    }
  }

  const regle = REGLES_BAIL[type];
  const lot = lots.find((l) => String(l.id) === lotId);
  // Après une erreur serveur, React réinitialise le formulaire : les <select> non contrôlés sont remontés (key) sur la valeur re-soumise.
  const motifInitial = valeurInitiale(state, "motifMobilite", initial.motifMobilite);
  const montantLoyer = parseMontant(loyerHC) ?? 0;
  const total = montantLoyer + (parseMontant(charges) ?? 0);
  const plafondDepot = regle.depotMaxMois * montantLoyer;

  function finAuto(t: TypeBail, debut: string, idLot: string): string {
    const d = parseDateISO(debut);
    if (!d) return "";
    const l = lots.find((x) => String(x.id) === idLot);
    return toISODate(dateFinParDefaut(t, d, !!l?.bailleurPersonneMorale));
  }
  function changerType(t: TypeBail) {
    setType(t);
    if (!finManuelle) setDateFin(finAuto(t, dateDebut, lotId));
  }
  function changerDebut(v: string) {
    setDateDebut(v);
    if (!finManuelle) setDateFin(finAuto(type, v, lotId));
  }
  function changerLot(v: string) {
    setLotId(v);
    if (!finManuelle) setDateFin(finAuto(type, dateDebut, v));
    const l = lots.find((x) => String(x.id) === v);
    // Pré-remplit le loyer et les charges indicatifs du lot tant qu'ils n'ont pas été saisis.
    if (l && l.loyerIndicatif !== null && l.loyerIndicatif !== undefined && (parseMontant(loyerHC) ?? 0) === 0) {
      setLoyerHC(montantPourSaisie(l.loyerIndicatif));
      if ((parseMontant(charges) ?? 0) === 0) setCharges(montantPourSaisie(l.chargesIndicatives ?? 0));
    }
  }

  const trimestres = trimestresIRL(new Date().getFullYear()).map((t) => ({ value: t, label: t }));
  if (irlTrimestre && !trimestres.some((t) => t.value === irlTrimestre)) trimestres.unshift({ value: irlTrimestre, label: irlTrimestre });
  const aideDuree = `${AIDE_DUREE[type]}${finManuelle ? "" : " Proposée automatiquement ; modifiable."}`;
  const aideDepot = regle.depotMaxMois === 0 ? "Aucun dépôt de garantie autorisé en bail mobilité." : `Plafond légal : ${regle.depotMaxMois} mois de loyer hors charges${montantLoyer > 0 ? `, soit ${formatEuros(plafondDepot)}` : ""}.`;
  const resumeLocataires =
    selectionnes.length === 0
      ? "Cochez le ou les titulaires du bail (couple, colocation) : ils sont solidaires du paiement du loyer."
      : `${selectionnes.length > 1 ? `${selectionnes.length} locataires` : "1 locataire"} : ${joindre(selectionnes.map((l) => l.nom))}.`;

  return (
    <form key={version} action={formAction} className="flex flex-col gap-5">
      <FormMessage state={state} />
      {verrouille && <Alerte ton="orange">Ce bail est signé : le lot, les locataires, le type et la date de début ne sont plus modifiables.</Alerte>}

      <div className="grid grid-cols-1 gap-[18px] sm:grid-cols-2">
        <fieldset className="sm:col-span-2">
          <legend className="mb-1.5 block text-sm font-semibold text-navy-900">
            Type de bail<span className="ml-1 text-red-600">*</span>
          </legend>
          <div role="radiogroup" className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {TYPES.map((t) => (
              <RadioCarte key={t.valeur} name="typeChoix" value={t.valeur} checked={type === t.valeur} onChange={() => changerType(t.valeur)} disabled={verrouille} label={TYPES_BAIL_COURT[t.valeur]} aide={t.aide} />
            ))}
          </div>
          {/* Valeur transmise au serveur (reflète la carte cochée). */}
          <select name="type" value={type} onChange={(ev) => changerType(ev.target.value as TypeBail)} disabled={verrouille} tabIndex={-1} aria-hidden="true" className="sr-only">
            {TYPES.map((t) => (
              <option key={t.valeur} value={t.valeur}>{TYPES_BAIL_COURT[t.valeur]}</option>
            ))}
          </select>
          {e.type ? (
            <p className="mt-1.5 text-xs text-red-600">{e.type}</p>
          ) : (
            <p className="mt-1.5 text-xs text-slate-500">
              {regle.resume} Préavis du locataire : {regle.preavisLocataire}. Congé du bailleur : {regle.preavisBailleur}.
            </p>
          )}
          {lot && !lot.meuble && type !== "NON_MEUBLE" && <p className="mt-1.5 text-xs font-semibold text-amber-800">Le lot choisi n'est pas indiqué comme meublé.</p>}
        </fieldset>

        <Field label="Lot" name="lotId" requis error={e.lotId} className="sm:col-span-2">
          <Select
            name="lotId"
            vide="Choisir un lot…"
            options={lots.map((l) => ({ value: String(l.id), label: `${l.nom} — ${l.adresse}, ${l.codePostal} ${l.ville}${l.meuble ? " (meublé)" : ""}` }))}
            value={lotId}
            onChange={(ev) => changerLot(ev.target.value)}
            invalide={!!e.lotId}
            disabled={verrouille}
          />
        </Field>

        <fieldset className="sm:col-span-2">
          <legend className="mb-1.5 block text-sm font-semibold text-navy-900">
            {selectionnes.length > 1 ? "Locataires" : "Locataire"}<span className="ml-1 text-red-600">*</span>
          </legend>
          {locataires.length > 6 && !verrouille && (
            <Input type="search" value={recherche} onChange={(ev) => setRecherche(ev.target.value)} placeholder="Rechercher un locataire…" aria-label="Rechercher un locataire" className="mb-2" />
          )}
          <div role="group" aria-label="Locataires titulaires du bail" className={`max-h-72 divide-y divide-slate-100 overflow-y-auto rounded-lg border bg-white ${erreurLocataires ? "border-red-400" : "border-slate-300"}`}>
            {locataires.length === 0 && <p className="px-3.5 py-3 text-sm text-slate-500">Aucun locataire enregistré : créez-le d'abord dans la rubrique Locataires.</p>}
            {locataires.map((l) => {
              const coche = selection.includes(l.id);
              const visible = !rechercheNorm || normaliser(`${l.nom} ${l.detail ?? ""}`).includes(rechercheNorm);
              return (
                <label key={l.id} className={`flex items-center gap-3 px-3.5 py-2.5 ${verrouille ? "" : "cursor-pointer hover:bg-slate-50"} ${coche ? "bg-navy-50" : ""} ${visible ? "" : "hidden"}`}>
                  <input type="checkbox" name="locataireIds" value={l.id} checked={coche} onChange={() => basculer(l.id)} disabled={verrouille} className="h-4 w-4 shrink-0 cursor-pointer rounded border-slate-300 accent-navy-800 disabled:cursor-default" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-navy-900">{l.nom}</span>
                    {l.detail && <span className="block truncate text-xs text-slate-500">{l.detail}</span>}
                  </span>
                </label>
              );
            })}
          </div>
          <p className={`mt-1.5 text-xs ${erreurLocataires ? "text-red-600" : "text-slate-500"}`}>{erreurLocataires ?? resumeLocataires}</p>
        </fieldset>

        {type === "MOBILITE" && (
          <Field label="Motif du bail mobilité" name="motifMobilite" requis error={e.motifMobilite} className="sm:col-span-2" hint="Situation du locataire justifiant le recours au bail mobilité (art. 25-12 de la loi du 6 juillet 1989).">
            <Select key={motifInitial} name="motifMobilite" vide="Choisir un motif…" options={MOTIFS_MOBILITE.map((m) => ({ value: m, label: m }))} defaultValue={motifInitial} invalide={!!e.motifMobilite} />
          </Field>
        )}

        <Field label="Date de début" name="dateDebut" requis error={e.dateDebut}>
          <Input name="dateDebut" type="date" value={dateDebut} onChange={(ev) => changerDebut(ev.target.value)} invalide={!!e.dateDebut} disabled={verrouille} />
        </Field>
        <Field label="Date de fin" name="dateFin" requis error={e.dateFin} hint={aideDuree}>
          <Input
            name="dateFin"
            type="date"
            value={dateFin}
            onChange={(ev) => {
              setFinManuelle(true);
              setDateFin(ev.target.value);
            }}
            invalide={!!e.dateFin}
          />
        </Field>

        <Field label="Loyer hors charges (€)" name="loyerHC" requis error={e.loyerHC}>
          <Input name="loyerHC" inputMode="decimal" value={loyerHC} onChange={(ev) => setLoyerHC(ev.target.value)} invalide={!!e.loyerHC} />
        </Field>
        <div>
          <Field label="Charges (€)" name="charges" error={e.charges}>
            <Input name="charges" inputMode="decimal" value={charges} onChange={(ev) => setCharges(ev.target.value)} invalide={!!e.charges} />
          </Field>
          <div className="mt-2">
            {type === "MOBILITE" ? (
              <>
                <input type="hidden" name="chargesForfait" value="on" />
                <Checkbox name="chargesForfait_affichage" label="Charges au forfait (sans régularisation)" hint="Obligatoire pour un bail mobilité" checked disabled />
              </>
            ) : (
              <Checkbox
                name="chargesForfait"
                label="Charges au forfait (sans régularisation)"
                hint={type === "MEUBLE" ? "Sinon, provisions sur charges régularisées chaque année" : "Pour un logement vide, les charges sont en principe des provisions régularisées chaque année"}
                defaultChecked={state?.values ? state.values.chargesForfait === "on" : !!initial.chargesForfait}
              />
            )}
          </div>
        </div>

        <Field label="Dépôt de garantie (€)" name="depotGarantie" error={e.depotGarantie} hint={aideDepot}>
          <Input name="depotGarantie" inputMode="decimal" defaultValue={valeurInitiale(state, "depotGarantie", montantPourSaisie(initial.depotGarantie ?? 0))} invalide={!!e.depotGarantie} disabled={type === "MOBILITE"} />
        </Field>
        <Field label="Jour d'échéance du loyer" name="jourEcheance" requis error={e.jourEcheance} hint="Jour du mois auquel le loyer est payable (terme à échoir).">
          <Input name="jourEcheance" inputMode="numeric" defaultValue={valeurInitiale(state, "jourEcheance", initial.jourEcheance ?? 1)} invalide={!!e.jourEcheance} />
        </Field>

        {type !== "MOBILITE" && (
          <>
            <fieldset className="sm:col-span-2">
              <legend className="mb-1.5 block text-sm font-semibold text-navy-900">Indice de référence</legend>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Select name="irlTrimestre" aria-label="Trimestre de l'IRL de référence" vide="Trimestre…" options={trimestres} value={irlTrimestre} onChange={(ev) => changerTrimestreIRL(ev.target.value)} invalide={!!e.irlTrimestre} />
                <Input name="irlValeur" aria-label="Valeur de l'IRL de référence" inputMode="decimal" placeholder="Valeur, ex. : 145,17" value={irlValeur} onChange={(ev) => setIrlValeur(ev.target.value)} invalide={!!e.irlValeur} />
              </div>
              {e.irlTrimestre || e.irlValeur ? <p className="mt-1.5 text-xs text-red-600">{e.irlTrimestre ?? e.irlValeur}</p> : <p className="mt-1.5 text-xs text-slate-500">Dernier IRL publié par l'INSEE à la signature : trimestre et valeur.</p>}
              <StatutIndices etat={indices} libelle="IRL" onUtiliser={utiliserDernierIRL} className="mt-1" />
            </fieldset>
            <div className="sm:col-span-2">
              <Checkbox name="clauseRevision" label="Clause de révision annuelle du loyer (IRL)" hint="Le loyer pourra être révisé chaque année à la date anniversaire selon l'indice de référence des loyers" defaultChecked={state?.values ? state.values.clauseRevision === "on" : (initial.clauseRevision ?? true)} />
            </div>
          </>
        )}

        <Field label="Notes" name="notes" error={e.notes} className="sm:col-span-2">
          <Textarea name="notes" rows={3} defaultValue={valeurInitiale(state, "notes", initial.notes)} invalide={!!e.notes} placeholder="Garant, clauses particulières, état des lieux…" />
        </Field>
      </div>

      <div className="flex items-center justify-between gap-3 rounded-lg border border-navy-200 bg-navy-50 px-3.5 py-3 text-sm text-navy-800">
        <span>Loyer mensuel charges comprises</span>
        <strong className="text-lg text-navy-900 tabular-nums">{formatEuros(total)}</strong>
      </div>

      <FormActions>
        <SubmitButton>{libelleEnvoi}</SubmitButton>
        <ButtonLink href={annulerHref} variante="secondary">Annuler</ButtonLink>
      </FormActions>
    </form>
  );
}
