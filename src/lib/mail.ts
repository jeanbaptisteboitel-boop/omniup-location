import "server-only";
import nodemailer, { type Transporter } from "nodemailer";
import { Resend } from "resend";

export type PieceJointe = { nom: string; contenu: Buffer; type: string };

export type FournisseurMail = "resend" | "smtp";

/**
 * Fournisseur d'envoi retenu : Resend dès que RESEND_API_KEY est renseignée,
 * sinon SMTP (SMTP_HOST), sinon aucun (les envois sont désactivés).
 */
export function fournisseurMail(): FournisseurMail | null {
  if (process.env.RESEND_API_KEY) return "resend";
  if (process.env.SMTP_HOST && expediteur()) return "smtp";
  return null;
}

export function mailConfigure(): boolean {
  return fournisseurMail() !== null;
}

export function libelleFournisseurMail(): string {
  const f = fournisseurMail();
  return f === "resend" ? "Resend" : f === "smtp" ? "SMTP" : "Non configuré";
}

/** Adresse d'expédition : MAIL_FROM, sinon SMTP_FROM (compatibilité). */
export function expediteur(): string {
  return process.env.MAIL_FROM || process.env.SMTP_FROM || "";
}

let transport: Transporter | null = null;
let resend: Resend | null = null;

function clientResend(): Resend {
  if (!resend) resend = new Resend(process.env.RESEND_API_KEY);
  return resend;
}

function transporteur(): Transporter {
  if (!transport) {
    const port = Number(process.env.SMTP_PORT ?? 587);
    const secure = String(process.env.SMTP_SECURE ?? "").toLowerCase() === "true" || port === 465;
    transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure,
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS ?? "" } : undefined,
    });
  }
  return transport;
}

export async function envoyerEmail(params: { a: string; objet: string; texte: string; repondreA?: string | null; piecesJointes?: PieceJointe[] }): Promise<void> {
  if (!params.a) throw new Error("Le destinataire n'a pas d'adresse email.");
  const fournisseur = fournisseurMail();
  if (!fournisseur) {
    throw new Error("L'envoi d'emails n'est pas configuré : renseignez RESEND_API_KEY et MAIL_FROM (ou les variables SMTP_*) dans le fichier .env.");
  }
  const from = expediteur();
  if (!from) throw new Error("Adresse d'expédition manquante : renseignez MAIL_FROM dans le fichier .env.");

  if (fournisseur === "resend") {
    const { error } = await clientResend().emails.send({
      from,
      to: params.a,
      replyTo: params.repondreA || undefined,
      subject: params.objet,
      text: params.texte,
      attachments: params.piecesJointes?.map((p) => ({ filename: p.nom, content: p.contenu, contentType: p.type })),
    });
    if (error) throw new Error(`Resend : ${error.message}`);
    return;
  }

  await transporteur().sendMail({
    from,
    to: params.a,
    replyTo: params.repondreA ?? undefined,
    subject: params.objet,
    text: params.texte,
    attachments: params.piecesJointes?.map((p) => ({ filename: p.nom, content: p.contenu, contentType: p.type })),
  });
}
