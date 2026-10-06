"use client";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Award, Trash2 } from "lucide-react";
import { formatDateTime } from "@/shared/format";
import { deleteRegistration, setAttendance } from "./actions";

export interface AttendanceRow { id: string; full_name: string; email: string; attended: boolean; certificate_code: string; created_at: string }

export function AttendanceTable({ rows, isAdmin, siteUrl }: { rows: AttendanceRow[]; isAdmin: boolean; siteUrl: string }) {
  const router = useRouter();
  const [busy, start] = useTransition();
  const [q, setQ] = useState("");
  const [error, setError] = useState<string | null>(null);
  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    return t ? rows.filter((r) => `${r.full_name} ${r.email}`.toLowerCase().includes(t)) : rows;
  }, [rows, q]);
  const run = (fn: () => Promise<{ ok: boolean; error?: string }>) =>
    start(async () => {
      const r = await fn();
      setError(r.ok ? null : r.error ?? "Erro");
      router.refresh();
    });
  const pending = list.filter((r) => !r.attended).map((r) => r.id);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nome ou e-mail" className="adm-input max-w-xs" />
        <button type="button" className="adm-btn-secondary" disabled={busy || !pending.length} onClick={() => confirm(`Marcar presença de ${pending.length} pessoa(s)?`) && run(() => setAttendance(pending, true))}>
          <Award size={16} /> Marcar todos como presentes
        </button>
      </div>
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <div className="adm-card overflow-x-auto">
        <table className="adm-table">
          <thead><tr><th>Presença</th><th>Participante</th><th className="hidden md:table-cell">Inscrição</th><th>Certificado</th><th /></tr></thead>
          <tbody>
            {list.map((r) => (
              <tr key={r.id}>
                <td>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" className="h-5 w-5 accent-brand-500" checked={r.attended} disabled={busy} onChange={(e) => run(() => setAttendance([r.id], e.target.checked))} />
                    {r.attended ? "Presente" : "—"}
                  </label>
                </td>
                <td><div className="font-medium">{r.full_name}</div><div className="text-xs text-zinc-500">{r.email}</div></td>
                <td className="hidden text-xs text-zinc-500 md:table-cell">{formatDateTime(r.created_at)}</td>
                <td className="text-xs">
                  {r.attended ? <a href={`${siteUrl}/certificado/${r.certificate_code}`} target="_blank" rel="noopener noreferrer" className="text-brand-700 hover:underline">{r.certificate_code}</a> : <span className="text-zinc-400">após presença</span>}
                </td>
                <td className="text-right">
                  {isAdmin && (
                    <button type="button" className="adm-btn-ghost adm-btn-sm text-red-600" disabled={busy} onClick={() => confirm(`Excluir a inscrição de ${r.full_name}?`) && run(() => deleteRegistration("registrations", r.id))}>
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
