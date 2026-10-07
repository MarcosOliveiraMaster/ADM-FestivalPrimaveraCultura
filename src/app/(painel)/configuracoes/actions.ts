"use server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import type { SiteSettings } from "@/shared/types";

export async function updateSettings(patch: Partial<SiteSettings>) {
  const { supabase, user } = await requireAdmin();
  const allowed: (keyof SiteSettings)[] = ["festival_name", "tagline", "location", "starts_at", "ends_at", "schedule_text", "brand", "theme", "nav", "footer", "social", "privacy_text"];
  const clean = Object.fromEntries(Object.entries(patch).filter(([k]) => allowed.includes(k as keyof SiteSettings)).map(([k, v]) => [k, v === "" ? null : v]));
  if ("festival_name" in clean && !clean.festival_name) return { ok: false as const, error: "O nome do festival é obrigatório." };
  if (clean.starts_at && clean.ends_at && new Date(clean.ends_at as string) < new Date(clean.starts_at as string)) return { ok: false as const, error: "O término é antes do início." };
  const { error } = await supabase.from("site_settings").update({ ...clean, updated_by: user.id }).eq("id", 1);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/", "layout");
  return { ok: true as const };
}
