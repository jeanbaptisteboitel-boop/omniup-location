"use client";

import type { ComponentProps, ReactNode } from "react";
import { useFormStatus } from "react-dom";
import type { FormState } from "@/lib/forms";
import { classesBouton } from "./ui";

const CHAMP =
  "block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-navy-950 shadow-sm placeholder:text-slate-400 focus:border-brand-cyan focus:outline-none focus:ring-2 focus:ring-brand-cyan/40 disabled:bg-slate-50";
const CHAMP_ERREUR = "border-red-400 focus:border-red-500 focus:ring-red-200";

export function Field({
  label,
  name,
  error,
  hint,
  requis,
  children,
  className = "",
}: {
  label: ReactNode;
  name: string;
  error?: string;
  hint?: ReactNode;
  requis?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label htmlFor={name} className="mb-1 block text-sm font-medium text-navy-900">
        {label}
        {requis && <span className="ml-0.5 text-red-600">*</span>}
      </label>
      {children}
      {error ? (
        <p className="mt-1 text-xs text-red-600" id={`${name}-erreur`}>
          {error}
        </p>
      ) : hint ? (
        <p className="mt-1 text-xs text-slate-500">{hint}</p>
      ) : null}
    </div>
  );
}

export function Input({ className = "", invalide, ...props }: ComponentProps<"input"> & { invalide?: boolean }) {
  return <input id={props.name} className={`${CHAMP} ${invalide ? CHAMP_ERREUR : ""} ${className}`} {...props} />;
}

export function Textarea({ className = "", invalide, ...props }: ComponentProps<"textarea"> & { invalide?: boolean }) {
  return <textarea id={props.name} className={`${CHAMP} ${invalide ? CHAMP_ERREUR : ""} ${className}`} {...props} />;
}

export function Select({
  className = "",
  invalide,
  options,
  vide,
  ...props
}: ComponentProps<"select"> & { invalide?: boolean; options: { value: string; label: string }[]; vide?: string }) {
  return (
    <select id={props.name} className={`${CHAMP} ${invalide ? CHAMP_ERREUR : ""} ${className}`} {...props}>
      {vide !== undefined && <option value="">{vide}</option>}
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function Checkbox({ label, hint, ...props }: ComponentProps<"input"> & { label: ReactNode; hint?: ReactNode }) {
  return (
    <label className="flex items-start gap-2 text-sm text-navy-900">
      <input type="checkbox" className="mt-0.5 h-4 w-4 rounded border-slate-300 text-navy-800 focus:ring-brand-cyan" {...props} />
      <span>
        {label}
        {hint && <span className="block text-xs text-slate-500">{hint}</span>}
      </span>
    </label>
  );
}

export function SubmitButton({
  children,
  enCours = "Enregistrement…",
  variante = "primary",
  taille = "md",
  className = "",
  ...props
}: ComponentProps<"button"> & { enCours?: ReactNode; variante?: "primary" | "secondary" | "danger" | "ghost" | "accent"; taille?: "sm" | "md" }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={classesBouton(variante, taille, className)} {...props}>
      {pending ? enCours : children}
    </button>
  );
}

export function FormMessage({ state }: { state: FormState }) {
  if (!state?.message) return null;
  return (
    <div
      role={state.ok ? "status" : "alert"}
      className={`rounded-md border px-4 py-3 text-sm ${state.ok ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-red-200 bg-red-50 text-red-900"}`}
    >
      {state.message}
    </div>
  );
}

/** Valeur initiale d'un champ : valeur re-soumise en cas d'erreur, sinon valeur initiale. */
export function valeurInitiale(state: FormState, nom: string, initiale: string | number | null | undefined): string {
  if (state?.values && nom in state.values) return state.values[nom];
  if (initiale === null || initiale === undefined) return "";
  return String(initiale);
}

export function FormActions({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4">{children}</div>;
}
