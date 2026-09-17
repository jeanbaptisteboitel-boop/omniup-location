"use client";

import type { ReactNode } from "react";

/** Formulaire dont la soumission demande confirmation (suppressions, changements d'état). */
export function ConfirmForm({
  action,
  message,
  children,
  className = "",
}: {
  action: (formData: FormData) => void | Promise<void>;
  message: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <form
      action={action}
      className={className}
      onSubmit={(e) => {
        if (!window.confirm(message)) e.preventDefault();
      }}
    >
      {children}
    </form>
  );
}
