-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "TypePersonne" AS ENUM ('PHYSIQUE', 'MORALE');

-- CreateEnum
CREATE TYPE "TypeLot" AS ENUM ('APPARTEMENT', 'MAISON');

-- CreateEnum
CREATE TYPE "CategorieDocument" AS ENUM ('PIECE_IDENTITE', 'AVIS_IMPOSITION', 'LETTRE_RECOMMANDATION', 'JUSTIFICATIF_DOMICILE', 'JUSTIFICATIF_REVENUS', 'AUTRE');

-- CreateEnum
CREATE TYPE "TypeBail" AS ENUM ('NON_MEUBLE', 'MEUBLE', 'MOBILITE');

-- CreateEnum
CREATE TYPE "StatutBail" AS ENUM ('BROUILLON', 'EN_SIGNATURE', 'SIGNE', 'TERMINE');

-- CreateEnum
CREATE TYPE "TypeCourrier" AS ENUM ('REVISION_LOYER', 'RELANCE', 'AUTRE');

-- CreateEnum
CREATE TYPE "ModePaiement" AS ENUM ('VIREMENT', 'PRELEVEMENT', 'CHEQUE', 'ESPECES', 'AUTRE');

-- CreateEnum
CREATE TYPE "CategorieDepense" AS ENUM ('REPARATION_ENTRETIEN', 'AMELIORATION', 'GESTION_LOCATIVE', 'COPROPRIETE', 'ASSURANCE_PNO', 'TAXE_FONCIERE', 'INTERETS_EMPRUNT', 'AUTRE');

