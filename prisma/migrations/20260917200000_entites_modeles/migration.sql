-- CreateEnum
CREATE TYPE "TypeEntite" AS ENUM ('PERSONNE', 'SOCIETE', 'AUTRE');

-- CreateEnum
CREATE TYPE "CategorieModele" AS ENUM ('BAIL', 'AVENANT', 'RENOUVELLEMENT', 'RESILIATION', 'CAUTION', 'CONVENTION', 'AUTRE');

-- CreateTable
CREATE TABLE "Entite" (
    "id" SERIAL NOT NULL,
    "nom" TEXT NOT NULL,
    "type" "TypeEntite" NOT NULL DEFAULT 'AUTRE',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Entite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModeleDocument" (
    "id" SERIAL NOT NULL,
    "code" TEXT,
    "nom" TEXT NOT NULL,
    "categorie" "CategorieModele" NOT NULL,
    "description" TEXT,
    "contenu" TEXT NOT NULL,
    "parDefaut" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ModeleDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentGenere" (
    "id" SERIAL NOT NULL,
    "entiteId" INTEGER NOT NULL,
    "bailId" INTEGER,
    "modeleId" INTEGER,
    "titre" TEXT NOT NULL,
    "categorie" "CategorieModele" NOT NULL,
    "contenu" TEXT NOT NULL,
    "dateEnvoi" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentGenere_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reglages" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "multiEntites" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Reglages_pkey" PRIMARY KEY ("id")
);

-- Entité par défaut (reprise des données existantes)
INSERT INTO "Entite" ("nom", "type", "updatedAt") VALUES ('Mon entité', 'AUTRE', CURRENT_TIMESTAMP);

-- AlterTable (rattachement des lignes existantes à l'entité par défaut)
ALTER TABLE "Bailleur" ADD COLUMN "entiteId" INTEGER;
UPDATE "Bailleur" SET "entiteId" = (SELECT MIN("id") FROM "Entite");
ALTER TABLE "Bailleur" ALTER COLUMN "entiteId" SET NOT NULL;

-- AlterTable (rattachement des lignes existantes à l'entité par défaut)
ALTER TABLE "Immeuble" ADD COLUMN "entiteId" INTEGER;
UPDATE "Immeuble" SET "entiteId" = (SELECT MIN("id") FROM "Entite");
ALTER TABLE "Immeuble" ALTER COLUMN "entiteId" SET NOT NULL;

-- AlterTable (rattachement des lignes existantes à l'entité par défaut)
ALTER TABLE "Lot" ADD COLUMN "entiteId" INTEGER;
UPDATE "Lot" SET "entiteId" = (SELECT MIN("id") FROM "Entite");
ALTER TABLE "Lot" ALTER COLUMN "entiteId" SET NOT NULL;

-- AlterTable (rattachement des lignes existantes à l'entité par défaut)
ALTER TABLE "Locataire" ADD COLUMN "entiteId" INTEGER;
UPDATE "Locataire" SET "entiteId" = (SELECT MIN("id") FROM "Entite");
ALTER TABLE "Locataire" ALTER COLUMN "entiteId" SET NOT NULL;

-- AlterTable (rattachement des lignes existantes à l'entité par défaut)
ALTER TABLE "Bail" ADD COLUMN "entiteId" INTEGER;
UPDATE "Bail" SET "entiteId" = (SELECT MIN("id") FROM "Entite");
ALTER TABLE "Bail" ALTER COLUMN "entiteId" SET NOT NULL;

-- AlterTable (rattachement des lignes existantes à l'entité par défaut)
ALTER TABLE "Depense" ADD COLUMN "entiteId" INTEGER;
UPDATE "Depense" SET "entiteId" = (SELECT MIN("id") FROM "Entite");
ALTER TABLE "Depense" ALTER COLUMN "entiteId" SET NOT NULL;

-- AlterTable (rattachement des lignes existantes à l'entité par défaut)
ALTER TABLE "Emprunt" ADD COLUMN "entiteId" INTEGER;
UPDATE "Emprunt" SET "entiteId" = (SELECT MIN("id") FROM "Entite");
ALTER TABLE "Emprunt" ALTER COLUMN "entiteId" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "ModeleDocument_code_key" ON "ModeleDocument"("code");

-- CreateIndex
CREATE INDEX "DocumentGenere_entiteId_idx" ON "DocumentGenere"("entiteId");

-- CreateIndex
CREATE INDEX "DocumentGenere_bailId_idx" ON "DocumentGenere"("bailId");

-- CreateIndex
CREATE INDEX "Bailleur_entiteId_idx" ON "Bailleur"("entiteId");

-- CreateIndex
CREATE INDEX "Immeuble_entiteId_idx" ON "Immeuble"("entiteId");

-- CreateIndex
CREATE INDEX "Lot_entiteId_idx" ON "Lot"("entiteId");

-- CreateIndex
CREATE INDEX "Locataire_entiteId_idx" ON "Locataire"("entiteId");

-- CreateIndex
CREATE INDEX "Bail_entiteId_idx" ON "Bail"("entiteId");

-- CreateIndex
CREATE INDEX "Depense_entiteId_idx" ON "Depense"("entiteId");

-- CreateIndex
CREATE INDEX "Emprunt_entiteId_idx" ON "Emprunt"("entiteId");

-- AddForeignKey
ALTER TABLE "DocumentGenere" ADD CONSTRAINT "DocumentGenere_entiteId_fkey" FOREIGN KEY ("entiteId") REFERENCES "Entite"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentGenere" ADD CONSTRAINT "DocumentGenere_bailId_fkey" FOREIGN KEY ("bailId") REFERENCES "Bail"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentGenere" ADD CONSTRAINT "DocumentGenere_modeleId_fkey" FOREIGN KEY ("modeleId") REFERENCES "ModeleDocument"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bailleur" ADD CONSTRAINT "Bailleur_entiteId_fkey" FOREIGN KEY ("entiteId") REFERENCES "Entite"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Immeuble" ADD CONSTRAINT "Immeuble_entiteId_fkey" FOREIGN KEY ("entiteId") REFERENCES "Entite"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lot" ADD CONSTRAINT "Lot_entiteId_fkey" FOREIGN KEY ("entiteId") REFERENCES "Entite"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Locataire" ADD CONSTRAINT "Locataire_entiteId_fkey" FOREIGN KEY ("entiteId") REFERENCES "Entite"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bail" ADD CONSTRAINT "Bail_entiteId_fkey" FOREIGN KEY ("entiteId") REFERENCES "Entite"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Depense" ADD CONSTRAINT "Depense_entiteId_fkey" FOREIGN KEY ("entiteId") REFERENCES "Entite"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Emprunt" ADD CONSTRAINT "Emprunt_entiteId_fkey" FOREIGN KEY ("entiteId") REFERENCES "Entite"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
