import { texteParam, type SearchParams } from "@/lib/params";
import { Calculatrices } from "@/components/outils/calculatrices";
import { PageHeader } from "@/components/ui";

export const metadata = { title: "Calculatrices" };

export default async function OutilsPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  return (
    <>
      <PageHeader titre="Calculatrices" sousTitre="Résultats instantanés, indicatifs. Les montants sont arrondis au centime." />
      <Calculatrices initial={texteParam(sp, "onglet") ?? undefined} />
    </>
  );
}
