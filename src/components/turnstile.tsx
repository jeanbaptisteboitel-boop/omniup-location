"use client";

import Script from "next/script";

/**
 * Widget Cloudflare Turnstile : ajoute le champ caché « cf-turnstile-response » au formulaire qui le contient.
 * N'affiche rien quand la protection n'est pas configurée (siteKey null).
 */
export function Turnstile({ siteKey, className = "" }: { siteKey: string | null; className?: string }) {
  if (!siteKey) return null;
  return (
    <>
      <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" strategy="afterInteractive" />
      <div className={`cf-turnstile ${className}`} data-sitekey={siteKey} data-language="fr" data-theme="light" />
    </>
  );
}
