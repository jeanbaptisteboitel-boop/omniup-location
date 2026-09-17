import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { idDepuis, type ParamsId } from "@/lib/params";
import { iaConfiguree } from "@/lib/ia-config";
import { analyserFichierEcheancier, importerEcheancier } from "@/actions/emprunts";
import { ImportEcheancier } from "@/components/emprunts/import-echeancier";
import { Alerte, Card, CardBody, PageHeader } from "@/components/ui";

export const metadata = { title: "Importer un échéancier" };

export default async function ImportEcheancierPage({ params }: { params: ParamsId }) {
  const id = await idDepuis(params);
  const e = await prisma.emprunt.findUnique({ where: { id }, include: { _count: { select: { echeances: true } } } });
  if (!e) notFound();
  return (
    <>
      <PageHeader titre={`Importer l'échéancier — ${e.libelle}`} retour={{ href: `/emprunts/${e.id}`, libelle: e.libelle }} />
      <div className="mb-4">
        <Alerte ton="bleu" titre="Comment faire">
          Exportez le tableau d'amortissement depuis votre espace bancaire (CSV ou Excel) ou fournissez le PDF remis par la banque : l'application lit chaque échéance (date, capital, intérêts, assurance, capital restant dû) pour constater les intérêts d'emprunt année par année.
        </Alerte>
      </div>
      <Card>
        <CardBody>
          <ImportEcheancier actionAnalyser={analyserFichierEcheancier.bind(null, e.id)} actionImporter={importerEcheancier.bind(null, e.id)} iaConfiguree={iaConfiguree()} aDejaDesEcheances={e._count.echeances > 0} />
        </CardBody>
      </Card>
    </>
  );
}
