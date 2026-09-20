import { z } from "zod";
import { parseMontant } from "./montants";
import { parseDateISO } from "./dates";

const OBLIGATOIRE = "Champ obligatoire";

export const zTexte = (max = 200) => z.string().trim().min(1, OBLIGATOIRE).max(max, `${max} caractères maximum`);

export const zTexteOpt = (max = 2000) =>
  z
    .string()
    .trim()
    .max(max, `${max} caractères maximum`)
    .transform((v) => (v === "" ? null : v));

export const zMontant = z.string().transform((s, ctx) => {
  const n = parseMontant(s);
  if (n === null) {
    ctx.addIssue({ code: "custom", message: s.trim() === "" ? OBLIGATOIRE : "Montant invalide" });
    return z.NEVER;
  }
  if (n < 0) {
    ctx.addIssue({ code: "custom", message: "Le montant doit être positif" });
    return z.NEVER;
  }
  return n;
});

export const zMontantOpt = z.string().transform((s, ctx) => {
  if (s.trim() === "") return null;
  const n = parseMontant(s);
  if (n === null) {
    ctx.addIssue({ code: "custom", message: "Montant invalide" });
    return z.NEVER;
  }
  if (n < 0) {
    ctx.addIssue({ code: "custom", message: "Le montant doit être positif" });
    return z.NEVER;
  }
  return n;
});

export const zDate = z.string().transform((s, ctx) => {
  const d = parseDateISO(s);
  if (!d) {
    ctx.addIssue({ code: "custom", message: s.trim() === "" ? OBLIGATOIRE : "Date invalide" });
    return z.NEVER;
  }
  return d;
});

export const zDateOpt = z.string().transform((s, ctx) => {
  if (s.trim() === "") return null;
  const d = parseDateISO(s);
  if (!d) {
    ctx.addIssue({ code: "custom", message: "Date invalide" });
    return z.NEVER;
  }
  return d;
});

export const zEntier = (min: number, max: number) =>
  z.string().transform((s, ctx) => {
    const t = s.trim();
    if (!/^-?\d+$/.test(t)) {
      ctx.addIssue({ code: "custom", message: t === "" ? OBLIGATOIRE : "Nombre entier attendu" });
      return z.NEVER;
    }
    const n = Number(t);
    if (n < min || n > max) {
      ctx.addIssue({ code: "custom", message: `Valeur entre ${min} et ${max}` });
      return z.NEVER;
    }
    return n;
  });

export const zEntierOpt = (min: number, max: number) =>
  z.string().transform((s, ctx) => {
    const t = s.trim();
    if (t === "") return null;
    if (!/^-?\d+$/.test(t)) {
      ctx.addIssue({ code: "custom", message: "Nombre entier attendu" });
      return z.NEVER;
    }
    const n = Number(t);
    if (n < min || n > max) {
      ctx.addIssue({ code: "custom", message: `Valeur entre ${min} et ${max}` });
      return z.NEVER;
    }
    return n;
  });

export const zNombreOpt = z.string().transform((s, ctx) => {
  if (s.trim() === "") return null;
  const n = parseMontant(s);
  if (n === null) {
    ctx.addIssue({ code: "custom", message: "Nombre invalide" });
    return z.NEVER;
  }
  return n;
});

export const zEmailOpt = z
  .string()
  .trim()
  .transform((v) => (v === "" ? null : v))
  .refine((v) => v === null || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), "Adresse email invalide");

export const zCodePostal = z.string().trim().regex(/^\d{5}$/, "Code postal à 5 chiffres");
export const zCodePostalOpt = z
  .string()
  .trim()
  .transform((v) => (v === "" ? null : v))
  .refine((v) => v === null || /^\d{5}$/.test(v), "Code postal à 5 chiffres");

/** Case à cocher : présente => true. */
export const zBool = z
  .string()
  .optional()
  .transform((v) => v === "on" || v === "true" || v === "1");

export const zId = z.string().transform((s, ctx) => {
  const n = Number(s);
  if (!Number.isInteger(n) || n <= 0) {
    ctx.addIssue({ code: "custom", message: OBLIGATOIRE });
    return z.NEVER;
  }
  return n;
});

export const zIdOpt = z
  .string()
  .optional()
  .transform((s, ctx) => {
    if (s === undefined || s.trim() === "") return null;
    const n = Number(s);
    if (!Number.isInteger(n) || n <= 0) {
      ctx.addIssue({ code: "custom", message: "Sélection invalide" });
      return z.NEVER;
    }
    return n;
  });

export const zEnum = <const T extends readonly [string, ...string[]]>(valeurs: T) =>
  z.enum(valeurs, { error: "Sélection invalide" });

/** Liste déroulante facultative : un choix vide vaut « non renseigné » et n'est pas une erreur. */
export const zEnumOpt = <const T extends readonly [string, ...string[]]>(valeurs: T) =>
  z
    .string()
    .transform((v) => v.trim())
    .pipe(z.union([z.literal(""), z.enum(valeurs, { error: "Sélection invalide" })]))
    .transform((v) => (v === "" ? null : (v as T[number])));

/**
 * Lit les champs d'un FormData selon un schéma zod (champs absents = chaîne vide)
 * et renvoie soit les données typées, soit la première erreur par champ.
 */
export function analyser<T extends z.ZodRawShape>(
  schema: z.ZodObject<T>,
  fd: FormData,
): { success: true; data: z.infer<z.ZodObject<T>> } | { success: false; errors: Record<string, string> } {
  const brut: Record<string, string> = {};
  for (const cle of Object.keys(schema.shape)) {
    const v = fd.get(cle);
    brut[cle] = typeof v === "string" ? v : "";
  }
  const r = schema.safeParse(brut);
  if (r.success) return { success: true, data: r.data };
  const errors: Record<string, string> = {};
  for (const issue of r.error.issues) {
    const cle = issue.path.length ? issue.path.map(String).join(".") : "_";
    if (!errors[cle]) errors[cle] = issue.message;
  }
  return { success: false, errors };
}
