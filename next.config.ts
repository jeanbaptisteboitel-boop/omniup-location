import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ces paquets lisent des fichiers sur disque (polices PDF, etc.) : on ne les bundle pas.
  serverExternalPackages: ["pdfkit", "exceljs", "nodemailer", "@prisma/client"],
  // Polices standard de pdfkit à embarquer dans les fonctions Vercel.
  outputFileTracingIncludes: {
    "/**": ["./node_modules/pdfkit/js/data/**"],
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
