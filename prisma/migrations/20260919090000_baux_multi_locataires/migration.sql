-- Plusieurs locataires par bail (couple, colocation) : la colonne Bail.locataireId devient une table de liaison.

-- CreateTable
CREATE TABLE "_BailLocataires" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_BailLocataires_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_BailLocataires_B_index" ON "_BailLocataires"("B");

-- AddForeignKey
ALTER TABLE "_BailLocataires" ADD CONSTRAINT "_BailLocataires_A_fkey" FOREIGN KEY ("A") REFERENCES "Bail"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_BailLocataires" ADD CONSTRAINT "_BailLocataires_B_fkey" FOREIGN KEY ("B") REFERENCES "Locataire"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Reprise des données : le locataire actuel de chaque bail devient son premier titulaire.
INSERT INTO "_BailLocataires" ("A", "B")
SELECT "id", "locataireId" FROM "Bail"
ON CONFLICT DO NOTHING;

-- DropForeignKey
ALTER TABLE "Bail" DROP CONSTRAINT "Bail_locataireId_fkey";

-- AlterTable
ALTER TABLE "Bail" DROP COLUMN "locataireId";
