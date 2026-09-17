"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { erreur, type FormState } from "@/lib/forms";
import { COOKIE_SESSION, creerJeton, motDePasseValide, protectionActive } from "@/lib/session";

export async function seConnecter(_prev: FormState, fd: FormData): Promise<FormState> {
  if (!protectionActive()) redirect("/");
  const saisi = String(fd.get("motDePasse") ?? "");
  if (!(await motDePasseValide(saisi))) {
    await new Promise((r) => setTimeout(r, 500));
    return erreur(null, "Mot de passe incorrect.");
  }
  const jeton = await creerJeton();
  const magasin = await cookies();
  magasin.set(COOKIE_SESSION, jeton.valeur, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: jeton.maxAge });
  const suite = String(fd.get("suite") ?? "");
  redirect(suite.startsWith("/") && !suite.startsWith("//") ? suite : "/");
}

export async function seDeconnecter(): Promise<void> {
  const magasin = await cookies();
  magasin.delete(COOKIE_SESSION);
  redirect("/connexion");
}
