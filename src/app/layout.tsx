import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "OMNIUP Location", template: "%s · OMNIUP Location" },
  description: "Gestion locative : lots, locataires, baux, loyers, quittances, dépenses et emprunts.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
      </head>
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
