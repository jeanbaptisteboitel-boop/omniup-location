-- Sortie du locataire, suivi du dépôt de garantie, assurance habitation et demandes de maintenance
CREATE TYPE "OrigineConge" AS ENUM ('LOCATAIRE', 'BAILLEUR');
CREATE TYPE "CategorieMaintenance" AS ENUM ('PLOMBERIE', 'ELECTRICITE', 'CHAUFFAGE', 'SERRURERIE', 'MENUISERIE', 'ELECTROMENAGER', 'DEGAT_EAUX', 'NUISIBLES', 'PARTIES_COMMUNES', 'AUTRE');
CREATE TYPE "UrgenceMaintenance" AS ENUM ('NORMALE', 'URGENTE', 'TRES_URGENTE');
CREATE TYPE "StatutMaintenance" AS ENUM ('NOUVELLE', 'PRISE_EN_COMPTE', 'PLANIFIEE', 'RESOLUE', 'REFUSEE');
CREATE TYPE "AuteurMessage" AS ENUM ('LOCATAIRE', 'GESTIONNAIRE');

ALTER TABLE "Bail"
  ADD COLUMN "depotRecuLe" TIMESTAMP(3),
  ADD COLUMN "depotRecuMontant" DOUBLE PRECISION,
  ADD COLUMN "depotRecuMode" "ModePaiement",
  ADD COLUMN "depotRecuReference" TEXT,
  ADD COLUMN "depotRestitueLe" TIMESTAMP(3),
  ADD COLUMN "depotRestitueMontant" DOUBLE PRECISION,
  ADD COLUMN "depotRestitueMode" "ModePaiement",
  ADD COLUMN "congeRecuLe" TIMESTAMP(3),
  ADD COLUMN "congeOrigine" "OrigineConge",
  ADD COLUMN "congeMotif" TEXT,
  ADD COLUMN "congePreavisMois" INTEGER,
  ADD COLUMN "congeDateDepart" TIMESTAMP(3),
  ADD COLUMN "etatLieuxSortieLe" TIMESTAMP(3),
  ADD COLUMN "etatLieuxConforme" BOOLEAN,
  ADD COLUMN "assuranceDemandeeLe" TIMESTAMP(3),
  ADD COLUMN "assuranceRelanceLe" TIMESTAMP(3);

CREATE TABLE "RetenueDepot" (
    "id" SERIAL NOT NULL,
    "bailId" INTEGER NOT NULL,
    "libelle" TEXT NOT NULL,
    "montant" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RetenueDepot_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "RetenueDepot_bailId_idx" ON "RetenueDepot"("bailId");
ALTER TABLE "RetenueDepot" ADD CONSTRAINT "RetenueDepot_bailId_fkey" FOREIGN KEY ("bailId") REFERENCES "Bail"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "AttestationAssurance" (
    "id" SERIAL NOT NULL,
    "bailId" INTEGER NOT NULL,
    "locataireId" INTEGER,
    "compagnie" TEXT,
    "numeroPolice" TEXT,
    "dateDebut" TIMESTAMP(3),
    "dateEcheance" TIMESTAMP(3) NOT NULL,
    "nomFichier" TEXT,
    "chemin" TEXT,
    "mimeType" TEXT,
    "taille" INTEGER,
    "deposeParLocataire" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AttestationAssurance_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "AttestationAssurance_bailId_idx" ON "AttestationAssurance"("bailId");
ALTER TABLE "AttestationAssurance" ADD CONSTRAINT "AttestationAssurance_bailId_fkey" FOREIGN KEY ("bailId") REFERENCES "Bail"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AttestationAssurance" ADD CONSTRAINT "AttestationAssurance_locataireId_fkey" FOREIGN KEY ("locataireId") REFERENCES "Locataire"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "DemandeMaintenance" (
    "id" SERIAL NOT NULL,
    "entiteId" INTEGER NOT NULL,
    "bailId" INTEGER NOT NULL,
    "lotId" INTEGER NOT NULL,
    "locataireId" INTEGER,
    "objet" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "categorie" "CategorieMaintenance" NOT NULL DEFAULT 'AUTRE',
    "urgence" "UrgenceMaintenance" NOT NULL DEFAULT 'NORMALE',
    "statut" "StatutMaintenance" NOT NULL DEFAULT 'NOUVELLE',
    "interventionLe" TIMESTAMP(3),
    "clotureeLe" TIMESTAMP(3),
    "luLocataireLe" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "DemandeMaintenance_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "DemandeMaintenance_entiteId_idx" ON "DemandeMaintenance"("entiteId");
CREATE INDEX "DemandeMaintenance_bailId_idx" ON "DemandeMaintenance"("bailId");
ALTER TABLE "DemandeMaintenance" ADD CONSTRAINT "DemandeMaintenance_entiteId_fkey" FOREIGN KEY ("entiteId") REFERENCES "Entite"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DemandeMaintenance" ADD CONSTRAINT "DemandeMaintenance_bailId_fkey" FOREIGN KEY ("bailId") REFERENCES "Bail"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DemandeMaintenance" ADD CONSTRAINT "DemandeMaintenance_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "Lot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DemandeMaintenance" ADD CONSTRAINT "DemandeMaintenance_locataireId_fkey" FOREIGN KEY ("locataireId") REFERENCES "Locataire"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "MessageMaintenance" (
    "id" SERIAL NOT NULL,
    "demandeId" INTEGER NOT NULL,
    "auteur" "AuteurMessage" NOT NULL,
    "texte" TEXT NOT NULL,
    "nomFichier" TEXT,
    "chemin" TEXT,
    "mimeType" TEXT,
    "taille" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MessageMaintenance_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "MessageMaintenance_demandeId_idx" ON "MessageMaintenance"("demandeId");
ALTER TABLE "MessageMaintenance" ADD CONSTRAINT "MessageMaintenance_demandeId_fkey" FOREIGN KEY ("demandeId") REFERENCES "DemandeMaintenance"("id") ON DELETE CASCADE ON UPDATE CASCADE;
