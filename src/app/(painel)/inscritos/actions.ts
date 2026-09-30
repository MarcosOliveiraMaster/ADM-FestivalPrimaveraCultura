"use server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import type { SubmissionStatus } from "@/shared/types";

export async function updateSubmission(id: string, patch: { status?: SubmissionStatus; notes?: string | null }) {
  const { supabase } = await requireAdmin();
  const { error } = await supabase.from("form_submissions").update(patch).eq("id", id);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/inscritos");
  revalidatePath("/", "layout");
  return { ok: true as const };
}

export async function deleteSubmission(id: string) {
  const { supabase } = await requireAdmin();
  const { error } = await supabase.from("form_submissions").delete().eq("id", id);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/inscritos");
  return { ok: true as const };
}
