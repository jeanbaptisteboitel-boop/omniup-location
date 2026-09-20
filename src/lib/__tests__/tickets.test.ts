import { afterEach, describe, expect, it } from "vitest";
import { adresseAssistance, numeroTicket, resumeNavigateur, ticketOuvert } from "../tickets";

describe("tickets d'assistance", () => {
  afterEach(() => {
    delete process.env.SUPPORT_EMAIL;
    delete process.env.ALERTES_EMAIL;
  });

  it("numérote les tickets sur cinq chiffres", () => {
    expect(numeroTicket(1)).toBe("T-00001");
    expect(numeroTicket(1234)).toBe("T-01234");
  });

  it("distingue les tickets ouverts des tickets clos", () => {
    expect(ticketOuvert({ statut: "NOUVEAU" })).toBe(true);
    expect(ticketOuvert({ statut: "EN_COURS" })).toBe(true);
    expect(ticketOuvert({ statut: "RESOLU" })).toBe(false);
    expect(ticketOuvert({ statut: "FERME" })).toBe(false);
  });

  it("prend l'adresse d'assistance, sinon celle des alertes", () => {
    expect(adresseAssistance()).toBeNull();
    process.env.ALERTES_EMAIL = "alertes@exemple.fr";
    expect(adresseAssistance()).toBe("alertes@exemple.fr");
    process.env.SUPPORT_EMAIL = "support@exemple.fr";
    expect(adresseAssistance()).toBe("support@exemple.fr");
    process.env.SUPPORT_EMAIL = "   ";
    expect(adresseAssistance()).toBe("alertes@exemple.fr");
  });

  it("résume le navigateur et le système", () => {
    expect(resumeNavigateur("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")).toBe("Chrome 120 · Windows");
    expect(resumeNavigateur("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15")).toBe("Safari 17 · macOS");
    expect(resumeNavigateur("Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1")).toBe("Safari 17 · iOS");
    expect(resumeNavigateur("Mozilla/5.0 (X11; Linux x86_64; rv:121.0) Gecko/20100101 Firefox/121.0")).toBe("Firefox 121 · Linux");
    expect(resumeNavigateur("Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0")).toBe("Edge 120 · Windows");
    expect(resumeNavigateur("")).toBeNull();
    expect(resumeNavigateur(null)).toBeNull();
    expect(resumeNavigateur("un-agent-inconnu")).toBe("un-agent-inconnu");
  });
});
