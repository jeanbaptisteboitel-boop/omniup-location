-- Types de lots et de baux hors habitation (locaux commerciaux et professionnels, location saisonnière)
ALTER TYPE "TypeLot" ADD VALUE 'LOCAL_COMMERCIAL';
ALTER TYPE "TypeLot" ADD VALUE 'LOCAL_PROFESSIONNEL';
ALTER TYPE "TypeBail" ADD VALUE 'COMMERCIAL';
ALTER TYPE "TypeBail" ADD VALUE 'PROFESSIONNEL';
ALTER TYPE "TypeBail" ADD VALUE 'SAISONNIER';

-- Option pour la TVA sur les loyers : immeuble, puis lot ; taux appliqué au bail ; TVA des appels de loyer
ALTER TABLE "Bailleur" ADD COLUMN "numeroTva" TEXT;
ALTER TABLE "Immeuble" ADD COLUMN "optionTva" BOOLEAN NOT NULL DEFAULT false, ADD COLUMN "optionTvaDate" TIMESTAMP(3);
ALTER TABLE "Lot" ADD COLUMN "optionTva" BOOLEAN NOT NULL DEFAULT false, ADD COLUMN "optionTvaDate" TIMESTAMP(3);
ALTER TABLE "Bail" ADD COLUMN "tauxTva" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "AppelLoyer" ADD COLUMN "tauxTva" DOUBLE PRECISION NOT NULL DEFAULT 0, ADD COLUMN "montantTva" DOUBLE PRECISION NOT NULL DEFAULT 0;
