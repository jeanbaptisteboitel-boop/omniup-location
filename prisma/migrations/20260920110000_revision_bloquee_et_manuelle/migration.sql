-- Blocage de la révision du loyer à la demande du bailleur, et révision saisie manuellement
ALTER TABLE "Bail"
  ADD COLUMN "revisionBloquee" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "revisionBlocageLe" TIMESTAMP(3),
  ADD COLUMN "revisionBlocageMotif" TEXT;

ALTER TABLE "RevisionLoyer"
  ADD COLUMN "manuelle" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "motif" TEXT,
  ALTER COLUMN "irlAncienValeur" DROP NOT NULL,
  ALTER COLUMN "irlNouveauValeur" DROP NOT NULL;
