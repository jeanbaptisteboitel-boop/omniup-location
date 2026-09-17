"use client";

import { useEffect, useRef, useState } from "react";
import { Alerte, Button } from "@/components/ui";

type Message = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  "Rédige une lettre de relance pour un loyer impayé",
  "Quel préavis s'applique à un locataire en bail meublé ?",
  "Comment réviser le loyer d'un bail d'habitation ?",
  "Rédige un congé pour vente à adresser à un locataire",
  "Le dépôt de garantie : délai et retenues possibles ?",
  "Rédige une attestation de loyer à jour pour un locataire",
];

export function Chat({ configuree, actionEnregistrer }: { configuree: boolean; actionEnregistrer: (fd: FormData) => Promise<void> }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [saisie, setSaisie] = useState("");
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const fin = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fin.current?.scrollIntoView({ behavior: "smooth", block: "end" });
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
        const copie = texteReponse;
        setMessages([...historique, { role: "assistant", content: copie }]);
      }
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Erreur inconnue.");
      setMessages(historique);
    } finally {
      setEnCours(false);
    }
  }

  async function copier(texte: string) {
    try {
      await navigator.clipboard.writeText(texte);
    } catch {
      /* presse-papiers indisponible */
    }
  }

  if (!configuree) {
    return <Alerte ton="orange">L'assistant IA n'est pas configuré : renseignez ANTHROPIC_API_KEY dans les variables d'environnement (voir Paramètres).</Alerte>;
  }

  return (
    <div className="flex min-h-[60vh] flex-col rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
        {messages.length === 0 && (
          <div className="space-y-3">
            <p className="text-sm text-slate-600">Posez une question de gestion locative ou demandez la rédaction d'un courrier. L'assistant connaît les lots, locataires et loyers de l'entité sélectionnée.</p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button key={s} type="button" onClick={() => envoyer(s)} className="rounded-full bg-navy-50 px-3 py-1 text-xs text-navy-800 hover:bg-navy-100">{s}</button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${m.role === "user" ? "bg-navy-800 text-white" : "bg-slate-100 text-navy-950"}`}>
              <div className="whitespace-pre-wrap break-words">{m.content || (enCours && i === messages.length - 1 ? "…" : "")}</div>
              {m.role === "assistant" && m.content && !(enCours && i === messages.length - 1) && (
                <div className="mt-2 flex flex-wrap gap-2 border-t border-slate-200 pt-2">
                  <button type="button" onClick={() => copier(m.content)} className="text-xs text-navy-700 underline">Copier</button>
                  <form action={actionEnregistrer}>
                    <input type="hidden" name="contenu" value={m.content} />
                    <button type="submit" className="text-xs text-navy-700 underline">Enregistrer comme document</button>
                  </form>
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={fin} />
      </div>
      {erreur && <div className="px-4 pb-2"><Alerte ton="rouge">{erreur}</Alerte></div>}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void envoyer(saisie);
        }}
        className="flex items-end gap-2 border-t border-slate-100 px-4 py-3"
      >
        <textarea
          value={saisie}
          onChange={(e) => setSaisie(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void envoyer(saisie);
            }
          }}
          rows={2}
          placeholder="Votre question ou le courrier à rédiger… (Entrée pour envoyer, Maj+Entrée pour une nouvelle ligne)"
          className="block w-full resize-y rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-cyan focus:outline-none focus:ring-2 focus:ring-brand-cyan/40"
        />
        <Button type="submit" variante="accent" disabled={enCours || !saisie.trim()}>{enCours ? "Réponse…" : "Envoyer"}</Button>
        {messages.length > 0 && <Button type="button" variante="ghost" onClick={() => setMessages([])} disabled={enCours}>Nouvelle conversation</Button>}
      </form>
    </div>
  );
}
