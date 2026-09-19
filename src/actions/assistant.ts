"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { avecMessage } from "@/lib/erreurs";
import { entiteCouranteId } from "@/lib/entite";
import { exigerEcriture } from "@/lib/droits";

/** Enregistre une réponse de l'assistant comme document de l'entité (modifiable, exportable en PDF, envoyable). */
export async function enregistrerReponseAssistant(fd: FormData): Promise<void> {
  await exigerEcriture();
  const contenu = String(fd.get("contenu") ?? "").trim();
  if (!contenu) redirect("/assistant");
  const premiereLigne = contenu.split("\n").find((l) => l.trim() !== "") ?? "Document";
  const titre = premiereLigne.replace(/^#+\s*/, "").slice(0, 150) || "Document rédigé par l'assistant";
  const d = await prisma.documentGenere.create({ data: { entiteId: await entiteCouranteId(), titre, categorie: "AUTRE", contenu } });
  redirect(avecMessage(`/documents/${d.id}`, "Texte enregistré comme document : vous pouvez le rattacher à un bail, le modifier, le télécharger en PDF ou l'envoyer."));
}
