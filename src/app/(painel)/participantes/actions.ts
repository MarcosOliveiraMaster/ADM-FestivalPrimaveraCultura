"use server";
import { revalidatePath } from "next/cache";
import { requireAdmin, requireStaff } from "@/lib/auth";

export type RegKind = "evento" | "capacitacao";
const TABLE = { evento: "registrations", capacitacao: "training_registrations" } as const;
const PATH = { evento: "/participantes", capacitacao: "/capacitacoes" } as const;

export interface CertResult {
  ok: boolean;
  error?: string;
  sent?: number;
  failed?: number;
}

/** Marca/desmarca presença (libera ou bloqueia o certificado). Com `send`, já envia o certificado por e-mail. */
export async function setAttendance(ids: string[], attended: boolean, kind: RegKind = "evento", send = false): Promise<CertResult> {
  const { supabase } = await requireStaff();
  if (!ids.length) return { ok: true };
  const { error } = await supabase.from(TABLE[kind]).update({ attended }).in("id", ids);
  if (error) return { ok: false, error: error.message };
  revalidatePath(PATH[kind], "layout");
  if (attended && send) return sendCertificates(kind, ids);
  return { ok: true };
}

/**
 * Envia por e-mail o link do certificado. Sem `ids`, envia para todos os presentes da página
 * que ainda não receberam. Inscrições sem presença são ignoradas pela função de envio.
 */
export async function sendCertificates(kind: RegKind, ids?: string[], pageId?: string): Promise<CertResult> {
  const { supabase } = await requireStaff();
  let list = ids ?? [];
  if (!ids && pageId) {
    const { data } = await supabase.from(TABLE[kind]).select("id").eq("page_id", pageId).eq("attended", true).is("certificate_sent_at", null).limit(1000);
    list = (data ?? []).map((r) => r.id as string);
  }
  if (!list.length) return { ok: true, sent: 0, failed: 0 };
  let sent = 0;
  let failed = 0;
  for (let i = 0; i < list.length; i += 50) {
    const { data, error } = await supabase.functions.invoke("enviar-certificado", { body: { kind, ids: list.slice(i, i + 50) } });
    if (error) {
      let msg = error.message;
      try {
        const body = await (error as { context?: Response }).context?.json();
        if (body?.error) msg = body.error;
      } catch {}
      revalidatePath(PATH[kind], "layout");
      return { ok: false, error: `Não foi possível enviar: ${msg}`, sent, failed };
    }
    sent += data?.sent ?? 0;
    failed += data?.failed ?? 0;
  }
  revalidatePath(PATH[kind], "layout");
  return { ok: true, sent, failed };
}

export async function deleteRegistration(table: "registrations" | "training_registrations", id: string) {
  const { supabase } = await requireAdmin();
  const { error } = await supabase.from(table).delete().eq("id", id);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath(table === "registrations" ? "/participantes" : "/capacitacoes", "layout");
  return { ok: true as const };
}

/**
 * Reenvia os e-mails de confirmação que ainda não saíram (sem chave configurada,
 * falha de envio ou limite diário). Vale para eventos e capacitações.
 */
export async function resendPendingConfirmations(kind: "evento" | "capacitacao", pageId: string) {
  const { supabase } = await requireStaff();
  const table = kind === "evento" ? "registrations" : "training_registrations";
  const fn = kind === "evento" ? "confirmar-inscricao" : "confirmar-capacitacao";
  const { data } = await supabase.from(table).select("id").eq("page_id", pageId).is("email_sent_at", null).limit(200);
  let sent = 0;
  let failed = 0;
  for (const r of data ?? []) {
    const { error } = await supabase.functions.invoke(fn, { body: { registration_id: r.id } });
    if (error) failed++;
    else sent++;
  }
  revalidatePath(kind === "evento" ? "/participantes" : "/capacitacoes", "layout");
  return { ok: true as const, sent, failed };
}
