"use client";
import { useEffect, useMemo, useState, useTransition } from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import { useRouter } from "next/navigation";
import { Award, Download, MessageCircle, Send, Trash2 } from "lucide-react";
import { formatDate, formatDateTime } from "@/shared/format";
import { googleFontsHref } from "@/shared/theme";
import type { Theme } from "@/shared/types";
import { certFileName, certValues, maskCpf, templateFonts, type CertEvent, type CertTemplate } from "@/shared/certificate";
import { CertificateView } from "@/shared/render/CertificateView";
import { certificatePdf, downloadBlob, qrDataUrl } from "@/shared/certificatePdf";
import { Modal } from "@/components/Modal";
import { deleteRegistration, sendCertificates, setAttendance, type CertResult, type RegKind } from "./actions";

/** Inscrição (evento, cortejo ou capacitação). */
export interface AttendanceRow {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  cpf?: string | null;
  attended: boolean;
  certificate_code: string;
  certificate_sent_at: string | null;
  email_sent_at: string | null;
  created_at: string;
}

export interface CertContext {
  template: CertTemplate;
  theme: Theme;
  festival: string;
  event: CertEvent;
}

const AUTO_KEY = "adm:cert-auto-send";
const wa = (phone: string) => `https://wa.me/${(phone.replace(/\D/g, "").length <= 11 ? "55" : "") + phone.replace(/\D/g, "")}`;
const byName = (a: AttendanceRow, b: AttendanceRow) => a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" });

/** Lista de inscritos com presença, certificado (e-mail com link e download em ZIP) e exclusão. */
export function AttendanceTable({ rows, kind, isAdmin, siteUrl, cert }: { rows: AttendanceRow[]; kind: RegKind; pageId: string; isAdmin: boolean; siteUrl: string; cert: CertContext }) {
  const router = useRouter();
  const [busy, start] = useTransition();
  const [q, setQ] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [auto, setAuto] = useState(true);
  const [dialog, setDialog] = useState<"email" | "zip" | null>(null);

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
    return t ? rows.filter((r) => `${r.name} ${r.email} ${r.phone ?? ""} ${r.cpf ?? ""}`.toLowerCase().includes(t)) : rows;
  }, [rows, q]);
  const notPresent = list.filter((r) => !r.attended).map((r) => r.id);
  const present = useMemo(() => rows.filter((r) => r.attended).sort(byName), [rows]);

  const run = (fn: () => Promise<CertResult>) =>
    start(async () => {
      setNotice(null);
      const r = await fn();
      setError(r.ok ? null : r.error ?? "Erro");
      if (r.sent || r.failed) setNotice(`${r.sent ?? 0} certificado(s) enviado(s) por e-mail${r.failed ? ` · ${r.failed} com falha` : ""}.`);
      router.refresh();
    });

  const fonts = googleFontsHref(cert.theme, templateFonts(cert.template));

  return (
    <div className="flex flex-col gap-3">
      {fonts && <link rel="stylesheet" href={fonts} crossOrigin="anonymous" />}
      <div className="flex flex-wrap items-center gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nome, e-mail, telefone ou CPF" className="adm-input max-w-xs" />
        <button
          type="button"
          className="adm-btn-secondary"
          disabled={busy || !notPresent.length}
          onClick={() => confirm(`Marcar presença de ${notPresent.length} pessoa(s)?${auto ? "\n\nO certificado será enviado por e-mail para cada uma." : ""}`) && run(() => setAttendance(notPresent, true, kind, auto))}
        >
          <Award size={16} /> Marcar todos como presentes
        </button>
        <button type="button" className="adm-btn-primary" disabled={busy || !present.length} onClick={() => setDialog("email")}>
          <Send size={16} /> Enviar certificados por e-mail
        </button>
        <button type="button" className="adm-btn-secondary" disabled={busy || !present.length} onClick={() => setDialog("zip")}>
          <Download size={16} /> Download certificados
        </button>
      </div>
      <label className="flex items-center gap-2 text-sm text-zinc-600">
        <input type="checkbox" className="h-4 w-4 accent-brand-500" checked={auto} onChange={(e) => toggleAuto(e.target.checked)} />
        Enviar o certificado por e-mail ao marcar presença
      </label>
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
                  <div className="flex flex-wrap gap-x-3 text-xs">
                    {r.phone && (
                      <a href={wa(r.phone)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-brand-700 hover:underline">
                        <MessageCircle size={12} /> {r.phone}
                      </a>
                    )}
                    {r.cpf && <span className="text-zinc-500" title="CPF parcialmente oculto">CPF {maskCpf(r.cpf)}</span>}
                  </div>
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
                    <button type="button" className="adm-btn-ghost adm-btn-sm text-red-600" disabled={busy} onClick={() => confirm(`Excluir a inscrição de ${r.name}?`) && run(() => deleteRegistration(kind, r.id))}>
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

      {dialog && (
        <CertDialog
          mode={dialog}
          people={present}
          onClose={() => setDialog(null)}
          onEmail={(ids) => {
            setDialog(null);
            run(() => sendCertificates(kind, ids));
          }}
          cert={cert}
          siteUrl={siteUrl}
        />
      )}
    </div>
  );
}

