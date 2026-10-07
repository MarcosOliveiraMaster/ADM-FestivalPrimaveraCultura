import { type NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { csvResponse } from "@/lib/registrations";
import { formatDateTime } from "@/shared/format";

export async function GET(req: NextRequest) {
  const { supabase, profile } = await getSession();
  if (!profile) return new Response("Sem permissão", { status: 403 });
  const page = req.nextUrl.searchParams.get("page") ?? "";
  const { data } = await supabase.from("training_registrations").select("name, email, phone, created_at, email_sent_at").eq("page_id", page).order("created_at");
  return csvResponse("capacitacao", ["Nome", "E-mail", "Telefone", "Inscrição", "Confirmação enviada"], (data ?? []).map((r) => [r.name, r.email, r.phone, formatDateTime(r.created_at), r.email_sent_at ? "Sim" : "Não"]));
}
