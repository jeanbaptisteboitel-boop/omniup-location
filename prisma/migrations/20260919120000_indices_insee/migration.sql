-- CreateEnum
CREATE TYPE "FrequenceSerie" AS ENUM ('M', 'Q', 'A');

-- CreateTable
CREATE TABLE "IndiceSerie" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "idbank" TEXT NOT NULL,
    "libelle" TEXT NOT NULL,
    "libelleInsee" TEXT,
    "frequence" "FrequenceSerie" NOT NULL,
    "unite" TEXT,
    "base" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "derniereSync" TIMESTAMP(3),
    "dernierePeriode" TEXT,
    "echecsConsecutifs" INTEGER NOT NULL DEFAULT 0,
    "dernierEchec" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IndiceSerie_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IndiceObservation" (
    "id" SERIAL NOT NULL,
    "serieId" INTEGER NOT NULL,
    "periode" TEXT NOT NULL,
    "debutPeriode" TIMESTAMP(3) NOT NULL,
    "valeur" DECIMAL(18,6) NOT NULL,
    "statut" TEXT,
    "publieLe" TIMESTAMP(3),
    "recupereLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IndiceObservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IndiceRevision" (
    "id" SERIAL NOT NULL,
    "serieId" INTEGER NOT NULL,
    "periode" TEXT NOT NULL,
    "ancienneValeur" DECIMAL(18,6) NOT NULL,
    "nouvelleValeur" DECIMAL(18,6) NOT NULL,
    "ancienStatut" TEXT,
    "nouveauStatut" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IndiceRevision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IndiceSynchronisation" (
    "id" SERIAL NOT NULL,
    "declencheur" TEXT NOT NULL,
    "debut" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fin" TIMESTAMP(3),
    "seriesInterrogees" INTEGER NOT NULL DEFAULT 0,
    "observationsCreees" INTEGER NOT NULL DEFAULT 0,
    "observationsMisesAJour" INTEGER NOT NULL DEFAULT 0,
    "erreurs" TEXT,
    "alertes" TEXT,

    CONSTRAINT "IndiceSynchronisation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "IndiceSerie_idbank_key" ON "IndiceSerie"("idbank");

-- CreateIndex
CREATE INDEX "IndiceSerie_code_active_idx" ON "IndiceSerie"("code", "active");

-- CreateIndex
CREATE INDEX "IndiceObservation_serieId_debutPeriode_idx" ON "IndiceObservation"("serieId", "debutPeriode");

-- CreateIndex
CREATE UNIQUE INDEX "IndiceObservation_serieId_periode_key" ON "IndiceObservation"("serieId", "periode");

-- CreateIndex
CREATE INDEX "IndiceRevision_serieId_createdAt_idx" ON "IndiceRevision"("serieId", "createdAt");

-- AddForeignKey
ALTER TABLE "IndiceObservation" ADD CONSTRAINT "IndiceObservation_serieId_fkey" FOREIGN KEY ("serieId") REFERENCES "IndiceSerie"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IndiceRevision" ADD CONSTRAINT "IndiceRevision_serieId_fkey" FOREIGN KEY ("serieId") REFERENCES "IndiceSerie"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Séries suivies par défaut (idbanks du brief, libellés INSEE confirmés lors de la première synchronisation).
INSERT INTO "IndiceSerie" ("code", "idbank", "libelle", "frequence", "unite", "base", "updatedAt") VALUES
  ('IRL', '001515333', 'Indice de référence des loyers (IRL)', 'Q', 'indice', 'base 100 au 4e trimestre 1998', CURRENT_TIMESTAMP),
  ('ILC', '001532540', 'Indice des loyers commerciaux (ILC)', 'Q', 'indice', 'base 100 au 1er trimestre 2008', CURRENT_TIMESTAMP),
  ('ILAT', '001617112', 'Indice des loyers des activités tertiaires (ILAT)', 'Q', 'indice', 'base 100 au 1er trimestre 2010', CURRENT_TIMESTAMP),
  ('ICC', '000008630', 'Indice du coût de la construction (ICC)', 'Q', 'indice', 'base 100 au 4e trimestre 1953', CURRENT_TIMESTAMP),
  ('BT01', '001710986', 'Index bâtiment tous corps d''état (BT01)', 'M', 'indice', 'base 100 en 2010', CURRENT_TIMESTAMP)
ON CONFLICT ("idbank") DO NOTHING;
