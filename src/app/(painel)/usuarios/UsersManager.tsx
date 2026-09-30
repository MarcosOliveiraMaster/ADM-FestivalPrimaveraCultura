"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, UserPlus } from "lucide-react";
import type { AppRole } from "@/shared/types";
import { formatDate } from "@/shared/format";
import { cancelInvite, changeRole, inviteUser, removeUser } from "./actions";

export function UsersManager({ me, profiles, invites }: { me: string; profiles: { id: string; email: string; full_name: string | null; role: AppRole; created_at: string }[]; invites: { email: string; role: AppRole; created_at: string }[] }) {
  const router = useRouter();
  const [busy, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<AppRole>("editor");
  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, after?: () => void) =>
    start(async () => {
      const r = await fn();
      setError(r.ok ? null : r.error ?? "Erro");
      if (r.ok) after?.();
      router.refresh();
    });
  const origin = typeof window !== "undefined" ? window.location.origin : "";

  return (
    <div className="flex flex-col gap-6">
      <form
        className="adm-card flex flex-wrap items-end gap-3 p-5"
        onSubmit={(e) => {
          e.preventDefault();
          run(() => inviteUser(email, role), () => setEmail(""));
        }}
      >
        <label className="adm-label min-w-60 flex-1">Convidar por e-mail<input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="adm-input" placeholder="pessoa@exemplo.com" /></label>
        <label className="adm-label">Papel
          <select value={role} onChange={(e) => setRole(e.target.value as AppRole)} className="adm-input">
            <option value="editor">Editor</option>
            <option value="admin">Administrador</option>
          </select>
        </label>
        <button className="adm-btn-primary" disabled={busy}><UserPlus size={16} /> Convidar</button>
        <p className="adm-help w-full">
          Depois de convidar, envie para a pessoa o link <b>{origin}/primeiro-acesso</b>. Ela cria a senha com esse mesmo e-mail e confirma pelo link que chega na caixa de entrada.
        </p>
      </form>
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

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
          <div className="border-b border-zinc-200 px-4 py-3 text-sm font-semibold">Convites aguardando primeiro acesso</div>
          <table className="adm-table">
            <tbody>
              {invites.map((i) => (
                <tr key={i.email}>
                  <td>{i.email}</td>
                  <td><span className="adm-badge bg-zinc-100 text-zinc-700">{i.role === "admin" ? "Administrador" : "Editor"}</span></td>
                  <td className="text-xs text-zinc-500">convidado em {formatDate(i.created_at, { day: "2-digit", month: "short" })}</td>
                  <td className="text-right"><button type="button" className="adm-btn-ghost adm-btn-sm text-red-600" disabled={busy} onClick={() => run(() => cancelInvite(i.email))}>Cancelar</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
