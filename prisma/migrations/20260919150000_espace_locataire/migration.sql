-- Espace locataire : jeton d'accès personnel du locataire et exemplaire signé du contrat sur le bail.
-- AlterTable
ALTER TABLE "Locataire" ADD COLUMN     "accesCreeLe" TIMESTAMP(3),
ADD COLUMN     "accesDernierLe" TIMESTAMP(3),
ADD COLUMN     "accesEnvoyeLe" TIMESTAMP(3),
ADD COLUMN     "accesJeton" TEXT;

-- AlterTable
ALTER TABLE "Bail" ADD COLUMN     "contratSigneChemin" TEXT,
ADD COLUMN     "contratSigneLe" TIMESTAMP(3),
ADD COLUMN     "contratSigneMime" TEXT,
ADD COLUMN     "contratSigneNom" TEXT,
ADD COLUMN     "contratSigneTaille" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "Locataire_accesJeton_key" ON "Locataire"("accesJeton");

