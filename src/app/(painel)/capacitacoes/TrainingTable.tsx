"use client";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MessageCircle, Trash2 } from "lucide-react";
import { formatDateTime } from "@/shared/format";
import { deleteRegistration } from "../participantes/actions";

export interface TrainingRow { id: string; name: string; email: string; phone: string | null; email_sent_at: string | null; created_at: string }

export function TrainingTable({ rows, isAdmin }: { rows: TrainingRow[]; isAdmin: boolean }) {
  const router = useRouter();
  const [busy, start] = useTransition();
  const [q, setQ] = useState("");
  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    return t ? rows.filter((r) => `${r.name} ${r.email} ${r.phone ?? ""}`.toLowerCase().includes(t)) : rows;
  }, [rows, q]);
  const wa = (phone: string) => `https://wa.me/${(phone.replace(/\D/g, "").length <= 11 ? "55" : "") + phone.replace(/\D/g, "")}`;
  return (
    <div className="flex flex-col gap-3">
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nome, e-mail ou telefone" className="adm-input max-w-xs" />
      <div className="adm-card overflow-x-auto">
        <table className="adm-table">
          <thead><tr><th>Nome</th><th>Contato</th><th className="hidden md:table-cell">Inscrição</th><th className="hidden sm:table-cell">E-mail de confirmação</th><th /></tr></thead>
          <tbody>
            {list.map((r) => (
              <tr key={r.id}>
                <td className="font-medium">{r.name}</td>
                <td>
                  <a href={`mailto:${r.email}`} className="block text-sm hover:underline">{r.email}</a>
                  {r.phone && <a href={wa(r.phone)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-brand-700 hover:underline"><MessageCircle size={12} /> {r.phone}</a>}
                </td>
                <td className="hidden text-xs text-zinc-500 md:table-cell">{formatDateTime(r.created_at)}</td>
                <td className="hidden text-xs sm:table-cell">{r.email_sent_at ? <span className="text-brand-700">enviado</span> : <span className="text-amber-700">não enviado</span>}</td>
                <td className="text-right">
                  {isAdmin && (
                    <button type="button" className="adm-btn-ghost adm-btn-sm text-red-600" disabled={busy} onClick={() => confirm(`Excluir a inscrição de ${r.name}?`) && start(async () => { await deleteRegistration("training_registrations", r.id); router.refresh(); })}>
                      <Trash2 size={14} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!list.length && <p className="p-8 text-center text-sm text-zinc-500">Nenhuma inscrição ainda.</p>}
      </div>
    </div>
  );
}
