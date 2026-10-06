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
