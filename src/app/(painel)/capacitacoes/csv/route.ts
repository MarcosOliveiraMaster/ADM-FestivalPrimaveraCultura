import { type NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { csvResponse } from "@/lib/registrations";
import { formatDateTime } from "@/shared/format";
import { formatCpf } from "@/shared/certificate";

export async function GET(req: NextRequest) {
  const { supabase, profile } = await getSession();
  if (!profile) return new Response("Sem permissão", { status: 403 });
  const page = req.nextUrl.searchParams.get("page") ?? "";
  const { data } = await supabase.from("training_registrations").select("name, email, phone, cpf, created_at, email_sent_at, attended, certificate_code, certificate_sent_at").eq("page_id", page).order("created_at");
  return csvResponse("inscritos", ["Nome", "E-mail", "Telefone", "CPF", "Inscrição", "Confirmação enviada", "Presença", "Código do certificado", "Certificado enviado"], (data ?? []).map((r) => [r.name, r.email, r.phone, formatCpf(r.cpf), formatDateTime(r.created_at), r.email_sent_at ? "Sim" : "Não", r.attended ? "Sim" : "Não", r.attended ? r.certificate_code : "", r.certificate_sent_at ? formatDateTime(r.certificate_sent_at) : ""]));
}
