import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { texteParam, type SearchParams } from "@/lib/params";
import { nomComplet } from "@/lib/libelles";
import { ButtonLink, Card, EmptyState, Filtres, PageHeader, Segments, Tableau, TableauPied, Td, Th } from "@/components/ui";
import { Input } from "@/components/form";
import { FiltresForm } from "@/components/filtres-form";
import { Flash } from "@/components/flash";
import { Avatar, BadgeStatutLocataire, STATUTS_LOCATAIRE, bailCourant, statutLocataire, type StatutLocataire } from "@/components/locataires/statut-locataire";
import { entiteCouranteId } from "@/lib/entite";

export const metadata = { title: "Locataires" };

const STATUTS: StatutLocataire[] = ["EN_PLACE", "CANDIDAT", "ANCIEN"];
const normaliser = (s: string) => s.toLocaleLowerCase("fr-FR").normalize("NFD").replace(/[\u0300-\u036f]/g, "");

export default async function LocatairesPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const q = texteParam(sp, "q")?.trim() ?? "";
  const filtre = texteParam(sp, "statut") as StatutLocataire | null;
  const statut = filtre && STATUTS.includes(filtre) ? filtre : null;

  const tous = await prisma.locataire.findMany({
    where: { entiteId: await entiteCouranteId() },
    orderBy: [{ nom: "asc" }, { prenom: "asc" }],
    include: { _count: { select: { documents: true } }, baux: { orderBy: { dateDebut: "desc" }, include: { lot: { select: { id: true, nom: true } } } } },
  });
  const lignes = tous.map((l) => ({ l, statut: statutLocataire(l.baux), bail: bailCourant(l.baux) }));
  const nb = (s: StatutLocataire) => lignes.filter((x) => x.statut === s).length;
  const recherche = normaliser(q);
  const filtrees = lignes.filter(
    (x) =>
      (!statut || x.statut === statut) &&
      (!recherche || [`${x.l.prenom} ${x.l.nom}`, `${x.l.nom} ${x.l.prenom}`, x.l.email ?? ""].some((v) => normaliser(v).includes(recherche))),
  );

  const lien = (s: StatutLocataire | null) => {
    const p = new URLSearchParams();
    if (s) p.set("statut", s);
    if (q) p.set("q", q);
    const qs = p.toString();
    return `/locataires${qs ? `?${qs}` : ""}`;
  };
  const pluriel = (n: number, un: string, plusieurs: string) => `${n} ${n > 1 ? plusieurs : un}`;
  const resume = `${nb("EN_PLACE")} en place · ${pluriel(nb("CANDIDAT"), "candidat", "candidats")} · ${pluriel(nb("ANCIEN"), "ancien", "anciens")}`;

  return (
    <>
      <PageHeader titre="Locataires" sousTitre={resume} actions={<ButtonLink href="/locataires/nouveau">Nouveau locataire</ButtonLink>} />
      <Flash sp={sp} />
      {tous.length === 0 ? (
        <EmptyState titre="Aucun locataire" description="Créez un locataire pour constituer son dossier puis lui attribuer un bail." action={<ButtonLink href="/locataires/nouveau">Nouveau locataire</ButtonLink>} />
      ) : (
        <>
          <Filtres>
            <Segments items={[{ href: lien(null), libelle: "Tous", actif: !statut }, ...STATUTS.map((s) => ({ href: lien(s), libelle: STATUTS_LOCATAIRE[s], actif: statut === s }))]} />
            <FiltresForm>
              {statut && <input type="hidden" name="statut" value={statut} />}
              <Input name="q" type="search" defaultValue={q} placeholder="Rechercher un nom, un email…" aria-label="Rechercher" className="min-w-[260px]" />
              <button type="submit" className="sr-only">Rechercher</button>
            </FiltresForm>
          </Filtres>
          {filtrees.length === 0 ? (
            <EmptyState titre="Aucun locataire" description={q ? `Aucun locataire ne correspond à « ${q} ».` : "Aucun locataire dans cette catégorie."} action={<ButtonLink href={lien(null)} variante="secondary">Afficher tous les locataires</ButtonLink>} />
          ) : (
            <Card>
              <Tableau>
                <thead className="bg-slate-50">
                  <tr><Th>Locataire</Th><Th>Contact</Th><Th>Lot</Th><Th droite>Dossier</Th><Th>Statut</Th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtrees.map(({ l, statut: s, bail }) => (
                    <tr key={l.id} className="hover:bg-slate-50">
                      <Td>
                        <div className="flex items-center gap-2.5">
                          <Avatar p={l} />
                          <Link href={`/locataires/${l.id}`} className="whitespace-nowrap font-semibold text-navy-900 hover:underline">{nomComplet(l)}</Link>
                        </div>
                      </Td>
                      <Td className="text-slate-600">
                        {l.email || l.telephone ? (
                          <>
                            {l.email && <span className="block">{l.email}</span>}
                            {l.telephone && <span className="block text-xs">{l.telephone}</span>}
                          </>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </Td>
                      <Td className="whitespace-nowrap text-slate-600">{bail ? <Link href={`/lots/${bail.lot.id}`} className="hover:underline">{bail.lot.nom}</Link> : <span className="text-slate-400">—</span>}</Td>
                      <Td droite className="text-slate-600">{l._count.documents}</Td>
                      <Td><BadgeStatutLocataire statut={s} /></Td>
                    </tr>
                  ))}
                </tbody>
              </Tableau>
              <TableauPied>{pluriel(filtrees.length, "locataire", "locataires")} · page 1 sur 1</TableauPied>
            </Card>
          )}
        </>
      )}
    </>
  );
}
