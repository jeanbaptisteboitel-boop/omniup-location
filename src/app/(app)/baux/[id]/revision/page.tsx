import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { idDepuis, type ParamsId } from "@/lib/params";
import { avecMessage } from "@/lib/erreurs";
import { ajouterAnnees, toISODate } from "@/lib/dates";
import { reviserLoyer } from "@/actions/baux";
import { RevisionForm } from "@/components/baux/revision-form";
import { Alerte, Card, CardBody, PageHeader } from "@/components/ui";
import { entiteCouranteId } from "@/lib/entite";

export const metadata = { title: "Révision du loyer" };

export default async function RevisionPage({ params }: { params: ParamsId }) {
  const id = await idDepuis(params);
  const b = await prisma.bail.findFirst({ where: { id, entiteId: await entiteCouranteId() }, include: { lot: true, revisions: { orderBy: { dateEffet: "desc" }, take: 1 } } });
  if (!b) notFound();
  if (b.type === "MOBILITE") redirect(avecMessage(`/baux/${id}`, "Le loyer d'un bail mobilité ne peut pas être révisé.", "erreur"));
  const proposee = ajouterAnnees(b.revisions[0]?.dateEffet ?? b.dateDebut, 1);
  return (
    <>
      <PageHeader titre={`Révision du loyer — ${b.lot.nom}`} retour={{ href: `/baux/${b.id}`, libelle: "Bail" }} />
      <div className="mb-4">
        <Alerte ton="bleu" titre="Rappel des règles">
          La révision n'est possible qu'une fois par an, à la date prévue au bail (ou à sa date anniversaire), si le bail contient une clause de révision. Elle ne peut excéder la variation de l'IRL sur un an. Si le bailleur ne révise pas dans l'année qui suit la date prévue, il perd le bénéfice de la révision pour l'année écoulée (art. 17-1 de la loi du 6 juillet 1989).
        </Alerte>
      </div>
      <Card>
        <CardBody>
          <RevisionForm action={reviserLoyer.bind(null, b.id)} loyerActuel={b.loyerHC} irlTrimestre={b.irlTrimestre} irlValeur={b.irlValeur} dateEffetProposee={toISODate(proposee)} annulerHref={`/baux/${b.id}`} />
        </CardBody>
      </Card>
    </>
  );
}
