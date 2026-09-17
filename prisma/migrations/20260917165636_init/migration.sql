-- CreateTable
CREATE TABLE "Bailleur" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "typePersonne" TEXT NOT NULL DEFAULT 'PHYSIQUE',
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Immeuble" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nom" TEXT NOT NULL,
    "adresse" TEXT NOT NULL,
    "complementAdresse" TEXT,
    "codePostal" TEXT NOT NULL,
    "ville" TEXT NOT NULL,
    "notes" TEXT,
    "bailleurId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Immeuble_bailleurId_fkey" FOREIGN KEY ("bailleurId") REFERENCES "Bailleur" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Lot" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "type" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "adresse" TEXT NOT NULL,
    "complementAdresse" TEXT,
    "codePostal" TEXT NOT NULL,
    "ville" TEXT NOT NULL,
    "etage" TEXT,
    "surface" REAL,
    "nbPieces" INTEGER,
    "meuble" BOOLEAN NOT NULL DEFAULT false,
    "loyerIndicatif" REAL,
    "chargesIndicatives" REAL,
    "description" TEXT,
    "bailleurId" INTEGER,
    "immeubleId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Lot_bailleurId_fkey" FOREIGN KEY ("bailleurId") REFERENCES "Bailleur" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Lot_immeubleId_fkey" FOREIGN KEY ("immeubleId") REFERENCES "Immeuble" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Locataire" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "civilite" TEXT,
    "nom" TEXT NOT NULL,
    "prenom" TEXT NOT NULL,
    "dateNaissance" DATETIME,
    "adresse" TEXT,
    "complementAdresse" TEXT,
    "codePostal" TEXT,
    "ville" TEXT,
    "telephone" TEXT,
    "email" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Document" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "locataireId" INTEGER NOT NULL,
    "categorie" TEXT NOT NULL,
    "libelle" TEXT,
    "nomFichier" TEXT NOT NULL,
    "chemin" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "taille" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Document_locataireId_fkey" FOREIGN KEY ("locataireId") REFERENCES "Locataire" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Bail" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "lotId" INTEGER NOT NULL,
    "locataireId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'BROUILLON',
    "dateDebut" DATETIME NOT NULL,
    "dateFin" DATETIME NOT NULL,
    "loyerHC" REAL NOT NULL,
    "charges" REAL NOT NULL DEFAULT 0,
    "chargesForfait" BOOLEAN NOT NULL DEFAULT false,
    "depotGarantie" REAL NOT NULL DEFAULT 0,
    "jourEcheance" INTEGER NOT NULL DEFAULT 1,
    "motifMobilite" TEXT,
    "clauseRevision" BOOLEAN NOT NULL DEFAULT true,
    "irlTrimestre" TEXT,
    "irlValeur" REAL,
    "texteContrat" TEXT,
    "signatureRef" TEXT,
    "dateSignature" DATETIME,
    "dateFinEffective" DATETIME,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Bail_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "Lot" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Bail_locataireId_fkey" FOREIGN KEY ("locataireId") REFERENCES "Locataire" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RevisionLoyer" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "bailId" INTEGER NOT NULL,
    "dateEffet" DATETIME NOT NULL,
    "ancienLoyer" REAL NOT NULL,
    "nouveauLoyer" REAL NOT NULL,
    "irlAncienTrimestre" TEXT,
    "irlAncienValeur" REAL NOT NULL,
    "irlNouveauTrimestre" TEXT,
    "irlNouveauValeur" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RevisionLoyer_bailId_fkey" FOREIGN KEY ("bailId") REFERENCES "Bail" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Courrier" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "bailId" INTEGER NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'AUTRE',
    "objet" TEXT NOT NULL,
    "contenu" TEXT NOT NULL,
    "dateEnvoi" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Courrier_bailId_fkey" FOREIGN KEY ("bailId") REFERENCES "Bail" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AppelLoyer" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "bailId" INTEGER NOT NULL,
    "periode" TEXT NOT NULL,
    "debutPeriode" DATETIME NOT NULL,
    "finPeriode" DATETIME NOT NULL,
    "dateEmission" DATETIME NOT NULL,
    "dateEcheance" DATETIME NOT NULL,
    "loyer" REAL NOT NULL,
    "charges" REAL NOT NULL,
    "total" REAL NOT NULL,
    "prorata" BOOLEAN NOT NULL DEFAULT false,
    "dateEnvoiAvis" DATETIME,
    "dateEnvoiQuittance" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AppelLoyer_bailId_fkey" FOREIGN KEY ("bailId") REFERENCES "Bail" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Paiement" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "appelId" INTEGER NOT NULL,
    "date" DATETIME NOT NULL,
    "montant" REAL NOT NULL,
    "mode" TEXT NOT NULL DEFAULT 'VIREMENT',
    "reference" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Paiement_appelId_fkey" FOREIGN KEY ("appelId") REFERENCES "AppelLoyer" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Depense" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "date" DATETIME NOT NULL,
    "libelle" TEXT NOT NULL,
    "categorie" TEXT NOT NULL,
    "montant" REAL NOT NULL,
    "fournisseur" TEXT,
    "notes" TEXT,
    "lotId" INTEGER,
    "immeubleId" INTEGER,
    "justificatifNom" TEXT,
    "justificatifChemin" TEXT,
    "justificatifMime" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Depense_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "Lot" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Depense_immeubleId_fkey" FOREIGN KEY ("immeubleId") REFERENCES "Immeuble" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Emprunt" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "libelle" TEXT NOT NULL,
    "banque" TEXT,
    "reference" TEXT,
    "montantInitial" REAL NOT NULL,
    "tauxAnnuel" REAL,
    "dureeMois" INTEGER,
    "dateDebut" DATETIME,
    "assuranceMensuelle" REAL,
    "notes" TEXT,
    "lotId" INTEGER,
    "immeubleId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Emprunt_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "Lot" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Emprunt_immeubleId_fkey" FOREIGN KEY ("immeubleId") REFERENCES "Immeuble" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EcheanceEmprunt" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "empruntId" INTEGER NOT NULL,
    "date" DATETIME NOT NULL,
    "capital" REAL NOT NULL,
    "interets" REAL NOT NULL,
    "assurance" REAL NOT NULL DEFAULT 0,
    "total" REAL NOT NULL,
    "capitalRestant" REAL,
    CONSTRAINT "EcheanceEmprunt_empruntId_fkey" FOREIGN KEY ("empruntId") REFERENCES "Emprunt" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "AppelLoyer_bailId_periode_key" ON "AppelLoyer"("bailId", "periode");

-- CreateIndex
CREATE INDEX "EcheanceEmprunt_empruntId_date_idx" ON "EcheanceEmprunt"("empruntId", "date");
