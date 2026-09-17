import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const sendResend = vi.fn();
vi.mock("resend", () => ({
  Resend: class {
    emails = { send: sendResend };
  },
}));

const sendMail = vi.fn();
vi.mock("nodemailer", () => ({
  default: { createTransport: () => ({ sendMail }) },
}));

const VARS = ["RESEND_API_KEY", "MAIL_FROM", "SMTP_FROM", "SMTP_HOST", "SMTP_PORT", "SMTP_SECURE", "SMTP_USER", "SMTP_PASS"];

async function charger() {
  vi.resetModules();
  return import("@/lib/mail");
}

describe("mail : choix du fournisseur", () => {
  beforeEach(() => {
    for (const v of VARS) vi.stubEnv(v, "");
    sendResend.mockReset();
    sendMail.mockReset();
  });
  afterEach(() => vi.unstubAllEnvs());

  it("est désactivé sans configuration", async () => {
    const mail = await charger();
    expect(mail.fournisseurMail()).toBeNull();
    expect(mail.mailConfigure()).toBe(false);
    expect(mail.libelleFournisseurMail()).toBe("Non configuré");
    await expect(mail.envoyerEmail({ a: "x@y.fr", objet: "o", texte: "t" })).rejects.toThrow(/pas configuré/);
  });

  it("préfère Resend dès que la clé est renseignée", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test");
    vi.stubEnv("MAIL_FROM", "Gestion <gestion@exemple.fr>");
    vi.stubEnv("SMTP_HOST", "smtp.exemple.fr");
    const mail = await charger();
    expect(mail.fournisseurMail()).toBe("resend");
    expect(mail.libelleFournisseurMail()).toBe("Resend");
    expect(mail.expediteur()).toBe("Gestion <gestion@exemple.fr>");
  });

  it("retombe sur SMTP sans clé Resend et accepte SMTP_FROM comme expéditeur", async () => {
    vi.stubEnv("SMTP_HOST", "smtp.exemple.fr");
    vi.stubEnv("SMTP_FROM", "ancien@exemple.fr");
    const mail = await charger();
    expect(mail.fournisseurMail()).toBe("smtp");
    expect(mail.expediteur()).toBe("ancien@exemple.fr");
  });

  it("n'active pas SMTP sans adresse d'expédition", async () => {
    vi.stubEnv("SMTP_HOST", "smtp.exemple.fr");
    const mail = await charger();
    expect(mail.fournisseurMail()).toBeNull();
  });
});

describe("mail : envoi", () => {
  beforeEach(() => {
    for (const v of VARS) vi.stubEnv(v, "");
    sendResend.mockReset();
    sendMail.mockReset();
  });
  afterEach(() => vi.unstubAllEnvs());

  it("envoie via Resend avec réponse-à et pièces jointes", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test");
    vi.stubEnv("MAIL_FROM", "gestion@exemple.fr");
    sendResend.mockResolvedValue({ data: { id: "email_1" }, error: null });
    const mail = await charger();
    const pdf = Buffer.from("%PDF-1.4");
    await mail.envoyerEmail({ a: "locataire@exemple.fr", objet: "Avis", texte: "Bonjour", repondreA: "bailleur@exemple.fr", piecesJointes: [{ nom: "avis.pdf", contenu: pdf, type: "application/pdf" }] });
    expect(sendResend).toHaveBeenCalledTimes(1);
    expect(sendResend.mock.calls[0][0]).toEqual({
      from: "gestion@exemple.fr",
      to: "locataire@exemple.fr",
      replyTo: "bailleur@exemple.fr",
      subject: "Avis",
      text: "Bonjour",
      attachments: [{ filename: "avis.pdf", content: pdf, contentType: "application/pdf" }],
    });
    expect(sendMail).not.toHaveBeenCalled();
  });

  it("remonte l'erreur renvoyée par Resend", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test");
    vi.stubEnv("MAIL_FROM", "gestion@exemple.fr");
    sendResend.mockResolvedValue({ data: null, error: { name: "validation_error", message: "Domaine non vérifié" } });
    const mail = await charger();
    await expect(mail.envoyerEmail({ a: "l@exemple.fr", objet: "o", texte: "t" })).rejects.toThrow("Resend : Domaine non vérifié");
  });

  it("exige une adresse d'expédition avec Resend", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test");
    const mail = await charger();
    await expect(mail.envoyerEmail({ a: "l@exemple.fr", objet: "o", texte: "t" })).rejects.toThrow(/MAIL_FROM/);
    expect(sendResend).not.toHaveBeenCalled();
  });

  it("envoie via SMTP sans clé Resend", async () => {
    vi.stubEnv("SMTP_HOST", "smtp.exemple.fr");
    vi.stubEnv("MAIL_FROM", "gestion@exemple.fr");
    sendMail.mockResolvedValue({});
    const mail = await charger();
    await mail.envoyerEmail({ a: "l@exemple.fr", objet: "Quittance", texte: "Bonjour" });
    expect(sendMail).toHaveBeenCalledTimes(1);
    expect(sendMail.mock.calls[0][0]).toMatchObject({ from: "gestion@exemple.fr", to: "l@exemple.fr", subject: "Quittance", text: "Bonjour", replyTo: undefined });
    expect(sendResend).not.toHaveBeenCalled();
  });

  it("refuse un destinataire vide", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test");
    vi.stubEnv("MAIL_FROM", "gestion@exemple.fr");
    const mail = await charger();
    await expect(mail.envoyerEmail({ a: "", objet: "o", texte: "t" })).rejects.toThrow(/destinataire/);
  });
});
