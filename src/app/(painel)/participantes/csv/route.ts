import { type NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { csvResponse } from "@/lib/registrations";
import { formatDateTime } from "@/shared/format";

export async function GET(req: NextRequest) {
  const { supabase, profile } = await getSession();
  if (!profile) return new Response("Sem permissão", { status: 403 });
  const page = req.nextUrl.searchParams.get("page") ?? "";
  const { data } = await supabase.from("registrations").select("full_name, email, attended, certificate_code, created_at").eq("page_id", page).order("created_at");
  return csvResponse("participantes", ["Nome", "E-mail", "Presença", "Código do certificado", "Inscrição"], (data ?? []).map((r) => [r.full_name, r.email, r.attended ? "Sim" : "Não", r.attended ? r.certificate_code : "", formatDateTime(r.created_at)]));
}
