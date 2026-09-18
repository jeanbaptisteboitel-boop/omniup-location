"use client";

import { useEffect, useRef, useState } from "react";
import { Alerte, Button } from "@/components/ui";
import { IconeEtincelle, IconeFlecheHaut, IconeIA } from "@/components/icones";

type Message = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = ["Rédige un courrier de relance", "Explique la révision IRL", "Quels loyers sont en retard ?", "Quel préavis pour un meublé ?"];

const PETIT = "inline-flex h-8 cursor-pointer items-center whitespace-nowrap rounded-md border border-slate-300 bg-white px-3 text-[13px] font-medium text-navy-900 transition-colors hover:bg-slate-50 focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-cyan disabled:pointer-events-none disabled:opacity-50";

function Avatar({ taille = 32 }: { taille?: number }) {
  return (
    <span className="inline-flex shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-800" style={{ width: taille, height: taille }}>
      <IconeEtincelle taille={16} />
    </span>
  );
}

export function Chat({ configuree, actionEnregistrer }: { configuree: boolean; actionEnregistrer: (fd: FormData) => Promise<void> }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [saisie, setSaisie] = useState("");
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [copie, setCopie] = useState<number | null>(null);
  const fin = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messages.length > 0) fin.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  async function envoyer(texte: string) {
    const question = texte.trim();
    if (!question || enCours) return;
    setErreur(null);
    const historique: Message[] = [...messages, { role: "user", content: question }];
    setMessages([...historique, { role: "assistant", content: "" }]);
    setSaisie("");
    setEnCours(true);
    try {
      const r = await fetch("/api/assistant", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: historique }) });
      if (!r.ok || !r.body) {
        const detail = await r.json().catch(() => ({ erreur: `Erreur ${r.status}` }));
        throw new Error(detail.erreur ?? `Erreur ${r.status}`);
      }
      const lecteur = r.body.getReader();
      const decodeur = new TextDecoder();
      let texteReponse = "";
      for (;;) {
        const { value, done } = await lecteur.read();
        if (done) break;
        texteReponse += decodeur.decode(value, { stream: true });
        const copieTexte = texteReponse;
        setMessages([...historique, { role: "assistant", content: copieTexte }]);
      }
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Erreur inconnue.");
      setMessages(historique);
    } finally {
      setEnCours(false);
    }
  }

  async function copier(texte: string, index: number) {
    try {
      await navigator.clipboard.writeText(texte);
      setCopie(index);
      setTimeout(() => setCopie((c) => (c === index ? null : c)), 2000);
    } catch {
      /* presse-papiers indisponible */
    }
  }

  const vide = messages.length === 0;

  return (
    <div className="flex min-h-[640px] flex-col rounded-xl border border-slate-200 bg-white shadow-card">
      <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-6">
        {vide && (
          <div className="m-auto flex max-w-[560px] flex-col items-center gap-3.5 py-10 text-center">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-violet-100 text-violet-800">
              <IconeIA taille={24} />
            </span>
            <div>
              <p className="text-lg font-bold text-navy-900">{configuree ? "Que puis-je faire pour vous ?" : "Assistant IA non configuré"}</p>
              <p className="mt-1.5 text-sm text-slate-500">
                {configuree ? "L'assistant connaît vos lots, baux et loyers. Il ne remplace pas un conseil juridique." : "Renseignez la clé ANTHROPIC_API_KEY dans les variables d'environnement du serveur (voir Paramètres) pour activer la rédaction de courriers et les réponses à vos questions."}
              </p>
            </div>
            {configuree && (
              <div className="flex flex-wrap justify-center gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => envoyer(s)}
                    className="h-9 cursor-pointer rounded-full border border-slate-300 bg-white px-3.5 text-[13px] font-semibold text-navy-800 transition-colors hover:border-navy-300 hover:bg-navy-50 focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-cyan"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        {messages.map((m, i) => {
          const ia = m.role === "assistant";
          const enRedaction = ia && enCours && i === messages.length - 1;
          return (
            <div key={i} className={`flex items-start gap-3 ${ia ? "" : "justify-end"}`}>
              {ia && <Avatar />}
              <div className={`min-w-0 ${ia ? "max-w-[720px]" : "max-w-[80%]"}`}>
                <div className={`whitespace-pre-wrap break-words rounded-xl px-4 py-3 text-sm leading-[1.6] ${ia ? "border border-slate-200 bg-slate-50 text-slate-900" : "bg-navy-800 text-white"}`}>
                  {m.content}
                  {enRedaction && <span aria-hidden="true" className="ml-0.5 inline-block h-3.5 w-2 animate-blink bg-violet-800 align-text-bottom" />}
                </div>
                {ia && !enRedaction && m.content && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <form action={actionEnregistrer}>
                      <input type="hidden" name="contenu" value={m.content} />
                      <button type="submit" className={PETIT}>Enregistrer comme document</button>
                    </form>
                    <button type="button" onClick={() => copier(m.content, i)} className={PETIT}>
                      {copie === i ? "Copié" : "Copier"}
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
        <div ref={fin} />
      </div>
      {erreur && (
        <div className="px-5 pb-3">
          <Alerte ton="rouge">{erreur}</Alerte>
        </div>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void envoyer(saisie);
        }}
        className="flex items-end gap-2.5 border-t border-slate-100 px-5 py-4"
      >
        <label htmlFor="message" className="sr-only">
          Message
        </label>
        <textarea
          id="message"
          value={saisie}
          onChange={(e) => setSaisie(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void envoyer(saisie);
            }
          }}
          rows={2}
          disabled={!configuree}
          placeholder={configuree ? "Posez une question ou demandez un courrier…" : "Assistant IA non configuré"}
          className="block min-w-0 flex-1 resize-none rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm leading-normal text-navy-950 placeholder:text-slate-400 focus:border-brand-cyan focus:outline-none focus:ring-2 focus:ring-brand-cyan/30 disabled:bg-slate-50 disabled:text-slate-500"
        />
        <button
          type="submit"
          aria-label="Envoyer"
          disabled={enCours || !configuree || !saisie.trim()}
          className="inline-flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-lg bg-navy-800 text-white transition-colors hover:bg-navy-700 focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-cyan disabled:pointer-events-none disabled:opacity-50"
        >
          <IconeFlecheHaut taille={18} />
        </button>
      </form>
      <div className="flex flex-wrap items-center justify-between gap-2 px-5 pb-3">
        <p className="text-xs text-slate-400">Anthropic Claude · les réponses peuvent contenir des erreurs · vos données restent dans votre espace.</p>
        {!vide && (
          <Button type="button" variante="ghost" taille="sm" onClick={() => setMessages([])} disabled={enCours}>
            Nouvelle conversation
          </Button>
        )}
      </div>
    </div>
  );
}
