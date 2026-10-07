import { requireAdmin } from "@/lib/auth";
import { PageHeader, Container } from "@/components/PageHeader";
import { formatDate } from "@/shared/format";
import { Composer, type AudienceOption } from "./Composer";

export const metadata = { title: "Comunicados" };
export const maxDuration = 300; // envios grandes podem levar alguns minutos

const STATUS: Record<string, [string, string]> = {
  sending: ["Enviando", "bg-amber-50 text-amber-700"],
  sent: ["Enviado", "bg-brand-50 text-brand-700"],
  partial: ["Parcial", "bg-amber-50 text-amber-700"],
  failed: ["Falhou", "bg-red-50 text-red-700"],
};

const uniq = (rows: { email: string | null }[] | null) => new Set((rows ?? []).map((r) => (r.email ?? "").trim().toLowerCase()).filter(Boolean)).size;

export default async function ComunicadosPage({ searchParams }: PageProps<"/comunicados">) {
  const sp = await searchParams;
  const { supabase } = await requireAdmin();
  const [{ data: pages }, { data: trainings }, { data: regs }, { data: leads }, { data: history }] = await Promise.all([
    supabase.from("pages").select("id, title, kind").in("kind", ["capacitacao", "evento"]).order("sort_order"),
    supabase.from("training_registrations").select("page_id, email"),
    supabase.from("registrations").select("page_id, email"),
    supabase.from("form_submissions").select("email, newsletter"),
    supabase.from("email_campaigns").select("id, subject, audience_label, recipients, sent, failed, status, error, created_at").order("created_at", { ascending: false }).limit(30),
  ]);

  const byPage = (rows: { page_id: string; email: string | null }[] | null, id: string) => uniq((rows ?? []).filter((r) => r.page_id === id));
  const caps = (pages ?? []).filter((p) => p.kind === "capacitacao");
  const evts = (pages ?? []).filter((p) => p.kind === "evento");
  const options: AudienceOption[] = [
    { key: "capacitacoes", label: "Todas as capacitações", group: "Capacitações", count: uniq(trainings), audience: { type: "capacitacoes" } },
    ...caps.map((p) => ({ key: `capacitacao:${p.id}`, label: p.title, group: "Capacitações", count: byPage(trainings, p.id), audience: { type: "capacitacao" as const, page_id: p.id } })),
    { key: "leads-news", label: "Leads do formulário principal (aceitaram receber novidades)", group: "Formulário principal", count: uniq((leads ?? []).filter((l) => l.newsletter)), audience: { type: "leads", only_newsletter: true } },
    { key: "leads", label: "Leads do formulário principal (todos)", group: "Formulário principal", count: uniq(leads), audience: { type: "leads", only_newsletter: false } },
    { key: "eventos", label: "Todos os eventos", group: "Eventos", count: uniq(regs), audience: { type: "eventos" } },
    ...evts.map((p) => ({ key: `evento:${p.id}`, label: p.title, group: "Eventos", count: byPage(regs, p.id), audience: { type: "evento" as const, page_id: p.id } })),
  ];
  const initial = typeof sp.publico === "string" && options.some((o) => o.key === sp.publico) ? sp.publico : "capacitacoes";

  return (
    <>
      <PageHeader title="Comunicados" description="Envie um e-mail para um grupo de cadastrados: inscritos das capacitações, dos eventos ou leads do formulário principal. Cada pessoa recebe a mensagem individualmente." />
      <Container className="flex flex-col gap-6">
        <Composer options={options} initial={initial} />
        <div className="adm-card overflow-x-auto">
          <div className="border-b border-zinc-200 px-4 py-3 text-sm font-semibold">Histórico de envios</div>
          {history?.length ? (
            <table className="adm-table">
              <thead><tr><th>Assunto</th><th className="hidden md:table-cell">Público</th><th>Enviados</th><th>Situação</th><th className="hidden sm:table-cell">Data</th></tr></thead>
              <tbody>
                {history.map((h) => {
                  const [label, cls] = STATUS[h.status] ?? [h.status, "bg-zinc-100 text-zinc-600"];
                  return (
                    <tr key={h.id}>
                      <td className="font-medium">{h.subject}</td>
                      <td className="hidden text-sm text-zinc-500 md:table-cell">{h.audience_label ?? "—"}</td>
                      <td>{h.sent} / {h.recipients}{h.failed ? <span className="text-red-600"> ({h.failed} falha{h.failed > 1 ? "s" : ""})</span> : null}</td>
                      <td><span className={`adm-badge ${cls}`} title={h.error ?? undefined}>{label}</span></td>
                      <td className="hidden text-xs text-zinc-500 sm:table-cell">{formatDate(h.created_at, { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : <p className="p-8 text-center text-sm text-zinc-500">Nenhum comunicado enviado ainda.</p>}
        </div>
      </Container>
    </>
  );
}
