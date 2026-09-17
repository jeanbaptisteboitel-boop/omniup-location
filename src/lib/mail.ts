import "server-only";
import nodemailer, { type Transporter } from "nodemailer";

export type PieceJointe = { nom: string; contenu: Buffer; type: string };

export function mailConfigure(): boolean {
  return !!process.env.SMTP_HOST && !!process.env.SMTP_FROM;
}

export function expediteur(): string {
  return process.env.SMTP_FROM ?? "";
}

let transport: Transporter | null = null;

function transporteur(): Transporter {
  if (!mailConfigure()) throw new Error("L'envoi d'emails n'est pas configuré : renseignez SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS et SMTP_FROM dans le fichier .env.");
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
  await transporteur().sendMail({
    from: expediteur(),
    to: params.a,
    replyTo: params.repondreA ?? undefined,
    subject: params.objet,
    text: params.texte,
    attachments: params.piecesJointes?.map((p) => ({ filename: p.nom, content: p.contenu, contentType: p.type })),
  });
}
