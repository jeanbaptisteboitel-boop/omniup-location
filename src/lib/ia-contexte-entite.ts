import "server-only";
import { prisma } from "./prisma";
import { entiteCourante } from "./entite";
import { STATUTS_BAIL, TYPES_BAIL_COURT, TYPES_ENTITE } from "./libelles";
import { aujourdhui, formatDate, formatPeriode } from "./dates";
import { formatEuros } from "./montants";
import { etatAppel } from "./loyers";
import { includeLocataires, nomsLocataires } from "@/lib/locataires";

/** Résumé de l'entité de travail pour l'assistant conversationnel (taille bornée). */
export async function contexteEntite(): Promise<string> {
  const entite = await entiteCourante();
  const auj = aujourdhui();
  const [lots, baux, appels, nbLocataires, nbBailleurs] = await Promise.all([
    prisma.lot.findMany({ where: { entiteId: entite.id }, include: { bailleur: true, baux: { where: { statut: "SIGNE" }, include: { locataires: includeLocataires } } }, orderBy: { nom: "asc" }, take: 60 }),
    prisma.bail.findMany({ where: { entiteId: entite.id, statut: { in: ["BROUILLON", "EN_SIGNATURE"] } }, include: { lot: true, locataires: includeLocataires }, take: 20 }),
    prisma.appelLoyer.findMany({ where: { bail: { entiteId: entite.id } }, include: { paiements: true, bail: { include: { lot: true, locataires: includeLocataires } } }, orderBy: { periode: "desc" }, take: 200 }),
    prisma.locataire.count({ where: { entiteId: entite.id } }),
    prisma.bailleur.count({ where: { entiteId: entite.id } }),
  ]);
  const retards = appels.map((a) => ({ a, e: etatAppel(a, auj) })).filter((x) => x.e.statut === "EN_RETARD").slice(0, 15);
  const lignes = [
    `Entité : ${entite.nom} (${TYPES_ENTITE[entite.type]})${entite.notes ? ` — ${entite.notes}` : ""}`,
    `Date du jour : ${formatDate(auj)}`,
    `${nbBailleurs} bailleur(s), ${lots.length} lot(s), ${nbLocataires} locataire(s).`,
    "",
    "Lots :",
    ...lots.map((l) => {
      const b = l.baux[0];
      return `- ${l.nom} (${l.adresse}, ${l.codePostal} ${l.ville}${l.meuble ? ", meublé" : ""}${l.bailleur ? `, bailleur ${l.bailleur.nom}` : ""}) : ${b ? `loué à ${nomsLocataires(b.locataires)} — bail ${TYPES_BAIL_COURT[b.type].toLowerCase()} depuis le ${formatDate(b.dateDebut)}, loyer ${formatEuros(b.loyerHC)} HC + ${formatEuros(b.charges)} de charges` : "vacant"}`;
    }),
    ...(baux.length ? ["", "Baux en préparation :", ...baux.map((b) => `- ${b.lot.nom} — ${nomsLocataires(b.locataires)} : ${STATUTS_BAIL[b.statut].toLowerCase()}`)] : []),
    ...(retards.length ? ["", "Loyers en retard :", ...retards.map(({ a, e }) => `- ${formatPeriode(a.periode)} ${a.bail.lot.nom} — ${nomsLocataires(a.bail.locataires)} : reste dû ${formatEuros(e.reste)} (échéance ${formatDate(a.dateEcheance)})`)] : ["", "Aucun loyer en retard."]),
  ];
  return lignes.join("\n").slice(0, 12000);
}
