import type { AreaKind } from "@/shared/types";
import type { createClient } from "./supabase/server";

type Db = Awaited<ReturnType<typeof createClient>>;

export interface AreaPageSummary {
  id: string;
  title: string;
  slug: string;
  status: string;
  starts_at: string | null;
  capacity: number | null;
  registration_enabled: boolean;
  total: number;
  attended: number;
}

/** Páginas de uma área com a contagem de inscrições (e presenças, nos eventos). */
export async function areaPagesWithCounts(supabase: Db, kind: AreaKind): Promise<AreaPageSummary[]> {
  const table = kind === "capacitacao" ? "training_registrations" : "registrations";
  const [{ data: pages }, { data: regs }] = await Promise.all([
    supabase.from("pages").select("id, title, slug, status, starts_at, capacity, registration_enabled").eq("kind", kind).order("sort_order"),
    supabase.from(table).select(kind === "capacitacao" ? "page_id" : "page_id, attended"),
  ]);
  const count: Record<string, { total: number; attended: number }> = {};
  for (const r of (regs ?? []) as unknown as { page_id: string; attended?: boolean }[]) {
    const c = (count[r.page_id] ??= { total: 0, attended: 0 });
    c.total++;
    if (r.attended) c.attended++;
  }
  return (pages ?? []).map((p) => ({ ...p, total: count[p.id]?.total ?? 0, attended: count[p.id]?.attended ?? 0 })) as AreaPageSummary[];
}

export function csvCell(v: unknown) {
  const s = v === null || v === undefined ? "" : String(v);
  const safe = /^[=+\-@]/.test(s) ? `'${s}` : s; // evita fórmulas maliciosas no Excel
  return `"${safe.replace(/"/g, '""')}"`;
}

export function csvResponse(name: string, header: string[], rows: unknown[][]) {
  const csv = "﻿" + [header.map(csvCell).join(";"), ...rows.map((r) => r.map(csvCell).join(";"))].join("\r\n");
  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${name}-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
