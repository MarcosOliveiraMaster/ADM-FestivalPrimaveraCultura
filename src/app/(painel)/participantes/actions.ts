"use server";
import { revalidatePath } from "next/cache";
import { requireAdmin, requireStaff } from "@/lib/auth";

/** Marca/desmarca presença (libera ou bloqueia o certificado do participante). */
export async function setAttendance(ids: string[], attended: boolean) {
  const { supabase } = await requireStaff();
  if (!ids.length) return { ok: true as const };
  const { error } = await supabase.from("registrations").update({ attended }).in("id", ids);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/participantes", "layout");
  return { ok: true as const };
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
