"use client";
import { useState } from "react";
import type { TrainingFormProps } from "../types";
import { isValidCpf } from "../certificate";

/** Inscrição sem login (nome, e-mail, telefone e CPF opcional) em eventos, cortejos e capacitações. Envia para /api/capacitacao do site público. */
export function TrainingForm({ props: p, pageId, preview }: { props: TrainingFormProps; pageId?: string; preview?: boolean }) {
  const [state, setState] = useState<"idle" | "sending" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (preview) return;
    const fd = new FormData(e.currentTarget);
    const cpf = String(fd.get("cpf") ?? "").replace(/\D/g, "");
    if (cpf && !isValidCpf(cpf)) {
      setError("CPF inválido. Confira os números ou deixe em branco.");
      return;
    }
    setState("sending");
    setError(null);
    try {
      const res = await fetch("/api/capacitacao", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          page_id: pageId,
          name: String(fd.get("name") ?? ""),
          email: String(fd.get("email") ?? ""),
          phone: String(fd.get("phone") ?? ""),
          cpf,
          consent: fd.get("consent") === "on",
          website: String(fd.get("website") ?? ""),
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Não foi possível enviar.");
      setState("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível enviar.");
      setState("idle");
    }
  }

  if (state === "done")
    return (
      <div className="fp-card flex flex-col items-start gap-2 text-left">
        <div className="fp-reg-ok">✓ Inscrição recebida</div>
        <p>{p.successMessage || "Enviamos a confirmação para o seu e-mail."}</p>
      </div>
    );

  return (
    <form onSubmit={onSubmit} className="fp-card fp-form flex flex-col gap-4 text-left">
      {p.title && <h2 className="fp-heading fp-h3">{p.title}</h2>}
      {p.intro && <p className="opacity-80">{p.intro}</p>}
      <label>Nome completo<input name="name" required minLength={2} autoComplete="name" /></label>
      <div className="grid gap-4 @xl:grid-cols-2">
        <label>E-mail<input name="email" type="email" required autoComplete="email" /></label>
        <label>Número (telefone / WhatsApp)<input name="phone" type="tel" required autoComplete="tel" placeholder="(82) 9 0000-0000" /></label>
      </div>
      <label>CPF <span className="opacity-60">(opcional — aparece no certificado)</span><input name="cpf" inputMode="numeric" autoComplete="off" placeholder="000.000.000-00" maxLength={14} onChange={(e) => (e.currentTarget.value = maskCpfInput(e.currentTarget.value))} /></label>
      <input name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
      <label className="fp-check"><input type="checkbox" name="consent" required /> Autorizo o uso dos meus dados para a organização e a emissão do certificado (LGPD).</label>
      {error && <p className="text-sm font-semibold text-red-700" role="alert">{error}</p>}
      <button type="submit" disabled={preview || state === "sending"} className="fp-btn fp-btn-primary self-start">
        {state === "sending" ? "Enviando…" : p.buttonLabel || "Fazer inscrição"}
      </button>
    </form>
  );
}

function maskCpfInput(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  return d.replace(/^(\d{3})(\d)/, "$1.$2").replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3").replace(/\.(\d{3})(\d{1,2})$/, ".$1-$2");
}
