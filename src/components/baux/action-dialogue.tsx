"use client";

import { useState, type ReactNode } from "react";
import { Button, type Taille, type Variante } from "@/components/ui";
import { Dialogue } from "@/components/dialogue";
import { SubmitButton } from "@/components/form";

/**
 * Bouton ouvrant une boîte de dialogue contenant un petit formulaire (changement d'état d'un bail :
 * envoi en signature, signature, résiliation). Les champs cachés et les champs saisis sont envoyés à l'action serveur.
 */
export function ActionDialogue({
  action,
  libelle,
  variante = "primary",
  taille = "md",
  className = "",
  titre,
  description,
  caches = {},
  libelleConfirmer,
  varianteConfirmer,
  enCours = "Enregistrement…",
  children,
}: {
  action: (fd: FormData) => void | Promise<void>;
  libelle: ReactNode;
  variante?: Variante;
  taille?: Taille;
  className?: string;
  titre: ReactNode;
  description?: ReactNode;
  /** Champs cachés (identifiant du bail…). */
  caches?: Record<string, string>;
  libelleConfirmer: ReactNode;
  varianteConfirmer?: Variante;
  enCours?: ReactNode;
  children?: ReactNode;
}) {
  const [ouvert, setOuvert] = useState(false);
  const confirmer: Variante = varianteConfirmer ?? (variante === "danger" ? "dangerPlein" : variante === "secondary" || variante === "ghost" ? "primary" : variante);
  return (
    <>
      <Button type="button" variante={variante} taille={taille} className={className} onClick={() => setOuvert(true)}>
        {libelle}
      </Button>
      {ouvert && (
        <Dialogue titre={titre} onFermer={() => setOuvert(false)}>
          <form action={action} className="flex flex-col gap-3.5">
            {Object.entries(caches).map(([nom, valeur]) => (
              <input key={nom} type="hidden" name={nom} value={valeur} />
            ))}
            {description && <p className="leading-relaxed">{description}</p>}
            {children}
            <div className="mt-1.5 flex flex-wrap justify-end gap-2">
              <Button type="button" variante="secondary" onClick={() => setOuvert(false)}>
                Annuler
              </Button>
              <SubmitButton variante={confirmer} enCours={enCours}>
                {libelleConfirmer}
              </SubmitButton>
            </div>
          </form>
        </Dialogue>
      )}
    </>
  );
}
