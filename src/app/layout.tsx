import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "OMNIUP Location", template: "%s · OMNIUP Location" },
  description: "Gestion locative : lots, locataires, baux, loyers, quittances, dépenses et emprunts.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
