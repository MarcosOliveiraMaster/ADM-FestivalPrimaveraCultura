"use server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";

export type Audience =
  | { type: "capacitacao" | "evento"; page_id: string }
  | { type: "capacitacoes" | "eventos" }
  | { type: "leads"; only_newsletter: boolean };

export interface SendResult { ok: boolean; error?: string; sent?: number; failed?: number; recipients?: number; to?: string }

/** Envia a mensagem (ou um teste para o próprio e-mail) pela função enviar-mensagem. */
export async function sendMessage(input: { subject: string; message: string; audience: Audience; audience_label: string; test: boolean }): Promise<SendResult> {
  const { supabase } = await requireAdmin();
  if (!input.subject.trim() || !input.message.trim()) return { ok: false, error: "Preencha o assunto e a mensagem." };
  const { data, error } = await supabase.functions.invoke("enviar-mensagem", { body: input });
  if (error) {
    let msg = "Não foi possível enviar.";
    try { msg = (await (error as { context?: Response }).context?.json())?.error ?? msg; } catch { /* corpo sem JSON */ }
    return { ok: false, error: msg };
  }
  revalidatePath("/comunicados");
  return data as SendResult;
}
