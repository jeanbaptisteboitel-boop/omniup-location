import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/sidebar";

export const metadata: Metadata = {
  title: { default: "OMNIUP Location", template: "%s · OMNIUP Location" },
  description: "Gestion locative : lots, locataires, baux, loyers, quittances, dépenses et emprunts.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="min-h-screen">
        <div className="flex min-h-screen flex-col lg:flex-row">
          <Sidebar />
          <main className="min-w-0 flex-1">
            <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-10 lg:py-8">{children}</div>
          </main>
        </div>
      </body>
    </html>
  );
}
