import Link from "next/link";
import { prisma } from "@/lib/prisma";
import type { SearchParams } from "@/lib/params";
import { adresseSurUneLigne } from "@/lib/libelles";
import { formatEuros, somme } from "@/lib/montants";
import { ButtonLink, EmptyState, PageHeader } from "@/components/ui";
import { Flash } from "@/components/flash";
import { entiteCouranteId } from "@/lib/entite";

export const metadata = { title: "Immeubles" };

const pluriel = (n: number) => (n > 1 ? "s" : "");

export default async function ImmeublesPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const immeubles = await prisma.immeuble.findMany({
    where: { entiteId: await entiteCouranteId() },
    orderBy: { nom: "asc" },
    include: { bailleur: { select: { nom: true } }, lots: { select: { id: true, baux: { where: { statut: "SIGNE" }, select: { loyerHC: true, charges: true }, orderBy: { dateDebut: "desc" }, take: 1 } } } },
  });
  const n = immeubles.length;
  return (
    <>
      <PageHeader
        titre="Immeubles"
        sousTitre={n === 0 ? "Regroupent vos lots et vos dépenses communes." : `${n} immeuble${pluriel(n)} · ${n > 1 ? "regroupent" : "regroupe"} vos lots et vos dépenses.`}
        actions={<ButtonLink href="/immeubles/nouveau">Nouvel immeuble</ButtonLink>}
      />
      <Flash sp={sp} />
      {n === 0 ? (
        <EmptyState titre="Aucun immeuble" description="Un immeuble n'est nécessaire que si vous gérez plusieurs lots dans un même bâtiment. Les maisons et appartements isolés se créent directement dans « Lots »." action={<ButtonLink href="/immeubles/nouveau">Créer un immeuble</ButtonLink>} />
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4">
          {immeubles.map((i) => {
            const loues = i.lots.filter((l) => l.baux.length > 0);
            const vacants = i.lots.length - loues.length;
            const loyers = somme(loues.map((l) => l.baux[0].loyerHC + l.baux[0].charges));
            return (
              <Link key={i.id} href={`/immeubles/${i.id}`} className="block rounded-xl border border-slate-200 bg-white px-5 py-[18px] text-slate-900 shadow-card transition-colors hover:border-navy-300">
                <div className="flex items-start justify-between gap-2">
                  <strong className="text-[15px] text-navy-900">{i.nom}</strong>
                  <span className="inline-flex shrink-0 items-center whitespace-nowrap rounded-full bg-navy-50 px-2.5 py-0.5 text-xs font-semibold text-navy-800">
                    {i.lots.length} lot{pluriel(i.lots.length)}
                  </span>
                </div>
                <p className="mb-3 mt-1.5 text-[13px] text-slate-500">
                  {adresseSurUneLigne(i)}
                  {i.bailleur && <span className="block">{i.bailleur.nom}</span>}
                </p>
                <div className="flex justify-between gap-2 border-t border-slate-100 pt-2.5 text-[13px] text-slate-600">
                  <span>
                    {loues.length} loué{pluriel(loues.length)} · {vacants} vacant{pluriel(vacants)}
                  </span>
                  <span className="font-semibold text-navy-900 tabular-nums">{formatEuros(loyers)} / mois</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
