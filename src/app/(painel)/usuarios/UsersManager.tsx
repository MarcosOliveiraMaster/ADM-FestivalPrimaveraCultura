"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, RefreshCw, Trash2, UserPlus } from "lucide-react";
import type { AppRole } from "@/shared/types";
import { formatDate } from "@/shared/format";
import { cancelInvite, changeRole, inviteUsers, removeUser, renewExpiredInvites, renewInvite, type InviteLink, type InviteResult } from "./actions";

export function UsersManager({ me, profiles, invites }: { me: string; profiles: { id: string; email: string; full_name: string | null; role: AppRole; created_at: string }[]; invites: { email: string; role: AppRole; created_at: string; token_expires_at: string | null }[] }) {
  const router = useRouter();
  const [busy, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<AppRole>("editor");
  const [results, setResults] = useState<InviteResult[]>([]);
  const [copied, setCopied] = useState<string | null>(null);
  const [now] = useState(() => Date.now());
  const run = (fn: () => Promise<{ ok: boolean; error?: string; invite?: InviteLink; results?: InviteResult[] }>, after?: () => void) =>
    start(async () => {
      const r = await fn();
      setError(r.ok ? null : r.error ?? (r.results?.length ? null : "Erro"));
      if (r.ok) after?.();
      if (r.results) setResults(r.results);
      else if (r.invite) setResults([{ email: r.invite.email, ok: true, invite: r.invite }]);
      router.refresh();
    });
  const count = email.split(/[\s,;]+/).filter((e) => e.includes("@")).length;
  const expired = invites.filter((i) => !i.token_expires_at || new Date(i.token_expires_at).getTime() <= now).length;

  return (
    <div className="flex flex-col gap-6">
      <form
        className="adm-card flex flex-wrap items-end gap-3 p-5"
        onSubmit={(e) => {
          e.preventDefault();
          run(() => inviteUsers(email, role), () => setEmail(""));
        }}
      >
        <label className="adm-label min-w-60 flex-1">
          Convidar por e-mail (um ou vários)
          <textarea required rows={3} value={email} onChange={(e) => setEmail(e.target.value)} className="adm-input" placeholder={"pessoa@exemplo.com\noutra@exemplo.com"} />
        </label>
        <label className="adm-label">Papel
          <select value={role} onChange={(e) => setRole(e.target.value as AppRole)} className="adm-input">
            <option value="editor">Editor</option>
            <option value="admin">Administrador</option>
          </select>
        </label>
        <button className="adm-btn-primary" disabled={busy || !count}><UserPlus size={16} /> {busy ? "Enviando…" : count > 1 ? `Convidar ${count} pessoas` : "Convidar"}</button>
        <p className="adm-help w-full">
          Separe os e-mails por linha, vírgula ou espaço. Cada pessoa recebe por e-mail um <b>link pessoal válido por 7 dias</b> e fica na lista abaixo até criar a conta. Pelo link ela só define nome e senha (o e-mail já vem preenchido). Sem esse link não é possível criar conta.
        </p>
      </form>
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {results.length > 0 && (
        <div className="adm-card flex flex-col gap-2 border-brand-200 bg-brand-50 p-4">
          <div className="flex items-center justify-between text-sm font-semibold text-brand-800">
            <span>{results.filter((r) => r.ok).length} de {results.length} convite(s) gerado(s)</span>
            <button type="button" className="text-xs font-normal text-zinc-500 hover:underline" onClick={() => setResults([])}>fechar</button>
          </div>
          <ul className="flex flex-col gap-2">
            {results.map((r) => (
              <li key={r.email} className="flex flex-col gap-1 rounded-lg bg-white p-2 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium">{r.email}</span>
                  {r.ok ? (
                    <span className={r.invite?.emailSent ? "text-brand-700" : "text-amber-700"}>{r.invite?.emailSent ? "e-mail enviado ✓" : "e-mail não enviado — copie o link"}</span>
                  ) : (
                    <span className="text-red-600">{r.error}</span>
                  )}
                </div>
                {r.invite && (
                  <div className="flex gap-2">
                    <input readOnly value={r.invite.link} className="adm-input font-mono text-xs" onFocus={(e) => e.currentTarget.select()} />
                    <button type="button" className="adm-btn-secondary shrink-0" onClick={() => navigator.clipboard.writeText(r.invite!.link).then(() => setCopied(r.email))}>
                      {copied === r.email ? <Check size={14} /> : <Copy size={14} />}
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
          <span className="adm-help">Cada link é de uso único e vale por 7 dias.</span>
        </div>
      )}

      <div className="adm-card overflow-x-auto">
        <table className="adm-table">
          <thead><tr><th>Pessoa</th><th>Papel</th><th className="hidden sm:table-cell">Desde</th><th /></tr></thead>
          <tbody>
            {profiles.map((p) => (
              <tr key={p.id}>
                <td>
                  <div className="font-medium">{p.full_name || p.email.split("@")[0]} {p.id === me && <span className="text-xs text-zinc-500">(você)</span>}</div>
                  <div className="text-xs text-zinc-500">{p.email}</div>
                </td>
                <td>
                  <select value={p.role} disabled={p.id === me || busy} onChange={(e) => run(() => changeRole(p.id, e.target.value as AppRole))} className="adm-input !w-auto !py-1">
                    <option value="editor">Editor</option>
                    <option value="admin">Administrador</option>
                  </select>
                </td>
                <td className="hidden text-xs text-zinc-500 sm:table-cell">{formatDate(p.created_at, { day: "2-digit", month: "short", year: "numeric" })}</td>
                <td className="text-right">
                  {p.id !== me && (
                    <button type="button" className="adm-btn-ghost adm-btn-sm text-red-600" disabled={busy} onClick={() => confirm(`Remover o acesso de ${p.email}?`) && run(() => removeUser(p.id))}>
                      <Trash2 size={14} /> Remover
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {invites.length > 0 && (
        <div className="adm-card overflow-x-auto">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-200 px-4 py-3">
            <span className="text-sm font-semibold">Convites aguardando primeiro acesso ({invites.length})</span>
            {expired > 0 && (
              <button type="button" className="adm-btn-secondary adm-btn-sm" disabled={busy} onClick={() => run(() => renewExpiredInvites())}>
                <RefreshCw size={14} /> Reenviar {expired} link(s) vencido(s)
              </button>
            )}
          </div>
          <table className="adm-table">
            <tbody>
              {invites.map((i) => (
                <tr key={i.email}>
                  <td>{i.email}</td>
                  <td><span className="adm-badge bg-zinc-100 text-zinc-700">{i.role === "admin" ? "Administrador" : "Editor"}</span></td>
                  <td className="text-xs text-zinc-500">
                    {i.token_expires_at && new Date(i.token_expires_at).getTime() > now
                      ? <span className="text-brand-700">aguardando · link válido até {formatDate(i.token_expires_at, { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</span>
                      : <span className="text-amber-700">link vencido</span>}
                  </td>
                  <td className="whitespace-nowrap text-right">
                    <button type="button" className="adm-btn-ghost adm-btn-sm" disabled={busy} onClick={() => run(() => renewInvite(i.email))}><RefreshCw size={14} /> Gerar novo link</button>
                    <button type="button" className="adm-btn-ghost adm-btn-sm text-red-600" disabled={busy} onClick={() => run(() => cancelInvite(i.email))}>Cancelar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
