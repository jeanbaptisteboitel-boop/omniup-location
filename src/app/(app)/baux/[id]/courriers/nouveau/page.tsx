import { notFound } from "next/navigation";
import type { TypeCourrier } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { entierParam, idDepuis, texteParam, type ParamsId, type SearchParams } from "@/lib/params";
import { nomComplet } from "@/lib/libelles";
import { aujourdhui } from "@/lib/dates";
import { etatAppel } from "@/lib/loyers";
import { iaConfiguree } from "@/lib/ia-config";
import { creerCourrier } from "@/actions/courriers";
import { genererCourrier } from "@/actions/ia";
import { CourrierEditeur } from "@/components/courriers/courrier-editeur";
import { Card, CardBody, PageHeader } from "@/components/ui";
import { entiteCouranteId } from "@/lib/entite";

export const metadata = { title: "Nouveau courrier" };

export default async function NouveauCourrierPage({ params, searchParams }: { params: ParamsId; searchParams: SearchParams }) {
  const id = await idDepuis(params);
  const sp = await searchParams;
  const b = await prisma.bail.findFirst({ where: { id, entiteId: await entiteCouranteId() }, include: { lot: true, locataire: true, revisions: { select: { id: true } }, appels: { include: { paiements: true } } } });
  if (!b) notFound();
  const typeParam = texteParam(sp, "type");
  const type: TypeCourrier = typeParam === "REVISION_LOYER" || typeParam === "RELANCE" ? typeParam : "AUTRE";
  const auj = aujourdhui();
  const aDesImpayes = b.appels.some((a) => {
    const e = etatAppel(a, auj);
    return e.reste > 0 && e.statut !== "A_PAYER";
  });
  return (
    <>
      <PageHeader titre={`Nouveau courrier — ${b.lot.nom}`} sousTitre={`Destinataire : ${nomComplet(b.locataire)}`} retour={{ href: `/baux/${b.id}`, libelle: "Bail" }} />
      <Card>
        <CardBody>
          <CourrierEditeur
            actionEnregistrer={creerCourrier.bind(null, b.id)}
            actionGenerer={genererCourrier.bind(null, b.id)}
            initial={{ type, objet: "", contenu: "" }}
            revisionId={entierParam(sp, "revisionId")}
            iaConfiguree={iaConfiguree()}
            aDesRevisions={b.revisions.length > 0}
            aDesImpayes={aDesImpayes}
            annulerHref={`/baux/${b.id}`}
          />
        </CardBody>
      </Card>
    </>
  );
}

// Durée maximale d'exécution sur Vercel (rédaction IA, OCR, envois d'emails).
export const maxDuration = 300;
