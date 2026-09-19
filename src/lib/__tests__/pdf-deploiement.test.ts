import { existsSync, readFileSync, readdirSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Garde-fou de déploiement : pdfkit charge ses polices standard à l'exécution (require('#standard-fonts/…')),
 * invisible pour la trace automatique de Vercel. next.config.ts doit donc embarquer explicitement ce dossier.
 */
describe("déploiement des PDF", () => {
  const racine = path.resolve(__dirname, "../../..");
  const config = readFileSync(path.join(racine, "next.config.ts"), "utf8");
  const inclusions = Array.from(config.matchAll(/"(\.\/node_modules\/pdfkit\/[^"]+)\/\*\*"/g)).map((m) => m[1]);

  it("embarque le dossier des polices standard de pdfkit", () => {
    const requirePdfkit = createRequire(path.join(racine, "node_modules/pdfkit/package.json"));
    const helvetica = requirePdfkit.resolve("#standard-fonts/Helvetica");
    const dossier = path.dirname(helvetica);
    expect(readdirSync(dossier).some((f) => f.startsWith("Helvetica-Bold") || f.startsWith("HelveticaBold"))).toBe(true);
    const couvert = inclusions.some((inc) => (helvetica + path.sep).startsWith(path.join(racine, inc) + path.sep) || helvetica.startsWith(path.join(racine, inc) + path.sep));
    expect(couvert, `next.config.ts doit inclure ${path.relative(racine, dossier)}/** (inclusions : ${inclusions.join(", ")})`).toBe(true);
    expect(existsSync(path.join(dossier, "chunks"))).toBe(true);
  });

  it("pdfkit reste un paquet externe (non regroupé) pour lire ses fichiers sur disque", () => {
    expect(config).toMatch(/serverExternalPackages:\s*\[[^\]]*"pdfkit"/);
  });
});
