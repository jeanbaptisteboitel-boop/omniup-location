-- Diagnostic de performance énergétique du lot : étiquettes, valeurs, date et fichier annexé au bail.
-- Obligatoire (article 3-3 de la loi du 6 juillet 1989) mais son absence ne bloque pas la location.

CREATE TYPE "ClasseEnergie" AS ENUM ('A', 'B', 'C', 'D', 'E', 'F', 'G');

ALTER TABLE "Lot"
  ADD COLUMN "dpeClasseEnergie" "ClasseEnergie",
  ADD COLUMN "dpeClasseGes" "ClasseEnergie",
  ADD COLUMN "dpeConsommation" DOUBLE PRECISION,
  ADD COLUMN "dpeEmissions" DOUBLE PRECISION,
  ADD COLUMN "dpeRealiseLe" TIMESTAMP(3),
  ADD COLUMN "dpeNomFichier" TEXT,
  ADD COLUMN "dpeChemin" TEXT,
  ADD COLUMN "dpeMimeType" TEXT,
  ADD COLUMN "dpeTaille" INTEGER;
