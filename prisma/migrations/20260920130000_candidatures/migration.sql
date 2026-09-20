-- Candidatures à la location : dossier du candidat et de ses cautions, justificatifs du décret du 5 novembre 2015

CREATE TYPE "StatutCandidature" AS ENUM ('BROUILLON', 'TRANSMISE', 'DEPOSEE', 'ACCEPTEE', 'CONCLUE', 'REFUSEE', 'RETIREE');
CREATE TYPE "RoleDossier" AS ENUM ('CANDIDAT', 'GARANT');
CREATE TYPE "SituationCandidat" AS ENUM ('CDI', 'CDI_ESSAI', 'CDD', 'INTERIM', 'FONCTIONNAIRE', 'INDEPENDANT', 'RETRAITE', 'ETUDIANT', 'ALTERNANT', 'SANS_EMPLOI', 'AUTRE');
CREATE TYPE "TypeGarantie" AS ENUM ('AUCUNE', 'PERSONNE_PHYSIQUE', 'PERSONNE_MORALE', 'VISALE', 'ASSURANCE_LOYERS_IMPAYES');
CREATE TYPE "CategoriePiece" AS ENUM ('IDENTITE', 'DOMICILE', 'ACTIVITE', 'RESSOURCES');
CREATE TYPE "StatutPiece" AS ENUM ('DEPOSEE', 'VALIDEE', 'REFUSEE');

CREATE TABLE "Candidature" (
  "id" SERIAL NOT NULL,
  "entiteId" INTEGER NOT NULL,
  "lotId" INTEGER,
  "statut" "StatutCandidature" NOT NULL DEFAULT 'BROUILLON',
  "loyerAnnonce" DOUBLE PRECISION,
  "chargesAnnonce" DOUBLE PRECISION,
  "dateSouhaitee" TIMESTAMP(3),
  "typeGarantie" "TypeGarantie",
  "assuranceLoyersImpayes" BOOLEAN NOT NULL DEFAULT false,
  "deposeLe" TIMESTAMP(3),
  "decisionLe" TIMESTAMP(3),
  "motifRefus" TEXT,
  "notes" TEXT,
  "bailId" INTEGER,
  "concluLe" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Candidature_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DossierCandidature" (
  "id" SERIAL NOT NULL,
  "candidatureId" INTEGER NOT NULL,
  "role" "RoleDossier" NOT NULL DEFAULT 'CANDIDAT',
  "garantDeId" INTEGER,
  "personneMorale" BOOLEAN NOT NULL DEFAULT false,
  "civilite" TEXT,
  "nom" TEXT NOT NULL,
  "prenom" TEXT,
  "raisonSociale" TEXT,
  "dateNaissance" TIMESTAMP(3),
  "lieuNaissance" TEXT,
  "email" TEXT,
  "telephone" TEXT,
  "adresse" TEXT,
  "complementAdresse" TEXT,
  "codePostal" TEXT,
  "ville" TEXT,
  "situation" "SituationCandidat",
  "employeur" TEXT,
  "poste" TEXT,
  "depuisLe" TIMESTAMP(3),
  "finContratLe" TIMESTAMP(3),
  "revenuMensuel" DOUBLE PRECISION,
  "autresRevenus" DOUBLE PRECISION,
  "detailAutresRevenus" TEXT,
  "chargesMensuelles" DOUBLE PRECISION,
  "locataireId" INTEGER,
  "complet" BOOLEAN NOT NULL DEFAULT false,
  "accesJeton" TEXT,
  "accesCreeLe" TIMESTAMP(3),
  "accesEnvoyeLe" TIMESTAMP(3),
  "accesDernierLe" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DossierCandidature_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PieceCandidature" (
  "id" SERIAL NOT NULL,
  "dossierId" INTEGER NOT NULL,
  "categorie" "CategoriePiece" NOT NULL,
  "code" TEXT NOT NULL,
  "statut" "StatutPiece" NOT NULL DEFAULT 'DEPOSEE',
  "motifRefus" TEXT,
  "nomFichier" TEXT NOT NULL,
  "chemin" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "taille" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PieceCandidature_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Candidature_entiteId_idx" ON "Candidature"("entiteId");
CREATE INDEX "Candidature_lotId_idx" ON "Candidature"("lotId");
CREATE INDEX "DossierCandidature_candidatureId_idx" ON "DossierCandidature"("candidatureId");
CREATE INDEX "DossierCandidature_garantDeId_idx" ON "DossierCandidature"("garantDeId");
CREATE UNIQUE INDEX "DossierCandidature_accesJeton_key" ON "DossierCandidature"("accesJeton");
CREATE INDEX "PieceCandidature_dossierId_idx" ON "PieceCandidature"("dossierId");

ALTER TABLE "Candidature" ADD CONSTRAINT "Candidature_entiteId_fkey" FOREIGN KEY ("entiteId") REFERENCES "Entite"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Candidature" ADD CONSTRAINT "Candidature_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "Lot"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Candidature" ADD CONSTRAINT "Candidature_bailId_fkey" FOREIGN KEY ("bailId") REFERENCES "Bail"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "DossierCandidature" ADD CONSTRAINT "DossierCandidature_locataireId_fkey" FOREIGN KEY ("locataireId") REFERENCES "Locataire"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "DossierCandidature" ADD CONSTRAINT "DossierCandidature_candidatureId_fkey" FOREIGN KEY ("candidatureId") REFERENCES "Candidature"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DossierCandidature" ADD CONSTRAINT "DossierCandidature_garantDeId_fkey" FOREIGN KEY ("garantDeId") REFERENCES "DossierCandidature"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PieceCandidature" ADD CONSTRAINT "PieceCandidature_dossierId_fkey" FOREIGN KEY ("dossierId") REFERENCES "DossierCandidature"("id") ON DELETE CASCADE ON UPDATE CASCADE;
