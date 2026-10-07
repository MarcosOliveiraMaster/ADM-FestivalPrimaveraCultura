import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "./supabase/server";
import type { AppRole } from "@/shared/types";

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: AppRole;
}

export const getSession = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return { supabase, user: null, profile: null };
  const { data: profile } = await supabase.from("profiles").select("id, email, full_name, role").eq("id", data.user.id).maybeSingle();
  return { supabase, user: data.user, profile: (profile as Profile | null) ?? null };
});

/** Exige usuário da equipe (admin ou editor). */
export async function requireStaff() {
  const s = await getSession();
  if (!s.user) redirect("/login");
  if (!s.profile) redirect("/auth/sem-acesso");
  return s as { supabase: typeof s.supabase; user: NonNullable<typeof s.user>; profile: Profile };
}

export async function requireAdmin() {
  const s = await requireStaff();
  if (s.profile.role !== "admin") redirect("/?erro=permissao");
  return s;
}
