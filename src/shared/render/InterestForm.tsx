"use client";
import { useState } from "react";
import type { EventSummary, FormProps } from "../types";

export function InterestForm({ props: p, pageId, preview, events }: { props: FormProps; pageId?: string; preview?: boolean; events: EventSummary[] }) {
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const options = p.interestOptions?.length ? p.interestOptions : events.map((e) => e.title);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (preview) return;
    const fd = new FormData(e.currentTarget);
    const body = {
      page_id: pageId ?? null,
      name: String(fd.get("name") ?? ""),
      email: String(fd.get("email") ?? ""),
      phone: String(fd.get("phone") ?? ""),
      city: String(fd.get("city") ?? ""),
      interests: fd.getAll("interests").map(String),
      heard_from: String(fd.get("heard_from") ?? ""),
      message: String(fd.get("message") ?? ""),
      consent: fd.get("consent") === "on",
      newsletter: fd.get("newsletter") === "on",
      website: String(fd.get("website") ?? ""),
      utm: (() => {
        try {
          return JSON.parse(sessionStorage.getItem("fp_utm") || "{}");
        } catch {
          return {};
        }
      })(),
      referrer: typeof document !== "undefined" ? document.referrer : "",
    };
    setState("sending");
    setError(null);
    try {
      const res = await fetch("/api/interesse", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Não foi possível enviar.");
      setState("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível enviar.");
      setState("error");
    }
  }

  if (state === "done")
    return (
      <div className="fp-card text-center">
        <div className="text-4xl">🌸</div>
        <p className="fp-heading fp-h3 mt-2">{p.successMessage || "Obrigado!"}</p>
      </div>
    );

  return (
    <form onSubmit={onSubmit} className="fp-card fp-form mx-auto flex w-full max-w-2xl flex-col gap-4 text-left">
      {p.title && <h2 className="fp-heading fp-h2">{p.title}</h2>}
      {p.intro && <p className="opacity-80">{p.intro}</p>}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
      <div className="grid gap-4 @xl:grid-cols-2">
        <label className="@xl:col-span-2">Nome*<input name="name" required maxLength={200} autoComplete="name" /></label>
        <label>E-mail*<input name="email" type="email" required maxLength={320} autoComplete="email" /></label>
        {p.fields.phone && <label>WhatsApp<input name="phone" type="tel" maxLength={40} autoComplete="tel" placeholder="(00) 00000-0000" /></label>}
        {p.fields.city && <label>Cidade<input name="city" maxLength={120} autoComplete="address-level2" /></label>}
        {p.fields.heardFrom && (
          <label>
            Como conheceu o festival?
            <select name="heard_from" defaultValue="">
              <option value="">Selecione</option>
              {["Instagram", "WhatsApp", "Amigos / indicação", "Google", "Cartaz / panfleto", "Rádio / TV", "Outro"].map((o) => (
                <option key={o}>{o}</option>
              ))}
            </select>
          </label>
        )}
      </div>
      {p.fields.interests && options.length > 0 && (
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 font-medium">Interesse em</legend>
          <div className="flex flex-wrap gap-2">
            {options.map((o) => (
              <label key={o} className="fp-chip">
                <input type="checkbox" name="interests" value={o} /> {o}
              </label>
            ))}
          </div>
        </fieldset>
      )}
      {p.fields.message && <label>Mensagem<textarea name="message" rows={4} maxLength={5000} /></label>}
      <label className="fp-check">
        <input type="checkbox" name="consent" required /> <span>Concordo com o uso dos meus dados para contato sobre o festival, conforme a LGPD.*</span>
      </label>
      {p.fields.newsletter && (
        <label className="fp-check">
          <input type="checkbox" name="newsletter" /> <span>Quero receber novidades do festival.</span>
        </label>
      )}
      {error && <p className="rounded-lg bg-red-100 px-3 py-2 text-sm text-red-800">{error}</p>}
      <button type="submit" disabled={state === "sending" || preview} className="fp-btn fp-btn-primary self-start">
        {state === "sending" ? "Enviando…" : p.buttonLabel || "Enviar"}
      </button>
      {preview && <p className="text-xs opacity-60">Pré-visualização: o envio fica desativado aqui.</p>}
    </form>
  );
}
