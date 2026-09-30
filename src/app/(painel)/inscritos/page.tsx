import { requireAdmin } from "@/lib/auth";
import { PageHeader, Container } from "@/components/PageHeader";
import { querySubmissions, type Submission, type SubmissionFilters } from "@/lib/submissions";
import { SubmissionsTable } from "./SubmissionsTable";
import { Download } from "lucide-react";

export const metadata = { title: "Inscritos" };

export default async function SubmissionsPage({ searchParams }: PageProps<"/inscritos">) {
  const sp = await searchParams;
  const f: SubmissionFilters = Object.fromEntries(Object.entries(sp).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]));
  const { supabase } = await requireAdmin();
  const [{ data, count }, { data: pages }, { data: counts }] = await Promise.all([
    querySubmissions(supabase, f, 500),
    supabase.from("pages").select("id, title").order("sort_order"),
    supabase.from("form_submissions").select("status"),
  ]);
  const byStatus = (counts ?? []).reduce<Record<string, number>>((acc, r) => ((acc[r.status] = (acc[r.status] ?? 0) + 1), acc), {});
  const qs = new URLSearchParams(Object.entries(f).filter(([, v]) => v) as [string, string][]).toString();
  return (
    <>
      <PageHeader
        title="Inscritos"
        description="Pessoas que enviaram o formulário de interesse. Os dados ficam só aqui no painel."
        actions={<a href={`/inscritos/csv${qs ? `?${qs}` : ""}`} className="adm-btn-secondary"><Download size={16} /> Exportar planilha (CSV)</a>}
      />
      <Container>
        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {(["novo", "contatado", "confirmado", "descartado"] as const).map((s) => (
            <a key={s} href={`/inscritos?status=${s}`} className={`adm-card p-4 ${f.status === s ? "ring-2 ring-brand-500" : ""}`}>
              <div className="text-xs uppercase tracking-wide text-zinc-500">{{ novo: "Novos", contatado: "Contatados", confirmado: "Confirmados", descartado: "Descartados" }[s]}</div>
              <div className="mt-1 text-2xl font-semibold">{byStatus[s] ?? 0}</div>
            </a>
          ))}
        </div>
        <form className="adm-card mb-4 flex flex-wrap items-end gap-3 p-4">
          <label className="adm-label min-w-48 flex-1">Buscar<input name="q" defaultValue={f.q} placeholder="Nome, e-mail, cidade, telefone" className="adm-input" /></label>
          <label className="adm-label">Status
            <select name="status" defaultValue={f.status ?? "todos"} className="adm-input">
              <option value="todos">Todos</option>
              <option value="novo">Novo</option>
              <option value="contatado">Contatado</option>
              <option value="confirmado">Confirmado</option>
              <option value="descartado">Descartado</option>
            </select>
          </label>
          <label className="adm-label">Página de origem
            <select name="page" defaultValue={f.page ?? "todas"} className="adm-input">
              <option value="todas">Todas</option>
              {(pages ?? []).map((p) => (<option key={p.id} value={p.id}>{p.title}</option>))}
              <option value="sem">Sem página</option>
            </select>
          </label>
          <label className="adm-label">De<input type="date" name="de" defaultValue={f.de} className="adm-input" /></label>
          <label className="adm-label">Até<input type="date" name="ate" defaultValue={f.ate} className="adm-input" /></label>
          <button className="adm-btn-primary">Filtrar</button>
          {qs && <a href="/inscritos" className="adm-btn-ghost">Limpar</a>}
        </form>
        <SubmissionsTable rows={(data ?? []) as Submission[]} total={count ?? 0} pages={Object.fromEntries((pages ?? []).map((p) => [p.id, p.title]))} />
      </Container>
    </>
  );
}
