"use server";
import { revalidatePath } from "next/cache";
import { requireAdmin, requireStaff } from "@/lib/auth";

export type RegKind = "evento" | "cortejo" | "capacitacao";
/** Todas as inscrições (eventos, cortejos e capacitações) ficam em training_registrations (sem login). */
const TABLE = { evento: "training_registrations", cortejo: "training_registrations", capacitacao: "training_registrations" } as const;
const PATH = { evento: "/inscricoes", cortejo: "/inscricoes", capacitacao: "/inscricoes" } as const;

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

export async function deleteRegistration(kind: RegKind, id: string): Promise<CertResult> {
  const { supabase } = await requireAdmin();
  const { error } = await supabase.from(TABLE[kind]).delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath(PATH[kind], "layout");
  return { ok: true };
}

/**
 * Reenvia os e-mails de confirmação que ainda não saíram (sem chave configurada,
 * falha de envio ou limite diário). Vale para eventos e capacitações.
 */
export async function resendPendingConfirmations(kind: RegKind, pageId: string) {
  const { supabase } = await requireStaff();
  const table = TABLE[kind];
  const fn = "confirmar-capacitacao";
  const { data } = await supabase.from(table).select("id").eq("page_id", pageId).is("email_sent_at", null).limit(200);
  let sent = 0;
  let failed = 0;
  for (const r of data ?? []) {
    const { error } = await supabase.functions.invoke(fn, { body: { registration_id: r.id } });
    if (error) failed++;
    else sent++;
  }
  revalidatePath(PATH[kind], "layout");
  return { ok: true as const, sent, failed };
}

/** Salva o modelo de certificado de uma página ("padrao" = modelo do festival). null = volta ao padrão. */
export async function saveCertificateTemplate(target: string, template: unknown | null) {
  const { supabase } = await requireStaff();
  const q =
    target === "padrao"
      ? supabase.from("site_settings").update({ certificate_template: template }).eq("id", 1)
      : supabase.from("pages").update({ certificate_template: template }).eq("id", target);
  const { error } = await q;
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/certificados", "layout");
  return { ok: true as const };
}
