import type { createClient } from "./supabase/server";

type Client = Awaited<ReturnType<typeof createClient>>;

export async function profileNames(supabase: Client, ids: (string | null)[]) {
  const uniq = [...new Set(ids.filter(Boolean))] as string[];
  if (!uniq.length) return {} as Record<string, string>;
  const { data } = await supabase.from("profiles").select("id, full_name, email").in("id", uniq);
  return Object.fromEntries((data ?? []).map((p) => [p.id, p.full_name || p.email.split("@")[0]])) as Record<string, string>;
}
