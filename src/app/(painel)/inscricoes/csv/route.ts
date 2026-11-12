import { type NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { csvResponse } from "@/lib/registrations";
import { formatDateTime } from "@/shared/format";
import { formatCpf } from "@/shared/certificate";
import { answerText, pageForms, type Address } from "@/shared/forms";
import type { PageContent } from "@/shared/types";

/** Inscritos de uma página em CSV, com endereço e uma coluna por pergunta extra dos formulários. */
export async function GET(req: NextRequest) {
  const { supabase, profile } = await getSession();
  if (!profile) return new Response("Sem permissão", { status: 403 });
  const page = req.nextUrl.searchParams.get("page") ?? "";
  const [{ data: pg }, { data }] = await Promise.all([
    supabase.from("pages").select("content").eq("id", page).maybeSingle(),
    supabase
      .from("training_registrations")
      .select("form_id, name, email, phone, cpf, address, answers, created_at, email_sent_at, attended, certificate_code, certificate_sent_at")
      .eq("page_id", page)
      .order("created_at"),
  ]);
  const forms = pageForms(pg?.content as PageContent);
  const formTitle = Object.fromEntries(forms.map((f) => [f.id, f.title]));
  // Colunas extras: perguntas dos formulários + chaves antigas que só existem nas respostas.
  const extra = new Map<string, string>();
  for (const f of forms) for (const c of f.props.custom ?? []) extra.set(c.key, c.label);
  for (const r of data ?? []) for (const k of Object.keys((r.answers as Record<string, unknown>) ?? {})) if (!extra.has(k)) extra.set(k, k);
  const keys = [...extra.keys()];
  const addrCols: (keyof Address)[] = ["cep", "rua", "numero", "complemento", "bairro", "cidade", "uf"];

  return csvResponse(
    "inscritos",
    ["Nome", "E-mail", "Telefone", "CPF", ...["CEP", "Rua", "Número", "Complemento", "Bairro", "Cidade", "UF"], ...keys.map((k) => extra.get(k)!), "Formulário", "Inscrição", "Confirmação enviada", "Presença", "Código do certificado", "Certificado enviado"],
    (data ?? []).map((r) => {
      const a = (r.address ?? {}) as Address;
      const ans = (r.answers ?? {}) as Record<string, unknown>;
      return [
        r.name, r.email, r.phone, formatCpf(r.cpf),
        ...addrCols.map((c) => a[c] ?? ""),
        ...keys.map((k) => answerText(ans[k])),
        formTitle[r.form_id ?? ""] ?? "",
        formatDateTime(r.created_at), r.email_sent_at ? "Sim" : "Não", r.attended ? "Sim" : "Não", r.attended ? r.certificate_code : "",
        r.certificate_sent_at ? formatDateTime(r.certificate_sent_at) : "",
      ];
    }),
  );
}
