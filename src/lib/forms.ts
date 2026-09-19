import type { ZodError } from "zod";

/** État renvoyé par les actions serveur aux formulaires (useActionState). */
export type FormState = {
  ok?: boolean;
  message?: string;
  errors?: Record<string, string>;
  values?: Record<string, string>;
} | null;

/** Extrait les champs texte d'un FormData (les fichiers sont ignorés) ; un champ répété (cases à cocher) est joint par des virgules. */
export function valeursDe(fd: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of fd.entries()) {
    if (typeof v !== "string" || k.startsWith("$ACTION")) continue;
    out[k] = k in out ? `${out[k]},${v}` : v;
  }
  return out;
}

/** Première erreur par champ, à partir d'une erreur zod. */
export function erreursZod(err: ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of err.issues) {
    const cle = issue.path.length ? issue.path.map(String).join(".") : "_";
    if (!out[cle]) out[cle] = issue.message;
  }
  return out;
}

export function echec(fd: FormData, errors: Record<string, string>, message?: string): FormState {
  return { ok: false, errors, values: valeursDe(fd), message: message ?? "Veuillez corriger les champs signalés." };
}

export function erreur(fd: FormData | null, message: string): FormState {
  return { ok: false, message, values: fd ? valeursDe(fd) : undefined };
}

export function succes(message?: string): FormState {
  return { ok: true, message };
}

/** Message d'erreur lisible à partir d'une exception. */
export function messageErreur(e: unknown, defaut = "Une erreur est survenue."): string {
  if (e instanceof Error && e.message) return e.message;
  return defaut;
}
