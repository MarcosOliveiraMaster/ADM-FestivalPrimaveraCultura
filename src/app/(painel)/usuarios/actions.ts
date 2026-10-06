"use server";
import { revalidatePath } from "next/cache";
import { requireAdmin, requireStaff } from "@/lib/auth";
import type { AppRole } from "@/shared/types";

const ok = () => ({ ok: true as const });
const fail = (error: string) => ({ ok: false as const, error });

export interface InviteLink { email: string; link: string; expiresAt: string; emailSent: boolean }

/** Gera (ou renova) o link único do convite, válido por 1 hora, e envia por e-mail. */
async function issueInviteLink(supabase: Awaited<ReturnType<typeof requireAdmin>>["supabase"], email: string) {
  const { data, error } = await supabase.functions.invoke("enviar-convite", { body: { email } });
  if (error || !data?.link) return null;
  return { email, link: data.link as string, expiresAt: data.expiresAt as string, emailSent: !!data.emailSent };
}

export async function inviteUser(email: string, role: AppRole) {
  const { supabase, user } = await requireAdmin();
  const e = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return fail("E-mail inválido.");
  const { data: existing } = await supabase.from("profiles").select("id").eq("email", e).maybeSingle();
  if (existing) return fail("Essa pessoa já faz parte da equipe.");
  const { error } = await supabase.from("staff_invites").upsert({ email: e, role, invited_by: user.id });
  if (error) return fail(error.message);
  const invite = await issueInviteLink(supabase, e);
  revalidatePath("/usuarios");
  if (!invite) return fail("Convite salvo, mas não foi possível gerar o link. Tente “Gerar novo link”.");
  return { ok: true as const, invite };
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
