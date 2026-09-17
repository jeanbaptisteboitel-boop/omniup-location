"use client";

import { useRef, useState, type ReactNode } from "react";
import { Button } from "./ui";
import { Dialogue } from "./dialogue";

/**
 * Formulaire dont la soumission demande confirmation dans une boîte de dialogue (suppressions, changements d'état).
 * Les enfants contiennent les champs cachés et le bouton déclencheur.
 */
export function ConfirmForm({
  action,
  message,
  titre = "Confirmer cette action ?",
  libelleConfirmer = "Confirmer",
  children,
  className = "",
}: {
  action: (formData: FormData) => void | Promise<void>;
  message: ReactNode;
  titre?: ReactNode;
  libelleConfirmer?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const [ouvert, setOuvert] = useState(false);
  const confirme = useRef(false);
  const ref = useRef<HTMLFormElement>(null);
  return (
    <form
      ref={ref}
      action={action}
      className={className}
      onSubmit={(e) => {
        if (!confirme.current) {
          e.preventDefault();
          setOuvert(true);
        }
      }}
    >
      {children}
      {ouvert && (
        <Dialogue
          titre={titre}
          onFermer={() => setOuvert(false)}
          actions={
            <>
              <Button type="button" variante="secondary" onClick={() => setOuvert(false)}>
                Annuler
              </Button>
              <Button
                type="button"
                variante="dangerPlein"
                onClick={() => {
                  confirme.current = true;
                  setOuvert(false);
                  ref.current?.requestSubmit();
                }}
              >
                {libelleConfirmer}
              </Button>
            </>
          }
        >
          {message}
        </Dialogue>
      )}
    </form>
  );
}
