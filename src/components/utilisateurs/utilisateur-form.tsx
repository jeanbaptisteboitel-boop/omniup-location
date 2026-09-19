"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import type { FormState } from "@/lib/forms";
import { Checkbox, Field, FormMessage, Input, RadioCarte, Select, SubmitButton, valeurInitiale } from "@/components/form";

/** Création d'un utilisateur : rôle, entités, invitation par email ou mot de passe initial. */
export function UtilisateurForm({
  action,
  entites,
  roles,
  superAdminPossible,
  mailConfigure,
}: {
  action: (prev: FormState, fd: FormData) => Promise<FormState>;
  entites: { id: number; nom: string }[];
  roles: { value: string; label: string; description: string }[];
  superAdminPossible: boolean;
  mailConfigure: boolean;
}) {
  const [state, formAction] = useActionState(action, null);
  const e = state?.errors ?? {};
  const ref = useRef<HTMLFormElement>(null);
  const [mode, setMode] = useState<"invitation" | "motDePasse">(mailConfigure ? "invitation" : "motDePasse");
  const [role, setRole] = useState(valeurInitiale(state, "role", "GESTIONNAIRE"));
  useEffect(() => {
    if (state?.ok) ref.current?.reset();
  }, [state]);
  const description = roles.find((r) => r.value === role)?.description;
  return (
    <form ref={ref} action={formAction} className="flex flex-col gap-3.5">
      <FormMessage state={state} />
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
        <Field label="Nom" name="nom" requis error={e.nom}>
          <Input name="nom" defaultValue={valeurInitiale(state, "nom", "")} invalide={!!e.nom} placeholder="Prénom Nom" />
        </Field>
        <Field label="Email" name="email" requis error={e.email} hint="Sert d'identifiant de connexion.">
          <Input name="email" type="email" defaultValue={valeurInitiale(state, "email", "")} invalide={!!e.email} placeholder="prenom.nom@exemple.fr" />
        </Field>
      </div>
      <Field label="Rôle sur les entités cochées" name="role" requis error={e.role} hint={description}>
        <Select name="role" options={roles.map((r) => ({ value: r.value, label: r.label }))} value={role} onChange={(ev) => setRole(ev.target.value)} invalide={!!e.role} />
      </Field>
      <fieldset>
        <legend className="mb-1.5 block text-sm font-semibold text-navy-900">Entités accessibles</legend>
        {entites.length === 0 ? (
          <p className="text-sm text-slate-500">Aucune entité administrée.</p>
        ) : (
          <div className={`grid grid-cols-1 gap-1.5 rounded-lg border p-3 sm:grid-cols-2 ${e.entiteIds ? "border-red-400" : "border-slate-200"}`}>
            {entites.map((en) => (
              <Checkbox key={en.id} name="entiteIds" value={en.id} label={en.nom} defaultChecked={entites.length === 1} />
            ))}
          </div>
        )}
        {e.entiteIds && <p className="mt-1.5 text-xs text-red-600">{e.entiteIds}</p>}
      </fieldset>
      {superAdminPossible && <Checkbox name="superAdmin" label="Super-administrateur" hint="Accès à toutes les entités, gestion de tous les utilisateurs et des réglages généraux (cabinet)." />}
      <fieldset>
        <legend className="mb-1.5 block text-sm font-semibold text-navy-900">Accès initial</legend>
        <div role="radiogroup" className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <RadioCarte name="modeAcces" value="invitation" checked={mode === "invitation"} onChange={() => setMode("invitation")} disabled={!mailConfigure} label="Invitation par email" aide={mailConfigure ? "L'utilisateur choisit lui-même son mot de passe (lien valable 7 jours)" : "Envoi d'emails non configuré"} />
          <RadioCarte name="modeAcces" value="motDePasse" checked={mode === "motDePasse"} onChange={() => setMode("motDePasse")} label="Mot de passe initial" aide="Vous le communiquez à l'utilisateur, qui pourra le changer" />
        </div>
        {e.modeAcces && <p className="mt-1.5 text-xs text-red-600">{e.modeAcces}</p>}
      </fieldset>
      {mode === "motDePasse" && (
        <Field label="Mot de passe initial" name="motDePasse" requis error={e.motDePasse} hint="8 caractères au minimum.">
          <Input name="motDePasse" type="password" autoComplete="new-password" invalide={!!e.motDePasse} />
        </Field>
      )}
      <div>
        <SubmitButton enCours="Création…">Créer l'utilisateur</SubmitButton>
      </div>
    </form>
  );
}
