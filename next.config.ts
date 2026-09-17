import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ces paquets lisent des fichiers sur disque (polices PDF, etc.) : on ne les bundle pas.
  serverExternalPackages: ["pdfkit", "exceljs", "nodemailer", "@prisma/client"],
  experimental: {
    serverActions: {
      // Import de pièces d'identité, justificatifs et échéanciers (PDF, images, Excel).
      bodySizeLimit: "25mb",
    },
  },
};

export default nextConfig;
