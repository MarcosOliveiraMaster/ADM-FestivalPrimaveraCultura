"use server";
import { revalidatePath } from "next/cache";
import { requireAdmin, requireStaff } from "@/lib/auth";
import type { AppRole } from "@/shared/types";

const ok = () => ({ ok: true as const });
const fail = (error: string) => ({ ok: false as const, error });

export interface InviteLink { email: string; link: string; expiresAt: string; emailSent: boolean }

/** Gera (ou renova) o link único do convite, válido por 7 dias, e envia por e-mail. */
async function issueInviteLink(supabase: Awaited<ReturnType<typeof requireAdmin>>["supabase"], email: string) {
  const { data, error } = await supabase.functions.invoke("enviar-convite", { body: { email } });
  if (error || !data?.link) return null;
  return { email, link: data.link as string, expiresAt: data.expiresAt as string, emailSent: !!data.emailSent };
}

export interface InviteResult { email: string; ok: boolean; error?: string; invite?: InviteLink }

/** Separa uma lista de e-mails (vírgula, ponto e vírgula, espaço ou quebra de linha). */
function parseEmails(text: string) {
  return [...new Set(text.split(/[\s,;]+/).map((e) => e.trim().toLowerCase()).filter(Boolean))];
}

/**
 * Convida várias pessoas de uma vez. Cada e-mail recebe o próprio link (válido por 7 dias)
 * e os convites ficam na lista "aguardando primeiro acesso" até cada pessoa criar a conta.
 */
export async function inviteUsers(text: string, role: AppRole) {
  const { supabase, user } = await requireAdmin();
  const emails = parseEmails(text);
  if (!emails.length) return { ok: false as const, error: "Informe ao menos um e-mail.", results: [] as InviteResult[] };
  if (emails.length > 50) return { ok: false as const, error: "Envie no máximo 50 convites por vez.", results: [] as InviteResult[] };
  const { data: team } = await supabase.from("profiles").select("email").in("email", emails);
  const already = new Set((team ?? []).map((t) => t.email));
  const results: InviteResult[] = [];
  for (const e of emails) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) {
      results.push({ email: e, ok: false, error: "E-mail inválido." });
      continue;
    }
    if (already.has(e)) {
      results.push({ email: e, ok: false, error: "Já faz parte da equipe." });
      continue;
    }
    const { error } = await supabase.from("staff_invites").upsert({ email: e, role, invited_by: user.id });
    if (error) {
      results.push({ email: e, ok: false, error: error.message });
      continue;
    }
    const invite = await issueInviteLink(supabase, e);
    results.push(invite ? { email: e, ok: true, invite } : { email: e, ok: false, error: "Convite salvo, mas o link não foi gerado. Use “Gerar novo link”." });
  }
  revalidatePath("/usuarios");
  return { ok: results.some((r) => r.ok), results };
}

/** Gera links novos para todos os convites vencidos (ou para os e-mails informados). */
export async function renewExpiredInvites() {
  const { supabase } = await requireAdmin();
  const { data } = await supabase.from("staff_invites").select("email, token_expires_at");
  const expired = (data ?? []).filter((i) => !i.token_expires_at || new Date(i.token_expires_at) < new Date()).map((i) => i.email);
  const results: InviteResult[] = [];
  for (const e of expired) {
    const invite = await issueInviteLink(supabase, e);
    results.push(invite ? { email: e, ok: true, invite } : { email: e, ok: false, error: "Não foi possível gerar o link." });
  }
  revalidatePath("/usuarios");
  return { ok: true as const, results };
}

export async function renewInvite(email: string) {
  const { supabase } = await requireAdmin();
  const invite = await issueInviteLink(supabase, email);
  revalidatePath("/usuarios");
  if (!invite) return fail("Não foi possível gerar o link.");
  return { ok: true as const, invite };
}

export async function cancelInvite(email: string) {
  const { supabase } = await requireAdmin();
  const { error } = await supabase.from("staff_invites").delete().eq("email", email);
  if (error) return fail(error.message);
  revalidatePath("/usuarios");
  return ok();
}

export async function changeRole(id: string, role: AppRole) {
  const { supabase, user } = await requireAdmin();
  if (id === user.id) return fail("Você não pode mudar o seu próprio papel.");
  const { error } = await supabase.from("profiles").update({ role }).eq("id", id);
  if (error) return fail(error.message);
  revalidatePath("/usuarios");
  return ok();
}

export async function removeUser(id: string) {
  const { supabase, user } = await requireAdmin();
  if (id === user.id) return fail("Você não pode remover a si mesmo.");
  const { error } = await supabase.from("profiles").delete().eq("id", id);
  if (error) return fail(error.message);
  revalidatePath("/usuarios");
  return ok();
}

export async function updateMyName(name: string) {
  const { supabase, user } = await requireStaff();
  const { error } = await supabase.from("profiles").update({ full_name: name.trim() || null }).eq("id", user.id);
  if (error) return fail(error.message);
  revalidatePath("/", "layout");
  return ok();
}
