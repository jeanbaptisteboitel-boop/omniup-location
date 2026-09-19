"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { echec, messageErreur, succes, type FormState } from "@/lib/forms";
import { avecMessage } from "@/lib/erreurs";
import { analyser, zEnum, zTexte, zTexteOpt } from "@/lib/validation";
import { LIBELLES_FREQUENCE, serieRecente } from "@/lib/insee/lecture";
import { synchroniserIndices } from "@/lib/insee/sync";
import { verifierIdbank, verifierIdbanks } from "@/lib/insee/verification";
import type { SerieIndice } from "@/lib/insee/utils";

export type ReponseIndices = { ok: true; serie: SerieIndice } | { ok: false; erreur: string };

/** Derniers trimestres publiés d'un indice (IRL, ILC, ILAT, ICC…) pour les formulaires et calculatrices. */
export async function chargerIndices(code: string): Promise<ReponseIndices> {
  try {
    return { ok: true, serie: await serieRecente(code) };
  } catch (e) {
    return { ok: false, erreur: messageErreur(e) };
  }
}

const pluriel = (n: number, un: string, plusieurs: string) => `${n} ${n > 1 ? plusieurs : un}`;

export async function synchroniserMaintenant(): Promise<void> {
  const r = await synchroniserIndices({ declencheur: "manuel" });
  revalidatePath("/indices");
  const resume = `${pluriel(r.seriesInterrogees, "série interrogée", "séries interrogées")}, ${pluriel(r.observationsCreees, "valeur ajoutée", "valeurs ajoutées")}, ${pluriel(r.observationsMisesAJour, "valeur révisée", "valeurs révisées")}.`;
  if (r.erreurs.length) redirect(avecMessage("/indices", `Synchronisation terminée avec des erreurs : ${resume} ${r.erreurs.join(" ; ")}`, "erreur"));
  redirect(avecMessage("/indices", `Synchronisation terminée : ${resume}${r.alertes.length ? ` Alertes : ${r.alertes.join(" ; ")}` : ""}`));
}

export async function verifierIdbanksAction(): Promise<void> {
  const r = await verifierIdbanks();
  revalidatePath("/indices");
  const lignes = r.map((x) => `${x.code} (${x.idbank}) : ${x.ok ? `« ${x.libelleInsee} », ${x.message}` : `ÉCHEC, ${x.message}`}`);
  redirect(avecMessage("/indices", `Vérification des idbanks auprès de l'INSEE — ${lignes.join(" · ")}`, r.some((x) => !x.ok) ? "erreur" : "message"));
}

const schemaSerie = z.object({
  code: zTexte(20),
  idbank: zTexte(20),
  libelle: zTexte(200),
  frequence: zEnum(["M", "Q", "A"]),
  base: zTexteOpt(100),
  unite: zTexteOpt(50),
});

/** Ajoute une série après vérification de l'idbank ; un code déjà suivi est remplacé (rebasage), l'ancienne série restant inactive avec son historique. */
export async function ajouterSerie(_prev: FormState, fd: FormData): Promise<FormState> {
  const r = analyser(schemaSerie, fd);
  if (!r.success) return echec(fd, r.errors);
  const code = r.data.code.toUpperCase().replace(/\s+/g, "_");
  if (!/^[A-Z0-9_]{2,20}$/.test(code)) return echec(fd, { code: "Lettres, chiffres et « _ » uniquement (2 à 20 caractères)." });
  const idbank = r.data.idbank.replace(/\s+/g, "");
  if (!/^\d{9}$/.test(idbank)) return echec(fd, { idbank: "Un idbank comporte 9 chiffres (ex. 001515333)." });
  if (await prisma.indiceSerie.findUnique({ where: { idbank } })) return echec(fd, { idbank: "Cette série est déjà suivie." });
  let verif: Awaited<ReturnType<typeof verifierIdbank>>;
  try {
    verif = await verifierIdbank(idbank);
  } catch (e) {
    return echec(fd, { idbank: messageErreur(e) });
  }
  const frequenceInsee = verif.frequence === "T" ? "Q" : verif.frequence === "M" ? "M" : verif.frequence === "A" ? "A" : null;
  if (frequenceInsee && frequenceInsee !== r.data.frequence) return echec(fd, { frequence: `L'INSEE indique une série ${LIBELLES_FREQUENCE[frequenceInsee]} pour cet idbank.` });
  const precedentes = await prisma.indiceSerie.findMany({ where: { code, active: true } });
  await prisma.$transaction([
    ...precedentes.map((p) => prisma.indiceSerie.update({ where: { id: p.id }, data: { active: false } })),
    prisma.indiceSerie.create({ data: { code, idbank, libelle: r.data.libelle, libelleInsee: verif.titre, frequence: r.data.frequence, base: r.data.base, unite: r.data.unite } }),
  ]);
  const sync = await synchroniserIndices({ declencheur: "manuel", codes: [code] });
  revalidatePath("/indices");
  const detail = sync.details.find((d) => d.idbank === idbank);
  return succes(
    `Série ${code} ajoutée (« ${verif.titre ?? "libellé INSEE inconnu"} », dernière valeur ${verif.dernierePeriode} = ${verif.derniereValeur})${precedentes.length ? ` ; ${pluriel(precedentes.length, "ancienne série désactivée", "anciennes séries désactivées")} avec son historique` : ""}. ${detail?.erreur ? `Synchronisation en échec : ${detail.erreur}` : `${pluriel(detail?.creees ?? 0, "valeur chargée", "valeurs chargées")} depuis 2000.`}`,
  );
}

export async function basculerSerie(fd: FormData): Promise<void> {
  const id = Number(fd.get("id"));
  const s = await prisma.indiceSerie.findUnique({ where: { id } });
  if (!s) redirect("/indices");
  if (!s.active) await prisma.indiceSerie.updateMany({ where: { code: s.code, active: true }, data: { active: false } });
  await prisma.indiceSerie.update({ where: { id }, data: { active: !s.active, echecsConsecutifs: 0, dernierEchec: null } });
  revalidatePath("/indices");
  revalidatePath(`/indices/${s.code}`);
  redirect(avecMessage(`/indices/${s.code}`, s.active ? `Série ${s.code} (${s.idbank}) désactivée : son historique est conservé.` : `Série ${s.code} (${s.idbank}) réactivée ; les autres séries de ce code sont désactivées.`));
}
