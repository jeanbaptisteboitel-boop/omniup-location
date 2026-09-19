-- Espace propriétaire (jeton d'accès du bailleur) et comptes utilisateurs avec rôle par entité.
-- CreateEnum
CREATE TYPE "RoleEntite" AS ENUM ('ADMINISTRATEUR', 'GESTIONNAIRE', 'LECTURE');

-- AlterTable
ALTER TABLE "Bailleur" ADD COLUMN     "accesCreeLe" TIMESTAMP(3),
ADD COLUMN     "accesDernierLe" TIMESTAMP(3),
ADD COLUMN     "accesEnvoyeLe" TIMESTAMP(3),
ADD COLUMN     "accesJeton" TEXT;

-- CreateTable
CREATE TABLE "Utilisateur" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "motDePasse" TEXT,
    "superAdmin" BOOLEAN NOT NULL DEFAULT false,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "jetonInvitation" TEXT,
    "jetonExpireLe" TIMESTAMP(3),
    "derniereConnexion" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Utilisateur_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccesEntite" (
    "id" SERIAL NOT NULL,
    "utilisateurId" INTEGER NOT NULL,
    "entiteId" INTEGER NOT NULL,
    "role" "RoleEntite" NOT NULL DEFAULT 'GESTIONNAIRE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccesEntite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Utilisateur_email_key" ON "Utilisateur"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Utilisateur_jetonInvitation_key" ON "Utilisateur"("jetonInvitation");

-- CreateIndex
CREATE INDEX "AccesEntite_entiteId_idx" ON "AccesEntite"("entiteId");

-- CreateIndex
CREATE UNIQUE INDEX "AccesEntite_utilisateurId_entiteId_key" ON "AccesEntite"("utilisateurId", "entiteId");

-- CreateIndex
CREATE UNIQUE INDEX "Bailleur_accesJeton_key" ON "Bailleur"("accesJeton");

-- AddForeignKey
ALTER TABLE "AccesEntite" ADD CONSTRAINT "AccesEntite_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES "Utilisateur"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccesEntite" ADD CONSTRAINT "AccesEntite_entiteId_fkey" FOREIGN KEY ("entiteId") REFERENCES "Entite"("id") ON DELETE CASCADE ON UPDATE CASCADE;

