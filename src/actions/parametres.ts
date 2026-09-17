"use server";

import { erreur, messageErreur, succes, type FormState } from "@/lib/forms";
import { envoyerEmail, libelleFournisseurMail, mailConfigure } from "@/lib/mail";

export async function envoyerEmailTest(_prev: FormState, fd: FormData): Promise<FormState> {
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
