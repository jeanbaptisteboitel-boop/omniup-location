-- Tickets d'assistance : demande d'aide, signalement de bug, proposition de fonctionnalité
CREATE TYPE "TypeTicket" AS ENUM ('AIDE', 'BUG', 'FONCTIONNALITE');
CREATE TYPE "StatutTicket" AS ENUM ('NOUVEAU', 'EN_COURS', 'RESOLU', 'FERME');

CREATE TABLE "Ticket" (
    "id" SERIAL NOT NULL,
    "entiteId" INTEGER,
    "utilisateurId" INTEGER,
    "auteurNom" TEXT NOT NULL,
    "auteurEmail" TEXT,
    "type" "TypeTicket" NOT NULL,
    "objet" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "page" TEXT,
    "navigateur" TEXT,
    "statut" "StatutTicket" NOT NULL DEFAULT 'NOUVEAU',
    "suivi" TEXT,
    "suiviLe" TIMESTAMP(3),
    "nomFichier" TEXT,
    "chemin" TEXT,
    "mimeType" TEXT,
    "taille" INTEGER,
    "envoyeLe" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Ticket_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Ticket_entiteId_idx" ON "Ticket"("entiteId");
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_entiteId_fkey" FOREIGN KEY ("entiteId") REFERENCES "Entite"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES "Utilisateur"("id") ON DELETE SET NULL ON UPDATE CASCADE;
