import type { createClient } from "./supabase/server";
import type { SubmissionStatus } from "@/shared/types";

export interface SubmissionFilters {
  q?: string;
  status?: string;
  page?: string;
  de?: string;
  ate?: string;
}

export interface Submission {
  id: string;
  page_id: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  city: string | null;
  interests: string[];
  heard_from: string | null;
  message: string | null;
  consent: boolean;
  newsletter: boolean;
  utm: Record<string, string>;
  referrer: string | null;
  status: SubmissionStatus;
  notes: string | null;
  created_at: string;
}

export const STATUS_LABEL: Record<SubmissionStatus, string> = { novo: "Novo", contatado: "Contatado", confirmado: "Confirmado", descartado: "Descartado" };

export function querySubmissions(supabase: Awaited<ReturnType<typeof createClient>>, f: SubmissionFilters, limit = 1000) {
  let q = supabase.from("form_submissions").select("*", { count: "exact" }).order("created_at", { ascending: false }).limit(limit);
  if (f.status && f.status !== "todos") q = q.eq("status", f.status);
  if (f.page === "sem") q = q.is("page_id", null);
  else if (f.page && f.page !== "todas") q = q.eq("page_id", f.page);
  if (f.de) q = q.gte("created_at", new Date(`${f.de}T00:00:00-03:00`).toISOString());
  if (f.ate) q = q.lte("created_at", new Date(`${f.ate}T23:59:59-03:00`).toISOString());
  if (f.q) {
    const term = f.q.replace(/[%,()]/g, " ").trim();
    if (term) q = q.or(`name.ilike.%${term}%,email.ilike.%${term}%,city.ilike.%${term}%,phone.ilike.%${term}%`);
  }
  return q;
}
