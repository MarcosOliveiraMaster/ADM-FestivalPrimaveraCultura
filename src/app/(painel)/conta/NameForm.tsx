"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateMyName } from "../usuarios/actions";

export function NameForm({ initial }: { initial: string }) {
  const router = useRouter();
  const [name, setName] = useState(initial);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, start] = useTransition();
  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await updateMyName(name);
          setMsg(r.ok ? "Salvo." : r.error);
          router.refresh();
        });
      }}
    >
      <input value={name} onChange={(e) => setName(e.target.value)} className="adm-input" placeholder="Seu nome" />
      {msg && <span className="text-sm text-zinc-600">{msg}</span>}
      <button className="adm-btn-primary self-start" disabled={busy}>Salvar</button>
    </form>
  );
}
