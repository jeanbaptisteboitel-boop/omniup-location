import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ces paquets lisent des fichiers sur disque (polices PDF, etc.) : on ne les bundle pas.
  serverExternalPackages: ["pdfkit", "exceljs", "nodemailer", "@prisma/client"],
  // Polices standard de pdfkit à embarquer dans les fonctions Vercel : pdfkit les charge à l'exécution
  // (require('#standard-fonts/Helvetica')), ce que la trace automatique ne détecte pas. Sans cette ligne,
  // toute génération de PDF échoue en production (« Cannot find module '#standard-fonts/Helvetica' »).
  outputFileTracingIncludes: {
    "/**": ["./node_modules/pdfkit/js/standard-fonts/**", "./node_modules/pdfkit/js/data/**"],
  },
  experimental: {
    serverActions: {
      // Import de justificatifs et d'échéanciers via le serveur (en local ; sur Vercel, les fichiers
      // volumineux sont envoyés directement au stockage objet).
      bodySizeLimit: "25mb",
    },
  },
};

export default nextConfig;