/** Popup de confirmação: presentes em ordem alfabética, todos marcados. Envia por e-mail ou gera o ZIP. */
function CertDialog({ mode, people, onClose, onEmail, cert, siteUrl }: { mode: "email" | "zip"; people: AttendanceRow[]; onClose: () => void; onEmail: (ids: string[]) => void; cert: CertContext; siteUrl: string }) {
  const [checked, setChecked] = useState<Set<string>>(() => new Set(people.map((p) => p.id)));
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const chosen = people.filter((p) => checked.has(p.id));
  const all = chosen.length === people.length;

  function toggle(id: string) {
    setChecked((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  async function makeZip() {
    setError(null);
    setProgress({ done: 0, total: chosen.length });
    const landscape = cert.template.orientation !== "portrait";
    const host = document.createElement("div");
    host.style.cssText = `position:fixed;left:-20000px;top:0;width:${landscape ? 1123 : 794}px;pointer-events:none`;
    document.body.appendChild(host);
    const root = createRoot(host);
    try {
      const { default: JSZip } = await import("jszip");
      const zip = new JSZip();
      const used = new Map<string, number>();
      for (let i = 0; i < chosen.length; i++) {
        const p = chosen[i];
        const qr = cert.template.qr.enabled ? await qrDataUrl(`${siteUrl}/certificado/${p.certificate_code}`) : null;
        const values = certValues({ name: p.name, cpf: p.cpf, email: p.email, phone: p.phone, code: p.certificate_code }, cert.event, cert.festival);
        flushSync(() => root.render(<CertificateView template={cert.template} values={values} qr={qr} theme={cert.theme} />));
        const node = host.firstElementChild as HTMLElement;
        const pdf = await certificatePdf(node, cert.template.orientation);
        let name = certFileName(p.name);
        const n = used.get(name) ?? 0;
        used.set(name, n + 1);
        if (n) name = name.replace(/\.pdf$/, `-${n + 1}.pdf`);
        zip.file(name, pdf);
        setProgress({ done: i + 1, total: chosen.length });
      }
      const blob = await zip.generateAsync({ type: "blob" });
      downloadBlob(blob, `certificados-${certFileName(cert.event.title).replace(/\.pdf$/, "")}.zip`);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? `Não foi possível gerar os certificados: ${e.message}` : "Não foi possível gerar os certificados.");
    } finally {
      root.unmount();
      host.remove();
      setProgress(null);
    }
  }

  const pct = progress ? Math.round((progress.done / Math.max(progress.total, 1)) * 100) : 0;
  return (
    <Modal
      open
      onClose={progress ? () => {} : onClose}
      title={mode === "email" ? "Enviar certificados por e-mail" : "Download dos certificados (ZIP)"}
      wide
      footer={
        <>
          <span className="mr-auto self-center text-sm text-zinc-500">{chosen.length} de {people.length} selecionado(s)</span>
          <button type="button" className="adm-btn-ghost" onClick={onClose} disabled={!!progress}>Cancelar</button>
          {mode === "email" ? (
            <button type="button" className="adm-btn-primary" disabled={!chosen.length} onClick={() => onEmail(chosen.map((p) => p.id))}>
              <Send size={16} /> Enviar para {chosen.length}
            </button>
          ) : (
            <button type="button" className="adm-btn-primary" disabled={!chosen.length || !!progress} onClick={makeZip}>
              <Download size={16} /> {progress ? `Gerando… ${pct}%` : `Baixar ${chosen.length} certificado(s)`}
            </button>
          )}
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <p className="text-sm text-zinc-600">
          {mode === "email"
            ? "Cada pessoa marcada recebe um e-mail com o link para ver e baixar o próprio certificado."
            : "Um PDF por pessoa marcada, com o modelo de certificado desta página, reunidos em um arquivo ZIP."}{" "}
          Só aparecem participantes com presença confirmada.
        </p>
        <label className="flex items-center gap-2 border-b border-zinc-200 pb-2 text-sm font-medium">
          <input type="checkbox" className="h-4 w-4 accent-brand-500" checked={all} onChange={() => setChecked(all ? new Set() : new Set(people.map((p) => p.id)))} disabled={!!progress} />
          Selecionar todos
        </label>
        <ul className="flex max-h-[45vh] flex-col gap-1 overflow-y-auto">
          {people.map((p) => (
            <li key={p.id}>
              <label className="flex items-center gap-3 rounded-lg px-2 py-1.5 text-sm hover:bg-zinc-50">
                <input type="checkbox" className="h-4 w-4 accent-brand-500" checked={checked.has(p.id)} onChange={() => toggle(p.id)} disabled={!!progress} />
                <span className="min-w-0 flex-1">
                  <span className="font-medium">{p.name}</span> <span className="text-zinc-500">· {p.email}</span>
                </span>
                {mode === "email" && p.certificate_sent_at && <span className="text-xs text-brand-700">já enviado</span>}
              </label>
            </li>
          ))}
        </ul>
        {progress && (
          <div className="h-2 overflow-hidden rounded-full bg-zinc-100">
            <div className="h-full rounded-full bg-brand-500 transition-all" style={{ width: `${pct}%` }} />
          </div>
        )}
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      </div>
    </Modal>
  );
}
