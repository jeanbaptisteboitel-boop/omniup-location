import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { idDepuis, type ParamsId, type SearchParams } from "@/lib/params";
import { CATEGORIES_DEPENSE, TYPES_BAIL_COURT, TYPES_LOT, TYPES_PERSONNE, adresseSurUneLigne } from "@/lib/libelles";
import { formatDate } from "@/lib/dates";
import { formatEuros, somme } from "@/lib/montants";
import { formatSurface } from "@/components/patrimoine/surface";
import { supprimerLot } from "@/actions/lots";
import { Badge, Button, ButtonLink, Card, CardBody, CardHeader, Infos, PageHeader, Tableau, Td, Th } from "@/components/ui";
import { ConfirmForm } from "@/components/confirm-form";
import { Flash } from "@/components/flash";
import { BadgeStatutBail } from "@/components/baux/badge-statut";
import { entiteCouranteId } from "@/lib/entite";
import { includeLocataires, nomsLocataires } from "@/lib/locataires";

export default async function LotPage({ params, searchParams }: { params: ParamsId; searchParams: SearchParams }) {
  const id = await idDepuis(params);
  const sp = await searchParams;
  const lot = await prisma.lot.findFirst({
    where: { id, entiteId: await entiteCouranteId() },
    include: {
      bailleur: true,
      immeuble: true,
      baux: { orderBy: { dateDebut: "desc" }, include: { locataires: includeLocataires } },
      depenses: { orderBy: { date: "desc" }, take: 10 },
      emprunts: { orderBy: { libelle: "asc" } },
      _count: { select: { depenses: true } },
    },
  });
  if (!lot) notFound();
  const bailActif = lot.baux.find((b) => b.statut === "SIGNE");
  const nouveauBail = `/baux/nouveau?lotId=${lot.id}`;

  return (
    <>
      <PageHeader
        titre={lot.nom}
        badge={bailActif ? <Badge ton="vert">Loué</Badge> : <Badge ton="orange">Vacant</Badge>}
        sousTitre={[lot.immeuble?.nom, adresseSurUneLigne(lot)].filter(Boolean).join(" · ")}
        retour={{ href: "/lots", libelle: "Lots" }}
        actions={
          <>
            <ButtonLink href={`/lots/${lot.id}/modifier`} variante="secondary">Modifier</ButtonLink>
            {!bailActif && <ButtonLink href={nouveauBail}>Créer un bail</ButtonLink>}
            <ConfirmForm
              action={supprimerLot}
              titre="Supprimer ce lot ?"
              libelleConfirmer="Supprimer définitivement"
              message={`« ${lot.nom} » sera retiré de votre patrimoine. Cette action est irréversible ; un lot rattaché à des baux, des dépenses ou des emprunts ne peut pas être supprimé.`}
            >
              <input type="hidden" name="id" value={lot.id} />
              <Button type="submit" variante="danger">Supprimer</Button>
            </ConfirmForm>
          </>
        }
      />
      <Flash sp={sp} />
      <div className="space-y-6">
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[repeat(auto-fit,minmax(320px,1fr))]">
          <Card>
            <CardHeader titre="Informations" />
            <CardBody>
              <Infos
                items={[
                  { label: "Type", valeur: `${TYPES_LOT[lot.type]}${lot.meuble ? " meublé" : ""}` },
                  { label: "Surface", valeur: formatSurface(lot.surface) },
                  { label: "Pièces", valeur: lot.nbPieces },
                  { label: "Étage", valeur: lot.etage },
                  { label: "Loyer hors charges", valeur: lot.loyerIndicatif !== null ? formatEuros(lot.loyerIndicatif) : null },
                  { label: "Charges", valeur: lot.chargesIndicatives !== null ? formatEuros(lot.chargesIndicatives) : null },
                  { label: "Immeuble", valeur: lot.immeuble ? <Link href={`/immeubles/${lot.immeuble.id}`} className="text-navy-800 hover:underline">{lot.immeuble.nom}</Link> : null },
                  { label: "Adresse", valeur: adresseSurUneLigne(lot) },
                  ...(lot.description ? [{ label: "Description", valeur: <span className="whitespace-pre-line">{lot.description}</span> }] : []),
                ]}
              />
            </CardBody>
          </Card>

          <div className="flex flex-col gap-6">
            <Card>
              <CardHeader titre="Bail en cours" />
              {bailActif ? (
                <Link href={`/baux/${bailActif.id}`} className="flex items-center justify-between gap-3 px-5 py-4 text-slate-900 hover:bg-slate-50">
                  <span className="min-w-0">
                    <span className="block font-semibold text-navy-900">{nomsLocataires(bailActif.locataires)}</span>
                    <span className="block text-[13px] text-slate-500">
                      {TYPES_BAIL_COURT[bailActif.type]} · du {formatDate(bailActif.dateDebut)} au {formatDate(bailActif.dateFinEffective ?? bailActif.dateFin)}
                    </span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block font-semibold tabular-nums">{formatEuros(bailActif.loyerHC + bailActif.charges)}</span>
                    <span className="block text-xs text-slate-500">charges comprises</span>
                  </span>
                </Link>
              ) : (
                <div className="px-5 py-6 text-center">
                  <p className="text-sm font-semibold text-navy-900">Lot vacant</p>
                  <p className="mb-3 mt-1 text-[13px] text-slate-500">Aucun bail actif. Créez un bail pour remettre le lot en location.</p>
                  <ButtonLink href={nouveauBail}>Créer un bail</ButtonLink>
                </div>
              )}
            </Card>

            <Card>
              <CardHeader titre="Bailleur" />
              <div className="px-5 py-4 text-sm">
                {lot.bailleur ? (
                  <>
                    <Link href={`/bailleurs/${lot.bailleur.id}`} className="font-semibold text-navy-900 hover:underline">{lot.bailleur.nom}</Link>
                    <p className="mt-0.5 text-[13px] text-slate-500">
                      {TYPES_PERSONNE[lot.bailleur.typePersonne]} · {adresseSurUneLigne(lot.bailleur)}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="font-semibold text-amber-700">À définir</p>
                    <p className="mt-0.5 text-[13px] text-slate-500">
                      Nécessaire pour les avis d'échéance et les quittances : <Link href={`/lots/${lot.id}/modifier`} className="text-navy-800 underline">rattachez un bailleur</Link>.
                    </p>
                  </>
                )}
              </div>
            </Card>
          </div>
        </div>

        <Card>
          <CardHeader titre="Historique des baux" actions={bailActif && <ButtonLink href={nouveauBail} taille="sm" variante="secondary">Nouveau bail</ButtonLink>} />
          {lot.baux.length === 0 ? (
            <CardBody><p className="text-sm text-slate-500">Aucun bail pour ce lot. Créez un locataire puis un bail.</p></CardBody>
          ) : (
            <Tableau>
              <thead className="bg-slate-50">
                <tr>
                  <Th>Locataire</Th>
                  <Th>Type</Th>
                  <Th>Début</Th>
                  <Th>Fin</Th>
                  <Th droite>Loyer HC</Th>
                  <Th>Statut</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {lot.baux.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50">
                    <Td><Link href={`/baux/${b.id}`} className="whitespace-nowrap font-semibold text-navy-900 hover:underline">{nomsLocataires(b.locataires)}</Link></Td>
                    <Td className="text-slate-600">{TYPES_BAIL_COURT[b.type]}</Td>
                    <Td className="text-slate-600 tabular-nums">{formatDate(b.dateDebut)}</Td>
                    <Td className="text-slate-600 tabular-nums">{formatDate(b.dateFinEffective ?? b.dateFin)}</Td>
                    <Td droite>{formatEuros(b.loyerHC)}</Td>
                    <Td><BadgeStatutBail statut={b.statut} /></Td>
                  </tr>
                ))}
              </tbody>
            </Tableau>
          )}
        </Card>

        <Card>
          <CardHeader titre={`Dépenses (${lot._count.depenses})`} actions={<ButtonLink href={`/depenses/nouveau?lotId=${lot.id}`} taille="sm" variante="secondary">Ajouter une dépense</ButtonLink>} />
          {lot.depenses.length === 0 ? (
            <CardBody><p className="text-sm text-slate-500">Aucune dépense enregistrée pour ce lot.</p></CardBody>
          ) : (
            <Tableau>
              <thead className="bg-slate-50">
                <tr>
                  <Th>Date</Th>
                  <Th>Libellé</Th>
                  <Th>Catégorie</Th>
                  <Th droite>Montant</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {lot.depenses.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50">
                    <Td className="text-slate-600 tabular-nums">{formatDate(d.date)}</Td>
                    <Td><Link href={`/depenses/${d.id}/modifier`} className="font-semibold text-navy-900 hover:underline">{d.libelle}</Link></Td>
                    <Td className="text-slate-600">{CATEGORIES_DEPENSE[d.categorie]}</Td>
                    <Td droite className="font-semibold">{formatEuros(d.montant)}</Td>
                  </tr>
                ))}
                <tr className="bg-slate-50 font-semibold">
                  <Td className="py-2!" />
                  <Td className="whitespace-nowrap py-2!">Total des {lot.depenses.length} dernières</Td>
                  <Td className="py-2!" />
                  <Td droite className="py-2!">{formatEuros(somme(lot.depenses.map((d) => d.montant)))}</Td>
                </tr>
              </tbody>
            </Tableau>
          )}
        </Card>

        {lot.emprunts.length > 0 && (
          <Card>
            <CardHeader titre={`Emprunts (${lot.emprunts.length})`} />
            <Tableau>
              <thead className="bg-slate-50">
                <tr>
                  <Th>Libellé</Th>
                  <Th>Banque</Th>
                  <Th droite>Montant initial</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {lot.emprunts.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-50">
                    <Td><Link href={`/emprunts/${e.id}`} className="font-semibold text-navy-900 hover:underline">{e.libelle}</Link></Td>
                    <Td className="text-slate-600">{e.banque ?? "—"}</Td>
                    <Td droite className="font-semibold">{formatEuros(e.montantInitial)}</Td>
                  </tr>
                ))}
              </tbody>
            </Tableau>
          </Card>
        )}
      </div>
    </>
  );
}
