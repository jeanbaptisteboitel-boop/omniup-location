import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { idDepuis, type ParamsId } from "@/lib/params";
import { avecMessage } from "@/lib/erreurs";
import { ajouterAnnees, toISODate } from "@/lib/dates";
import { reviserLoyer } from "@/actions/baux";
import { RevisionForm } from "@/components/baux/revision-form";
import { Card, PageHeader } from "@/components/ui";
import { entiteCouranteId } from "@/lib/entite";
import { includeLocataires, nomsLocataires } from "@/lib/locataires";

export const metadata = { title: "Révision du loyer" };

export default async function RevisionPage({ params }: { params: ParamsId }) {
  const id = await idDepuis(params);
  const b = await prisma.bail.findFirst({ where: { id, entiteId: await entiteCouranteId() }, include: { lot: true, locataires: includeLocataires, revisions: { orderBy: { dateEffet: "desc" }, take: 1 } } });
  if (!b) notFound();
  if (b.type === "MOBILITE") redirect(avecMessage(`/baux/${id}`, "Le loyer d'un bail mobilité ne peut pas être révisé.", "erreur"));
  const proposee = ajouterAnnees(b.revisions[0]?.dateEffet ?? b.dateDebut, 1);
  return (
    <>
      <PageHeader titre="Révision du loyer" sousTitre={`${b.lot.nom} · ${nomsLocataires(b.locataires)}`} retour={{ href: `/baux/${b.id}`, libelle: "Bail" }} />
      <Card className="max-w-[520px]">
        <RevisionForm action={reviserLoyer.bind(null, b.id)} loyerActuel={b.loyerHC} irlTrimestre={b.irlTrimestre} irlValeur={b.irlValeur} dateEffetProposee={toISODate(proposee)} annulerHref={`/baux/${b.id}`} />
      </Card>
    </>
  );
}
