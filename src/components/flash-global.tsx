"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { FlashBanner } from "./flash-banner";

/**
 * Message flash de l'URL (?message=… ou ?erreur=…) affiché depuis la mise en page pour les écrans qui n'ont pas leur propre <Flash>
 * (formulaires de création et de modification, refus d'une action en lecture seule…). Ne fait rien si la page affiche déjà le message.
 */
export function FlashGlobal() {
  const sp = useSearchParams();
  const erreur = sp.get("erreur");
  const message = sp.get("message");
  const [actif, setActif] = useState(false);
  useEffect(() => {
    setActif(!document.querySelector("[data-flash]"));
  }, [erreur, message]);
  if (!actif || (!erreur && !message)) return null;
  return (
    <div className="mb-6" data-flash-global>
      <FlashBanner ton={erreur ? "rouge" : "vert"} texte={erreur ?? message ?? ""} />
    </div>
  );
}
