import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { entierParam, idDepuis, type ParamsId, type SearchParams } from "@/lib/params";
import { TYPES_BAIL_COURT, nomComplet } from "@/lib/libelles";
import { formatDate } from "@/lib/dates";
import { entiteCouranteId } from "@/lib/entite";
import { genererDocument } from "@/actions/modeles";
import { GenererForm } from "@/components/modeles/generer-form";
import { Alerte, Card, CardBody, PageHeader } from "@/components/ui";

export const metadata = { title: "Générer un document" };

export default async function GenererPage({ params, searchParams }: { params: ParamsId; searchParams: SearchParams }) {
  const id = await idDepuis(params);
  const sp = await searchParams;
  const [m, baux] = await Promise.all([
    prisma.modeleDocument.findUnique({ where: { id } }),
    prisma.bail.findMany({ where: { entiteId: await entiteCouranteId() }, include: { lot: true, locataire: true }, orderBy: [{ statut: "asc" }, { dateDebut: "desc" }] }),
  ]);
  if (!m) notFound();
  const bailId = entierParam(sp, "bailId");
  return (
    <>
      <PageHeader titre={`Générer : ${m.nom}`} sousTitre={m.description ?? undefined} retour={{ href: bailId ? `/baux/${bailId}` : `/modeles/${m.id}`, libelle: bailId ? "Bail" : "Modèle" }} />
      <div className="mb-4">
        <Alerte ton="bleu">Le document généré est enregistré dans « Documents », rattaché au bail choisi. Vous pourrez ensuite le compléter, le faire adapter par l'assistant IA, le télécharger en PDF et l'envoyer par email.</Alerte>
      </div>
      <Card>
        <CardBody>
          <GenererForm
            action={genererDocument.bind(null, m.id)}
            baux={baux.map((b) => ({ id: b.id, libelle: `${b.lot.nom} — ${nomComplet(b.locataire)} (${TYPES_BAIL_COURT[b.type].toLowerCase()}, du ${formatDate(b.dateDebut)})` }))}
            bailIdInitial={bailId}
            titreInitial={m.nom}
            annulerHref={bailId ? `/baux/${bailId}` : "/modeles"}
          />
        </CardBody>
      </Card>
    </>
  );
}
