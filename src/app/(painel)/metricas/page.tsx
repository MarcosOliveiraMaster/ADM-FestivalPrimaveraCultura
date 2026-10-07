import { requireAdmin } from "@/lib/auth";
import { PageHeader, Container } from "@/components/PageHeader";
import { getMetrics, periodRange } from "@/lib/metrics";
import { BarList, DailyChart } from "@/components/charts";
import { UtmBuilder } from "@/components/UtmBuilder";
import { SITE_URL } from "@/lib/supabase/env";

export const metadata = { title: "Métricas" };

const PERIODS = [["7", "7 dias"], ["30", "30 dias"], ["90", "90 dias"], ["365", "12 meses"]] as const;
const DEVICE: Record<string, string> = { mobile: "Celular", tablet: "Tablet", desktop: "Computador" };

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="adm-card p-5">
      <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">{label}</div>
      <div className="mt-1 text-3xl font-semibold tabular-nums text-zinc-900">{value}</div>
      {hint && <div className="mt-1 text-xs text-zinc-500">{hint}</div>}
    </div>
  );
}

function Card({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`adm-card p-5 ${className}`}>
      <h2 className="mb-4 text-sm font-semibold text-zinc-900">{title}</h2>
      {children}
    </section>
  );
}

function clickLabel(target: string, label: string | null) {
  const [kind, ...rest] = target.split(":");
  const name = label || rest.join(":");
  const kinds: Record<string, string> = { evento: "Card de evento", "menu-evento": "Menu → evento", botao: "Botão", link: "Link", social: "Rede social", logo: "Logo", agenda: "Adicionar à agenda", imagem: "Imagem" };
  return `${kinds[kind] ?? kind}: ${name}`;
}

export default async function MetricsPage({ searchParams }: PageProps<"/metricas">) {
  const { periodo } = await searchParams;
  const days = Number(PERIODS.find(([v]) => v === periodo)?.[0] ?? 30);
  const { supabase } = await requireAdmin();
  const { from, to } = periodRange(days);
  const m = await getMetrics(supabase, from, to);
  if (!m) return <Container><p className="text-sm text-red-600">Não foi possível carregar as métricas.</p></Container>;
  const conv = m.totals.visitors ? (m.totals.submissions / m.totals.visitors) * 100 : 0;
  const n = (v: number) => v.toLocaleString("pt-BR");
  return (
    <>
      <PageHeader
        title="Métricas"
        description="Estatísticas anônimas do site público (sem cookies)."
        actions={
          <div className="flex gap-1 rounded-lg bg-zinc-100 p-1 text-sm">
            {PERIODS.map(([v, l]) => (
              <a key={v} href={`/metricas?periodo=${v}`} className={`rounded-md px-3 py-1 ${Number(v) === days ? "bg-white font-medium shadow-sm" : "text-zinc-600"}`}>{l}</a>
            ))}
          </div>
        }
      />
      <Container className="flex flex-col gap-5">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Stat label="Visitantes" value={n(m.totals.visitors)} hint="pessoas únicas por dia" />
          <Stat label="Visitas" value={n(m.totals.views)} hint="páginas abertas" />
          <Stat label="Inscrições" value={n(m.totals.submissions)} hint="formulários enviados" />
          <Stat label="Conversão" value={`${conv.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`} hint="visitantes que se inscreveram" />
        </div>
        <Card title="Por dia"><DailyChart rows={m.daily} /></Card>
        <div className="grid gap-5 lg:grid-cols-2">
          <Card title="Páginas mais vistas">
            {m.pages.length ? (
              <div className="overflow-x-auto">
                <table className="adm-table">
                  <thead><tr><th>Página</th><th className="text-right">Visitantes</th><th className="text-right">Inscrições</th><th className="text-right">Conversão</th></tr></thead>
                  <tbody>
                    {m.pages.map((p, i) => (
                      <tr key={i}>
                        <td><div className="font-medium">{p.title ?? p.path}</div><div className="text-xs text-zinc-500">{p.path}</div></td>
                        <td className="text-right tabular-nums">{n(p.visitors)}</td>
                        <td className="text-right tabular-nums">{n(p.submissions)}</td>
                        <td className="text-right tabular-nums">{p.visitors ? `${((p.submissions / p.visitors) * 100).toFixed(1)}%` : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <p className="py-6 text-center text-sm text-zinc-500">Sem visitas no período.</p>}
          </Card>
          <Card title="Cliques (eventos, botões e links)">
            <BarList items={m.clicks.map((c) => ({ label: clickLabel(c.target, c.label), value: c.clicks, hint: `${c.people} pessoa(s)` }))} empty="Nenhum clique registrado no período." />
          </Card>
          <Card title="De onde vêm os visitantes">
            <BarList items={m.sources.map((s) => ({ label: s.source, value: s.visitors }))} />
          </Card>
          <Card title="Dispositivo">
            <BarList items={m.devices.map((d) => ({ label: DEVICE[d.device] ?? d.device, value: d.visitors }))} />
          </Card>
          <Card title="Cidades dos inscritos">
            <BarList items={m.cities.map((c) => ({ label: c.city, value: c.n }))} empty="Nenhuma cidade informada." />
          </Card>
          <Card title="Como conheceram o festival">
            <BarList items={m.heard.map((c) => ({ label: c.label, value: c.n }))} empty="Sem respostas no período." />
          </Card>
        </div>
        <Card title="Gerador de links rastreáveis (UTM)"><UtmBuilder siteUrl={SITE_URL} /></Card>
      </Container>
    </>
  );
}
