"use client";

import { useActionState } from "react";
import type { FormState } from "@/lib/forms";
import { Checkbox, Field, FormMessage, Input, SubmitButton, valeurInitiale } from "@/components/form";
import { Turnstile } from "@/components/turnstile";

type Action = (prev: FormState, fd: FormData) => Promise<FormState>;

/** Connexion par email et mot de passe. */
export function ConnexionForm({ action, suite, siteKey }: { action: Action; suite: string; siteKey: string | null }) {
  const [state, formAction] = useActionState(action, null);
  return (
    <form action={formAction} className="flex flex-col gap-4">
      <FormMessage state={state} />
      <input type="hidden" name="suite" value={suite} />
      <Field label="Email" name="email">
        <Input name="email" type="email" autoComplete="username" placeholder="prenom.nom@exemple.fr" defaultValue={valeurInitiale(state, "email", "")} autoFocus required grand />
      </Field>
      <Field label="Mot de passe" name="motDePasse">
        <Input name="motDePasse" type="password" autoComplete="current-password" placeholder="••••••••" required grand invalide={!!state?.message} />
      </Field>
      <Turnstile siteKey={siteKey} />
      <SubmitButton taille="lg" className="w-full" enCours="Connexion…">Se connecter</SubmitButton>
    </form>
  );
}

/** Connexion par le mot de passe principal (APP_PASSWORD). */
export function ConnexionPrincipaleForm({ action, suite, siteKey }: { action: Action; suite: string; siteKey: string | null }) {
  const [state, formAction] = useActionState(action, null);
  return (
    <form action={formAction} className="flex flex-col gap-4">
      <FormMessage state={state} />
      <input type="hidden" name="suite" value={suite} />
      <Field label="Mot de passe principal" name="motDePasse" hint="Mot de passe défini dans les paramètres du serveur (APP_PASSWORD) : accès complet.">
        <Input name="motDePasse" type="password" autoComplete="current-password" placeholder="••••••••" autoFocus required grand invalide={!!state?.message} />
      </Field>
      <Turnstile siteKey={siteKey} />
      <SubmitButton taille="lg" className="w-full" enCours="Connexion…">Se connecter</SubmitButton>
    </form>
  );
}

/** Création du premier compte (super-administrateur). */
export function PremierAdminForm({ action, motDePassePrincipalRequis, siteKey }: { action: Action; motDePassePrincipalRequis: boolean; siteKey: string | null }) {
  const [state, formAction] = useActionState(action, null);
  const e = state?.errors ?? {};
  return (
    <form action={formAction} className="flex flex-col gap-4">
      <FormMessage state={state} />
      <Field label="Votre nom" name="nom" requis error={e.nom}>
        <Input name="nom" autoComplete="name" defaultValue={valeurInitiale(state, "nom", "")} invalide={!!e.nom} required grand />
      </Field>
      <Field label="Email" name="email" requis error={e.email}>
        <Input name="email" type="email" autoComplete="username" defaultValue={valeurInitiale(state, "email", "")} invalide={!!e.email} required grand />
      </Field>
      <Field label="Mot de passe" name="motDePasse" requis error={e.motDePasse} hint="8 caractères au minimum.">
        <Input name="motDePasse" type="password" autoComplete="new-password" invalide={!!e.motDePasse} required grand />
      </Field>
      <Field label="Confirmation du mot de passe" name="confirmation" requis>
        <Input name="confirmation" type="password" autoComplete="new-password" required grand />
      </Field>
      {motDePassePrincipalRequis && (
        <Field label="Mot de passe principal" name="motDePassePrincipal" requis error={e.motDePassePrincipal} hint="Le mot de passe actuel de l'application (APP_PASSWORD) autorise la création du premier compte.">
          <Input name="motDePassePrincipal" type="password" autoComplete="off" invalide={!!e.motDePassePrincipal} required grand />
        </Field>
      )}
      <Turnstile siteKey={siteKey} />
      <SubmitButton taille="lg" className="w-full" enCours="Création…">Créer mon compte administrateur</SubmitButton>
    </form>
  );
}

/** Mot de passe oublié. */
export function OubliForm({ action, siteKey }: { action: Action; siteKey: string | null }) {
  const [state, formAction] = useActionState(action, null);
  return (
    <form action={formAction} className="flex flex-col gap-4">
      <FormMessage state={state} />
      <Field label="Email de votre compte" name="email">
        <Input name="email" type="email" autoComplete="username" defaultValue={valeurInitiale(state, "email", "")} autoFocus required grand />
      </Field>
      <Turnstile siteKey={siteKey} />
      <SubmitButton taille="lg" className="w-full" enCours="Envoi…">Recevoir un lien de réinitialisation</SubmitButton>
    </form>
  );
}

/** Choix du mot de passe depuis un lien d'invitation ou de réinitialisation. */
export function DefinirMotDePasseForm({ action, jeton }: { action: Action; jeton: string }) {
  const [state, formAction] = useActionState(action, null);
  const e = state?.errors ?? {};
  return (
    <form action={formAction} className="flex flex-col gap-4">
      <FormMessage state={state} />
      <input type="hidden" name="jeton" value={jeton} />
      <Field label="Nouveau mot de passe" name="motDePasse" requis error={e.motDePasse} hint="8 caractères au minimum.">
        <Input name="motDePasse" type="password" autoComplete="new-password" autoFocus required grand invalide={!!e.motDePasse} />
      </Field>
      <Field label="Confirmation" name="confirmation" requis>
        <Input name="confirmation" type="password" autoComplete="new-password" required grand />
      </Field>
      <SubmitButton taille="lg" className="w-full" enCours="Enregistrement…">Enregistrer et me connecter</SubmitButton>
    </form>
  );
}

/** Changement de mot de passe (page Mon compte). */
export function ChangerMotDePasseForm({ action, sansAncien }: { action: Action; sansAncien: boolean }) {
  const [state, formAction] = useActionState(action, null);
  const e = state?.errors ?? {};
  return (
    <form action={formAction} className="flex flex-col gap-3.5">
      <FormMessage state={state} />
      {!sansAncien && (
        <Field label="Mot de passe actuel" name="ancien" requis error={e.ancien}>
          <Input name="ancien" type="password" autoComplete="current-password" required invalide={!!e.ancien} />
        </Field>
      )}
      <Field label="Nouveau mot de passe" name="nouveau" requis error={e.nouveau} hint="8 caractères au minimum.">
        <Input name="nouveau" type="password" autoComplete="new-password" required invalide={!!e.nouveau} />
      </Field>
      <Field label="Confirmation" name="confirmation" requis>
        <Input name="confirmation" type="password" autoComplete="new-password" required />
      </Field>
      <div>
        <SubmitButton enCours="Enregistrement…">Changer le mot de passe</SubmitButton>
      </div>
    </form>
  );
}

/** Case « super-administrateur » (réutilisée dans le formulaire utilisateur). */
export function CaseSuperAdmin({ defaultChecked }: { defaultChecked?: boolean }) {
  return <Checkbox name="superAdmin" label="Super-administrateur" hint="Accès à toutes les entités, gestion de tous les utilisateurs et des réglages généraux" defaultChecked={defaultChecked} />;
}
