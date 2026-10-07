"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Send, FlaskConical } from "lucide-react";
import { sendMessage, type Audience } from "./actions";

export interface AudienceOption { key: string; label: string; group: string; count: number; audience: Audience }

/** Formulário de comunicado: público, assunto, mensagem, teste e envio. */
export function Composer({ options, initial }: { options: AudienceOption[]; initial: string }) {
  const router = useRouter();
  const [key, setKey] = useState(initial);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("Olá, {{nome}}!\n\n");
  const [busy, start] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
  const opt = options.find((o) => o.key === key) ?? options[0];
  const groups = [...new Set(options.map((o) => o.group))];

  function send(test: boolean) {
    if (!subject.trim() || !message.trim()) return setResult({ ok: false, text: "Preencha o assunto e a mensagem." });
    if (!test && !confirm(`Enviar "${subject}" para ${opt.count} pessoa(s)?\n\nPúblico: ${opt.label}\n\nEsta ação não pode ser desfeita.`)) return;
    setResult(null);
    start(async () => {
      const r = await sendMessage({ subject, message, audience: opt.audience, audience_label: `${opt.group} · ${opt.label}`, test });
      if (!r.ok) return setResult({ ok: false, text: r.error ?? "Não foi possível enviar." });
      if (test) setResult({ ok: true, text: `Teste enviado para ${r.to}. Confira sua caixa de entrada.` });
      else {
        setResult({ ok: !r.failed, text: `Enviado para ${r.sent} de ${r.recipients} pessoa(s)${r.failed ? ` · ${r.failed} falha(s), veja o histórico` : ""}.` });
        router.refresh();
      }
    });
  }

  return (
    <div className="adm-card flex flex-col gap-4 p-5">
      <label className="flex flex-col gap-1 text-sm font-medium">
        Para quem
        <select className="adm-input" value={key} onChange={(e) => setKey(e.target.value)}>
          {groups.map((g) => (
            <optgroup key={g} label={g}>
              {options.filter((o) => o.group === g).map((o) => <option key={o.key} value={o.key}>{o.label} ({o.count})</option>)}
            </optgroup>
          ))}
        </select>
        <span className="text-xs font-normal text-zinc-500">{opt.count} destinatário(s) (e-mails repetidos são enviados uma vez só).</span>
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium">
        Assunto
        <input className="adm-input" value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={150} placeholder="Ex.: Lembrete da capacitação de amanhã" />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium">
        Mensagem
        <textarea className="adm-input min-h-48 font-normal" value={message} onChange={(e) => setMessage(e.target.value)} />
        <span className="text-xs font-normal text-zinc-500">Use <code>{"{{nome}}"}</code> para o primeiro nome da pessoa. Linha em branco separa parágrafos; links (https://…) ficam clicáveis.</span>
      </label>
      {result && <p className={`rounded-lg px-3 py-2 text-sm ${result.ok ? "bg-brand-50 text-brand-700" : "bg-red-50 text-red-700"}`} role="status">{result.text}</p>}
      <div className="flex flex-wrap gap-2">
        <button type="button" className="adm-btn-secondary" disabled={busy} onClick={() => send(true)}><FlaskConical size={16} /> Enviar teste para mim</button>
        <button type="button" className="adm-btn-primary" disabled={busy || !opt.count} onClick={() => send(false)}><Send size={16} /> {busy ? "Enviando…" : `Enviar para ${opt.count} pessoa(s)`}</button>
      </div>
      <p className="text-xs text-zinc-500">Plano grátis do Resend: até 100 e-mails por dia e 3.000 por mês. Para públicos maiores, envie em dias diferentes ou ative o Brevo como reserva.</p>
    </div>
  );
}
