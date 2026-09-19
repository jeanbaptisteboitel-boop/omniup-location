"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { erreur, messageErreur, succes, type FormState } from "@/lib/forms";
import { avecMessage } from "@/lib/erreurs";
import { envoyerEmail, libelleFournisseurMail, mailConfigure } from "@/lib/mail";
import { stockageObjetConfigure } from "@/lib/storage";
import { autoriserOrigines } from "@/lib/stockage-s3";
import { exigerAdministration } from "@/lib/droits";

export async function envoyerEmailTest(_prev: FormState, fd: FormData): Promise<FormState> {
  await exigerAdministration();
  const a = String(fd.get("email") ?? "").trim();
  if (!a) return erreur(fd, "Indiquez une adresse email.");
  if (!mailConfigure()) return erreur(fd, "Envoi d'emails non configuré (RESEND_API_KEY ou SMTP_HOST).");
  try {
    await envoyerEmail({ a, objet: "Test d'envoi — OMNIUP Location", texte: `Ceci est un email de test envoyé par l'application OMNIUP Location. L'envoi via ${libelleFournisseurMail()} fonctionne.` });
    return succes(`Email de test envoyé à ${a} via ${libelleFournisseurMail()}.`);
  } catch (e) {
    return erreur(fd, `Échec de l'envoi : ${messageErreur(e)}`);
  }
}

/** Origines (https://site) depuis lesquelles l'application est utilisée : APP_URL et l'adresse de la requête en cours. */
async function originesApplication(): Promise<string[]> {
  const h = await headers();
  const hote = h.get("x-forwarded-host") ?? h.get("host");
  const origineRequete = h.get("origin") ?? (hote ? `${h.get("x-forwarded-proto") ?? "https"}://${hote}` : "");
  return Array.from(
    new Set(
      [...(process.env.APP_URL ?? "").split(","), origineRequete]
        .map((o) => o.trim().replace(/\/+$/, ""))
        .filter((o) => /^https?:\/\/[^/]+$/.test(o)),
    ),
  );
}

/** Applique au bucket Scaleway la règle CORS qui autorise l'envoi direct des fichiers depuis le navigateur. */
export async function autoriserEnvoiDirect(): Promise<void> {
  await exigerAdministration();
  if (!stockageObjetConfigure()) redirect(avecMessage("/parametres", "Le stockage objet n'est pas configuré (SCW_ACCESS_KEY, SCW_SECRET_KEY, SCW_BUCKET).", "erreur"));
  const origines = await originesApplication();
  if (!origines.length) redirect(avecMessage("/parametres", "Impossible de déterminer l'adresse de l'application : renseignez APP_URL (ex. https://mon-app.vercel.app).", "erreur"));
  let resultat: { ok: true; origines: string[] } | { ok: false; erreur: string };
  try {
    resultat = { ok: true, origines: await autoriserOrigines(origines) };
  } catch (e) {
    resultat = { ok: false, erreur: messageErreur(e) };
  }
  revalidatePath("/parametres");
  if (!resultat.ok) redirect(avecMessage("/parametres", `Échec de la configuration CORS du bucket : ${resultat.erreur}`, "erreur"));
  redirect(avecMessage("/parametres", `Envoi direct autorisé depuis : ${resultat.origines.join(", ")}. Réessayez l'import de vos fichiers.`));
}
