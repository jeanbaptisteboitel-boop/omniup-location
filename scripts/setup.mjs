// Prépare une installation locale : fichier .env, dossier de stockage, base de données.
import { existsSync, copyFileSync, mkdirSync } from "node:fs";
import { spawnSync } from "node:child_process";

if (!existsSync(".env")) {
  copyFileSync(".env.example", ".env");
  console.log("✔ Fichier .env créé à partir de .env.example (à compléter si besoin).");
}
mkdirSync("storage", { recursive: true });

const npx = process.platform === "win32" ? "npx.cmd" : "npx";
const result = spawnSync(npx, ["prisma", "migrate", "deploy"], { stdio: "inherit", shell: process.platform === "win32" });
if (result.status !== 0) {
  console.error("✘ La création de la base de données a échoué.");
  process.exit(result.status ?? 1);
}
console.log("✔ Base de données prête. Lancez : npm run dev");
