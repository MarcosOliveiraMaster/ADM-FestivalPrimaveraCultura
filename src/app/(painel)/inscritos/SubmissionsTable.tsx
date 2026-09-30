"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MessageCircle, Trash2 } from "lucide-react";
import { Modal } from "@/components/Modal";
import { STATUS_LABEL, type Submission } from "@/lib/submissions";
import { formatDateTime } from "@/shared/format";
import type { SubmissionStatus } from "@/shared/types";
import { deleteSubmission, updateSubmission } from "./actions";

const STATUS_CLS: Record<SubmissionStatus, string> = {
  novo: "bg-amber-100 text-amber-800",
  contatado: "bg-sky-100 text-sky-800",
  confirmado: "bg-emerald-100 text-emerald-800",
  descartado: "bg-zinc-100 text-zinc-600",
};

function whatsapp(phone: string | null) {
  const d = (phone ?? "").replace(/\D/g, "");
  if (d.length < 10) return null;
  return `https://wa.me/${d.length <= 11 ? `55${d}` : d}`;
}

export function SubmissionsTable({ rows, total, pages }: { rows: Submission[]; total: number; pages: Record<string, string> }) {
  const [open, setOpen] = useState<Submission | null>(null);
  if (!rows.length) return <div className="adm-card p-10 text-center text-sm text-zinc-500">Nenhum inscrito encontrado.</div>;
  return (
    <>
      <div className="adm-card overflow-x-auto">
        <table className="adm-table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Contato</th>
              <th className="hidden md:table-cell">Cidade</th>
              <th className="hidden lg:table-cell">Origem</th>
              <th>Status</th>
              <th className="hidden sm:table-cell">Data</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} onClick={() => setOpen(r)} className="cursor-pointer">
                <td className="font-medium">{r.name}</td>
                <td className="text-zinc-600">
                  <div>{r.email}</div>
                  {r.phone && <div className="text-xs">{r.phone}</div>}
                </td>
                <td className="hidden text-zinc-600 md:table-cell">{r.city ?? "—"}</td>
                <td className="hidden text-xs text-zinc-500 lg:table-cell">
                  {r.page_id ? pages[r.page_id] ?? "—" : "—"}
                  {r.utm?.source && <div>via {r.utm.source}</div>}
                </td>
                <td><span className={`adm-badge ${STATUS_CLS[r.status]}`}>{STATUS_LABEL[r.status]}</span></td>
                <td className="hidden whitespace-nowrap text-xs text-zinc-500 sm:table-cell">{formatDateTime(r.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-zinc-500">{total > rows.length ? `Mostrando ${rows.length} de ${total}. Use os filtros ou exporte a planilha para ver todos.` : `${total} inscrito(s).`}</p>
      {open && <Detail row={open} pageTitle={open.page_id ? pages[open.page_id] : undefined} onClose={() => setOpen(null)} />}
    </>
  );
}

function Item({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs text-zinc-500">{label}</div>
      <div className="text-sm">{children || "—"}</div>
    </div>
  );
}

function Detail({ row, pageTitle, onClose }: { row: Submission; pageTitle?: string; onClose: () => void }) {
  const router = useRouter();
  const [status, setStatus] = useState<SubmissionStatus>(row.status);
  const [notes, setNotes] = useState(row.notes ?? "");
  const [busy, start] = useTransition();
  const wa = whatsapp(row.phone);
  return (
    <Modal
      open
      onClose={onClose}
      title={row.name}
      wide
      footer={
        <>
          <button
            type="button"
            className="adm-btn-ghost mr-auto text-red-600"
            disabled={busy}
            onClick={() =>
              confirm("Excluir definitivamente os dados desta pessoa? (use para pedidos de exclusão pela LGPD)") &&
              start(async () => {
                await deleteSubmission(row.id);
                onClose();
                router.refresh();
              })
            }
          >
            <Trash2 size={16} /> Excluir dados
          </button>
          <button type="button" className="adm-btn-secondary" onClick={onClose}>Fechar</button>
          <button
            type="button"
            className="adm-btn-primary"
            disabled={busy}
            onClick={() =>
              start(async () => {
                await updateSubmission(row.id, { status, notes: notes || null });
                onClose();
                router.refresh();
              })
            }
          >
            Salvar
          </button>
        </>
      }
    >
      <div className="grid gap-6 md:grid-cols-2">
        <div className="grid grid-cols-2 gap-4">
          <Item label="E-mail">{row.email && <a className="text-brand-600 hover:underline" href={`mailto:${row.email}`}>{row.email}</a>}</Item>
          <Item label="WhatsApp">{row.phone}</Item>
          <Item label="Cidade">{row.city}</Item>
          <Item label="Como conheceu">{row.heard_from}</Item>
          <Item label="Página de origem">{pageTitle}</Item>
          <Item label="Campanha / origem">{[row.utm?.source, row.utm?.medium, row.utm?.campaign].filter(Boolean).join(" / ") || (row.referrer ? new URL(row.referrer).host : "")}</Item>
          <Item label="Interesses">{row.interests?.join(", ")}</Item>
          <Item label="Quer novidades?">{row.newsletter ? "Sim" : "Não"}</Item>
          <Item label="Enviado em">{formatDateTime(row.created_at)}</Item>
          <Item label="Consentimento LGPD">{row.consent ? "Sim" : "Não"}</Item>
          {row.message && <div className="col-span-2"><Item label="Mensagem"><p className="whitespace-pre-line">{row.message}</p></Item></div>}
        </div>
        <div className="flex flex-col gap-4">
          {wa && (
            <a href={wa} target="_blank" rel="noopener noreferrer" className="adm-btn bg-[#25D366] text-white hover:brightness-95"><MessageCircle size={16} /> Conversar no WhatsApp</a>
          )}
          <div className="adm-label">
            Status do atendimento
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(STATUS_LABEL) as SubmissionStatus[]).map((s) => (
                <button type="button" key={s} onClick={() => setStatus(s)} className={`rounded-lg border px-3 py-2 text-sm ${status === s ? "border-brand-500 bg-brand-50 font-medium" : "border-zinc-200"}`}>{STATUS_LABEL[s]}</button>
              ))}
            </div>
          </div>
          <label className="adm-label">Observações internas<textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={5} className="adm-input" placeholder="Visíveis só para a equipe" /></label>
        </div>
      </div>
    </Modal>
  );
}
