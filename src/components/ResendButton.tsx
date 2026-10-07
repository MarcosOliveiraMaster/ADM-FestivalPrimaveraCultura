"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Send } from "lucide-react";
import { resendPendingConfirmations } from "@/app/(painel)/participantes/actions";

/** Reenvia os e-mails de confirmação pendentes de uma página (evento ou capacitação). */
export function ResendButton({ kind, pageId, pending }: { kind: "evento" | "capacitacao"; pageId: string; pending: number }) {
  const router = useRouter();
  const [busy, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  if (!pending && !msg) return null;
  return (
    <span className="flex items-center gap-2">
      {pending > 0 && (
        <button
          type="button"
          className="adm-btn-secondary"
          disabled={busy}
          onClick={() =>
            start(async () => {
              const r = await resendPendingConfirmations(kind, pageId);
              setMsg(r.failed ? `${r.sent} enviado(s), ${r.failed} com falha — confira a configuração de e-mail.` : `${r.sent} e-mail(s) enviado(s).`);
              router.refresh();
            })
          }
        >
          <Send size={16} /> {busy ? "Enviando…" : `Reenviar confirmações pendentes (${pending})`}
        </button>
      )}
      {msg && <span className="text-xs text-zinc-600">{msg}</span>}
    </span>
  );
}