-- CreateTable
CREATE TABLE "Bailleur" (
    "id" SERIAL NOT NULL,
    "typePersonne" "TypePersonne" NOT NULL DEFAULT 'PHYSIQUE',
    "nom" TEXT NOT NULL,
    "representant" TEXT,
    "adresse" TEXT NOT NULL,
    "complementAdresse" TEXT,
    "codePostal" TEXT NOT NULL,
    "ville" TEXT NOT NULL,
    "email" TEXT,
    "telephone" TEXT,
    "siren" TEXT,
    "iban" TEXT,
    "bic" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Bailleur_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Immeuble" (
    "id" SERIAL NOT NULL,
    "nom" TEXT NOT NULL,
    "adresse" TEXT NOT NULL,
    "complementAdresse" TEXT,
    "codePostal" TEXT NOT NULL,
    "ville" TEXT NOT NULL,
    "notes" TEXT,
    "bailleurId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Immeuble_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lot" (
    "id" SERIAL NOT NULL,
    "type" "TypeLot" NOT NULL,
    "nom" TEXT NOT NULL,
    "adresse" TEXT NOT NULL,
    "complementAdresse" TEXT,
    "codePostal" TEXT NOT NULL,
    "ville" TEXT NOT NULL,
    "etage" TEXT,
    "surface" DOUBLE PRECISION,
    "nbPieces" INTEGER,
    "meuble" BOOLEAN NOT NULL DEFAULT false,
    "loyerIndicatif" DOUBLE PRECISION,
    "chargesIndicatives" DOUBLE PRECISION,
    "description" TEXT,
    "bailleurId" INTEGER,
    "immeubleId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Locataire" (
    "id" SERIAL NOT NULL,
    "civilite" TEXT,
    "nom" TEXT NOT NULL,
    "prenom" TEXT NOT NULL,
    "dateNaissance" TIMESTAMP(3),
    "adresse" TEXT,
    "complementAdresse" TEXT,
    "codePostal" TEXT,
    "ville" TEXT,
    "telephone" TEXT,
    "email" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Locataire_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" SERIAL NOT NULL,
    "locataireId" INTEGER NOT NULL,
    "categorie" "CategorieDocument" NOT NULL,
    "libelle" TEXT,
    "nomFichier" TEXT NOT NULL,
    "chemin" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "taille" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bail" (
    "id" SERIAL NOT NULL,
    "lotId" INTEGER NOT NULL,
    "locataireId" INTEGER NOT NULL,
    "type" "TypeBail" NOT NULL,
    "statut" "StatutBail" NOT NULL DEFAULT 'BROUILLON',
    "dateDebut" TIMESTAMP(3) NOT NULL,
    "dateFin" TIMESTAMP(3) NOT NULL,
    "loyerHC" DOUBLE PRECISION NOT NULL,
    "charges" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "chargesForfait" BOOLEAN NOT NULL DEFAULT false,
    "depotGarantie" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "jourEcheance" INTEGER NOT NULL DEFAULT 1,
    "motifMobilite" TEXT,
    "clauseRevision" BOOLEAN NOT NULL DEFAULT true,
    "irlTrimestre" TEXT,
    "irlValeur" DOUBLE PRECISION,
    "texteContrat" TEXT,
    "signatureRef" TEXT,
    "dateSignature" TIMESTAMP(3),
    "dateFinEffective" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Bail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RevisionLoyer" (
    "id" SERIAL NOT NULL,
    "bailId" INTEGER NOT NULL,
    "dateEffet" TIMESTAMP(3) NOT NULL,
    "ancienLoyer" DOUBLE PRECISION NOT NULL,
    "nouveauLoyer" DOUBLE PRECISION NOT NULL,
    "irlAncienTrimestre" TEXT,
    "irlAncienValeur" DOUBLE PRECISION NOT NULL,
    "irlNouveauTrimestre" TEXT,
    "irlNouveauValeur" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RevisionLoyer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Courrier" (
    "id" SERIAL NOT NULL,
    "bailId" INTEGER NOT NULL,
    "type" "TypeCourrier" NOT NULL DEFAULT 'AUTRE',
    "objet" TEXT NOT NULL,
    "contenu" TEXT NOT NULL,
    "dateEnvoi" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Courrier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppelLoyer" (
    "id" SERIAL NOT NULL,
    "bailId" INTEGER NOT NULL,
    "periode" TEXT NOT NULL,
    "debutPeriode" TIMESTAMP(3) NOT NULL,
    "finPeriode" TIMESTAMP(3) NOT NULL,
    "dateEmission" TIMESTAMP(3) NOT NULL,
    "dateEcheance" TIMESTAMP(3) NOT NULL,
    "loyer" DOUBLE PRECISION NOT NULL,
    "charges" DOUBLE PRECISION NOT NULL,
    "total" DOUBLE PRECISION NOT NULL,
    "prorata" BOOLEAN NOT NULL DEFAULT false,
    "dateEnvoiAvis" TIMESTAMP(3),
    "dateEnvoiQuittance" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AppelLoyer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Paiement" (
    "id" SERIAL NOT NULL,
    "appelId" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "montant" DOUBLE PRECISION NOT NULL,
    "mode" "ModePaiement" NOT NULL DEFAULT 'VIREMENT',
    "reference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Paiement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Depense" (
    "id" SERIAL NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "libelle" TEXT NOT NULL,
    "categorie" "CategorieDepense" NOT NULL,
    "montant" DOUBLE PRECISION NOT NULL,
    "fournisseur" TEXT,
    "notes" TEXT,
    "lotId" INTEGER,
    "immeubleId" INTEGER,
    "justificatifNom" TEXT,
    "justificatifChemin" TEXT,
    "justificatifMime" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Depense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Emprunt" (
    "id" SERIAL NOT NULL,
    "libelle" TEXT NOT NULL,
    "banque" TEXT,
    "reference" TEXT,
    "montantInitial" DOUBLE PRECISION NOT NULL,
    "tauxAnnuel" DOUBLE PRECISION,
    "dureeMois" INTEGER,
    "dateDebut" TIMESTAMP(3),
    "assuranceMensuelle" DOUBLE PRECISION,
    "notes" TEXT,
    "lotId" INTEGER,
    "immeubleId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Emprunt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EcheanceEmprunt" (
    "id" SERIAL NOT NULL,
    "empruntId" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "capital" DOUBLE PRECISION NOT NULL,
    "interets" DOUBLE PRECISION NOT NULL,
    "assurance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total" DOUBLE PRECISION NOT NULL,
    "capitalRestant" DOUBLE PRECISION,

    CONSTRAINT "EcheanceEmprunt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AppelLoyer_bailId_periode_key" ON "AppelLoyer"("bailId", "periode");

-- CreateIndex
CREATE INDEX "EcheanceEmprunt_empruntId_date_idx" ON "EcheanceEmprunt"("empruntId", "date");

-- AddForeignKey
ALTER TABLE "Immeuble" ADD CONSTRAINT "Immeuble_bailleurId_fkey" FOREIGN KEY ("bailleurId") REFERENCES "Bailleur"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lot" ADD CONSTRAINT "Lot_bailleurId_fkey" FOREIGN KEY ("bailleurId") REFERENCES "Bailleur"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lot" ADD CONSTRAINT "Lot_immeubleId_fkey" FOREIGN KEY ("immeubleId") REFERENCES "Immeuble"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_locataireId_fkey" FOREIGN KEY ("locataireId") REFERENCES "Locataire"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bail" ADD CONSTRAINT "Bail_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "Lot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bail" ADD CONSTRAINT "Bail_locataireId_fkey" FOREIGN KEY ("locataireId") REFERENCES "Locataire"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RevisionLoyer" ADD CONSTRAINT "RevisionLoyer_bailId_fkey" FOREIGN KEY ("bailId") REFERENCES "Bail"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Courrier" ADD CONSTRAINT "Courrier_bailId_fkey" FOREIGN KEY ("bailId") REFERENCES "Bail"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppelLoyer" ADD CONSTRAINT "AppelLoyer_bailId_fkey" FOREIGN KEY ("bailId") REFERENCES "Bail"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Paiement" ADD CONSTRAINT "Paiement_appelId_fkey" FOREIGN KEY ("appelId") REFERENCES "AppelLoyer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Depense" ADD CONSTRAINT "Depense_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "Lot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Depense" ADD CONSTRAINT "Depense_immeubleId_fkey" FOREIGN KEY ("immeubleId") REFERENCES "Immeuble"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Emprunt" ADD CONSTRAINT "Emprunt_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "Lot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Emprunt" ADD CONSTRAINT "Emprunt_immeubleId_fkey" FOREIGN KEY ("immeubleId") REFERENCES "Immeuble"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EcheanceEmprunt" ADD CONSTRAINT "EcheanceEmprunt_empruntId_fkey" FOREIGN KEY ("empruntId") REFERENCES "Emprunt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

