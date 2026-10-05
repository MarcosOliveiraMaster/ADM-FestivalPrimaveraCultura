"use client";
import { useCallback, useEffect, useState } from "react";
import type { RegistrationProps } from "../types";
import { googleCalendarUrl, icsFile } from "../format";

interface Status {
  loggedIn: boolean;
  open: boolean;
  registered: number;
  capacity: number | null;
  mine: { attended: boolean; certificate_code: string } | null;
}

/**
 * Inscrição no evento da página. Fala com /api/inscricao do site público;
 * na pré-visualização do ADM mostra só a aparência.
 */
export function Registration({ props: p, pageId, preview, event }: {
  props: RegistrationProps;
  pageId?: string;
  preview?: boolean;
  event?: { title: string; starts_at: string | null; ends_at: string | null; location: string | null };
}) {
  const [status, setStatus] = useState<Status | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (preview || !pageId) return;
    const res = await fetch(`/api/inscricao?page=${pageId}`, { cache: "no-store" });
    if (res.ok) setStatus(await res.json());
  }, [pageId, preview]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carrega o estado inicial do servidor
    load();
  }, [load]);

  const calendar = event ? googleCalendarUrl(`${event.title}`, event.starts_at, event.ends_at, event.location) : null;
  const left = status?.capacity != null ? Math.max(status.capacity - status.registered, 0) : null;

  async function act(method: "POST" | "DELETE") {
    if (method === "DELETE" && !confirm("Cancelar sua inscrição neste evento?")) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch("/api/inscricao", { method, headers: { "content-type": "application/json" }, body: JSON.stringify({ page_id: pageId }) });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Não foi possível concluir agora.");
      if (method === "POST") setNotice(json.emailSent ? "Enviamos a confirmação para o seu e-mail." : "Inscrição registrada! (o e-mail de confirmação pode demorar alguns minutos)");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível concluir agora.");
    } finally {
      setBusy(false);
    }
  }

  function downloadIcs() {
    if (!event?.starts_at) return;
    const blob = new Blob([icsFile(event.title, event.starts_at, event.ends_at, event.location, pageId ?? "evento")], { type: "text/calendar;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "evento.ics";
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 500);
  }

  const here = typeof window !== "undefined" ? window.location.pathname : "/";
  let body: React.ReactNode;
  if (preview) {
    body = <button type="button" className="fp-btn fp-btn-primary fp-btn-lg self-start" disabled>{p.buttonLabel || "Quero me inscrever"}</button>;
  } else if (!status) {
    body = <div className="h-12 w-48 animate-pulse rounded-full bg-black/10" />;
  } else if (status.mine) {
    body = (
      <div className="flex flex-col gap-3">
        <div className="fp-reg-ok">✓ Você está inscrito(a) neste evento.</div>
        {notice && <p className="text-sm opacity-80">{notice}</p>}
        <div className="flex flex-wrap gap-2">
          {calendar && <a href={calendar} target="_blank" rel="noopener noreferrer" data-track="inscricao:google-agenda" className="fp-btn fp-btn-primary">Adicionar ao Google Agenda</a>}
          {event?.starts_at && <button type="button" onClick={downloadIcs} className="fp-btn fp-btn-outline">Baixar .ics</button>}
          {status.mine.attended ? (
            <a href={`/certificado/${status.mine.certificate_code}`} className="fp-btn fp-btn-outline">Ver certificado</a>
          ) : (
            <button type="button" disabled={busy} onClick={() => act("DELETE")} className="fp-btn fp-btn-outline">Cancelar inscrição</button>
          )}
        </div>
      </div>
    );
  } else if (!status.open) {
    body = <p className="font-semibold opacity-80">As inscrições para este evento não estão abertas.</p>;
  } else if (left === 0) {
    body = <p className="font-semibold opacity-80">Vagas esgotadas.</p>;
  } else if (!status.loggedIn) {
    body = (
      <div className="flex flex-col gap-2">
        <a href={`/entrar?next=${encodeURIComponent(here)}`} data-track="inscricao:login" className="fp-btn fp-btn-primary fp-btn-lg self-start">{p.buttonLabel || "Quero me inscrever"}</a>
        <span className="text-sm opacity-75">Entre com o Google ou com seu e-mail para se inscrever.</span>
      </div>
    );
  } else {
    body = (
      <button type="button" disabled={busy} onClick={() => act("POST")} data-track="inscricao:enviar" className="fp-btn fp-btn-primary fp-btn-lg self-start">
        {busy ? "Enviando…" : p.buttonLabel || "Quero me inscrever"}
      </button>
    );
  }

  return (
    <div className="fp-card flex flex-col gap-4 text-left">
      {p.title && <h2 className="fp-heading fp-h3">{p.title}</h2>}
      {p.intro && <p className="opacity-80">{p.intro}</p>}
      {left != null && !status?.mine && status?.open && left > 0 && <span className="fp-label">{left} {left === 1 ? "vaga restante" : "vagas restantes"}</span>}
      {body}
      {error && <p className="text-sm font-semibold text-red-700" role="alert">{error}</p>}
    </div>
  );
}
