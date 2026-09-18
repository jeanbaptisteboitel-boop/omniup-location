import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { idDepuis, type ParamsId } from "@/lib/params";
import { mistralConfigure } from "@/lib/mistral-config";
import { analyserFichierEcheancier, importerEcheancier } from "@/actions/emprunts";
import { ImportEcheancier } from "@/components/emprunts/import-echeancier";
import { ReglesImport } from "@/components/emprunts/regles-import";
import { Card, CardBody, CardHeader, PageHeader } from "@/components/ui";
import { entiteCouranteId } from "@/lib/entite";

export const metadata = { title: "Importer un échéancier" };

export default async function ImportEcheancierPage({ params }: { params: ParamsId }) {
  const id = await idDepuis(params);
  const e = await prisma.emprunt.findFirst({ where: { id, entiteId: await entiteCouranteId() }, include: { _count: { select: { echeances: true } } } });
  if (!e) notFound();
  return (
    <>
      <PageHeader titre="Importer l'échéancier" sousTitre={`${e.libelle}${e.banque ? ` · ${e.banque}` : ""}`} retour={{ href: `/emprunts/${e.id}`, libelle: e.libelle }} />
      <Card className="max-w-3xl">
        <CardHeader titre="Importer l'échéancier" description="Le tableau d'amortissement de la banque est lu automatiquement." />
        <CardBody className="flex flex-col gap-3">
          <ImportEcheancier actionAnalyser={analyserFichierEcheancier.bind(null, e.id)} actionImporter={importerEcheancier.bind(null, e.id)} iaConfiguree={mistralConfigure()} aDejaDesEcheances={e._count.echeances > 0} />
          <ReglesImport />
        </CardBody>
      </Card>
    </>
  );
}

// Durée maximale d'exécution sur Vercel (rédaction IA, OCR, envois d'emails).
export const maxDuration = 300;
