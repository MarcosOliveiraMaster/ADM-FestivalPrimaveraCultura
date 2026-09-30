import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { querySubmissions, STATUS_LABEL, type Submission } from "@/lib/submissions";
import { formatDateTime } from "@/shared/format";

function cell(v: unknown) {
  const s = v === null || v === undefined ? "" : String(v);
  const safe = /^[=+\-@]/.test(s) ? `'${s}` : s; // evita fórmulas maliciosas no Excel
  return `"${safe.replace(/"/g, '""')}"`;
}

export async function GET(req: NextRequest) {
  const { supabase, profile } = await getSession();
  if (profile?.role !== "admin") return new NextResponse("Sem permissão", { status: 403 });
  const f = Object.fromEntries(req.nextUrl.searchParams.entries());
  const [{ data }, { data: pages }] = await Promise.all([querySubmissions(supabase, f, 10000), supabase.from("pages").select("id, title")]);
  const titles = Object.fromEntries((pages ?? []).map((p) => [p.id, p.title]));
  const header = ["Data", "Nome", "E-mail", "WhatsApp", "Cidade", "Interesses", "Como conheceu", "Mensagem", "Novidades", "Status", "Observações", "Página", "Origem (UTM)"];
  const lines = ((data ?? []) as Submission[]).map((r) =>
    [
      formatDateTime(r.created_at), r.name, r.email, r.phone, r.city, r.interests?.join("; "), r.heard_from, r.message, r.newsletter ? "Sim" : "Não",
      STATUS_LABEL[r.status], r.notes, r.page_id ? titles[r.page_id] : "", [r.utm?.source, r.utm?.medium, r.utm?.campaign].filter(Boolean).join(" / "),
    ].map(cell).join(";"),
  );
  const csv = "﻿" + [header.map(cell).join(";"), ...lines].join("\r\n");
  return new NextResponse(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="inscritos-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
