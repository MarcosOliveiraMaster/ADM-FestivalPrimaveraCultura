"use client";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Award, MessageCircle, Send, Trash2 } from "lucide-react";
import { formatDate, formatDateTime } from "@/shared/format";
import { deleteRegistration, sendCertificates, setAttendance, type CertResult, type RegKind } from "./actions";

/** Inscrição de evento ou de capacitação, no mesmo formato. */
export interface AttendanceRow {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  attended: boolean;
  certificate_code: string;
  certificate_sent_at: string | null;
  email_sent_at: string | null;
  created_at: string;
}

const AUTO_KEY = "adm:cert-auto-send";
const wa = (phone: string) => `https://wa.me/${(phone.replace(/\D/g, "").length <= 11 ? "55" : "") + phone.replace(/\D/g, "")}`;

/** Lista de inscritos com presença, certificado (link + envio por e-mail) e exclusão. */
export function AttendanceTable({ rows, kind, pageId, isAdmin, siteUrl }: { rows: AttendanceRow[]; kind: RegKind; pageId: string; isAdmin: boolean; siteUrl: string }) {
  const router = useRouter();
  const [busy, start] = useTransition();
  const [q, setQ] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [auto, setAuto] = useState(true);

  useEffect(() => {
    try {
      const v = localStorage.getItem(AUTO_KEY);
      if (v !== null) setAuto(v === "1"); // eslint-disable-line react-hooks/set-state-in-effect -- preferência salva no navegador
    } catch {}
  }, []);
  function toggleAuto(v: boolean) {
    setAuto(v);
    try {
      localStorage.setItem(AUTO_KEY, v ? "1" : "0");
    } catch {}
  }

  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    return t ? rows.filter((r) => `${r.name} ${r.email} ${r.phone ?? ""}`.toLowerCase().includes(t)) : rows;
  }, [rows, q]);
  const notPresent = list.filter((r) => !r.attended).map((r) => r.id);
  const toSend = rows.filter((r) => r.attended && !r.certificate_sent_at).length;

  const run = (fn: () => Promise<CertResult>) =>
    start(async () => {
      setNotice(null);
      const r = await fn();
      setError(r.ok ? null : r.error ?? "Erro");
      if (r.sent || r.failed) setNotice(`${r.sent ?? 0} certificado(s) enviado(s) por e-mail${r.failed ? ` · ${r.failed} com falha` : ""}.`);
      router.refresh();
    });

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nome, e-mail ou telefone" className="adm-input max-w-xs" />
        <button
          type="button"
          className="adm-btn-secondary"
          disabled={busy || !notPresent.length}
          onClick={() => confirm(`Marcar presença de ${notPresent.length} pessoa(s)?${auto ? "\n\nO certificado será enviado por e-mail para cada uma." : ""}`) && run(() => setAttendance(notPresent, true, kind, auto))}
        >
          <Award size={16} /> Marcar todos como presentes
        </button>
        <button
          type="button"
          className="adm-btn-primary"
          disabled={busy || !toSend}
          onClick={() => confirm(`Enviar o certificado por e-mail para ${toSend} participante(s) presente(s) que ainda não receberam?`) && run(() => sendCertificates(kind, undefined, pageId))}
        >
          <Send size={16} /> {busy ? "Aguarde…" : `Enviar certificados pendentes (${toSend})`}
        </button>
        <label className="flex items-center gap-2 text-sm text-zinc-600">
          <input type="checkbox" className="h-4 w-4 accent-brand-500" checked={auto} onChange={(e) => toggleAuto(e.target.checked)} />
          Enviar o certificado por e-mail ao marcar presença
        </label>
      </div>
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {notice && <p className="rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-700">{notice}</p>}
      <div className="adm-card overflow-x-auto">
        <table className="adm-table">
          <thead>
            <tr><th>Presença</th><th>Participante</th><th className="hidden md:table-cell">Inscrição</th><th className="hidden sm:table-cell">Confirmação</th><th>Certificado</th><th /></tr>
          </thead>
          <tbody>
            {list.map((r) => (
              <tr key={r.id}>
                <td>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" className="h-5 w-5 accent-brand-500" checked={r.attended} disabled={busy} onChange={(e) => run(() => setAttendance([r.id], e.target.checked, kind, auto))} />
                    {r.attended ? "Presente" : "—"}
                  </label>
                </td>
                <td>
                  <div className="font-medium">{r.name}</div>
                  <a href={`mailto:${r.email}`} className="block text-xs text-zinc-500 hover:underline">{r.email}</a>
                  {r.phone && (
                    <a href={wa(r.phone)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-brand-700 hover:underline">
                      <MessageCircle size={12} /> {r.phone}
                    </a>
                  )}
                </td>
                <td className="hidden text-xs text-zinc-500 md:table-cell">{formatDateTime(r.created_at)}</td>
                <td className="hidden text-xs sm:table-cell">{r.email_sent_at ? <span className="text-brand-700">e-mail enviado</span> : <span className="text-amber-700">não enviado</span>}</td>
                <td className="text-xs">
                  {r.attended ? (
                    <div className="flex flex-col items-start gap-1">
                      <a href={`${siteUrl}/certificado/${r.certificate_code}`} target="_blank" rel="noopener noreferrer" className="font-mono text-brand-700 hover:underline">{r.certificate_code}</a>
                      <span className="flex items-center gap-2">
                        {r.certificate_sent_at ? (
                          <span className="text-brand-700" title={formatDateTime(r.certificate_sent_at) ?? undefined}>enviado {formatDate(r.certificate_sent_at, { day: "2-digit", month: "2-digit" })}</span>
                        ) : (
                          <span className="text-amber-700">não enviado</span>
                        )}
                        <button type="button" className="text-brand-700 underline disabled:opacity-50" disabled={busy} onClick={() => run(() => sendCertificates(kind, [r.id]))}>
                          {r.certificate_sent_at ? "reenviar" : "enviar"}
                        </button>
                      </span>
                    </div>
                  ) : (
                    <span className="text-zinc-400">após presença</span>
                  )}
                </td>
                <td className="text-right">
                  {isAdmin && (
                    <button
                      type="button"
                      className="adm-btn-ghost adm-btn-sm text-red-600"
                      disabled={busy}
                      onClick={() => confirm(`Excluir a inscrição de ${r.name}?`) && run(() => deleteRegistration(kind === "evento" ? "registrations" : "training_registrations", r.id))}
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!list.length && <p className="p-8 text-center text-sm text-zinc-500">Nenhuma inscrição.</p>}
      </div>
    </div>
  );
}
