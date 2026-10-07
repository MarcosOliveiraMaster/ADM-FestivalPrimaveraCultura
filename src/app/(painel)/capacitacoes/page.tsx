import { requireStaff } from "@/lib/auth";
import { PageHeader, Container } from "@/components/PageHeader";
import { AreaPagesList } from "@/components/AreaPagesList";
import { areaPagesWithCounts } from "@/lib/registrations";

export const metadata = { title: "Capacitações" };

export default async function CapacitacoesPage() {
  const { supabase, profile } = await requireStaff();
  const pages = await areaPagesWithCounts(supabase, "capacitacao");
  const total = pages.reduce((s, p) => s + p.total, 0);
  const open = pages.filter((p) => p.registration_enabled).length;
  const vagas = pages.reduce((s, p) => s + (p.capacity ?? 0), 0);
  return (
    <>
      <PageHeader title="Capacitações" description="Capacitações criadas e as inscrições recebidas pelo formulário (nome, e-mail e telefone, sem login)." actions={
          <>
            {profile.role === "admin" && <a href="/comunicados?publico=capacitacoes" className="adm-btn-secondary">Enviar mensagem a todos os inscritos</a>}
            <a href="/paginas" className="adm-btn-primary">Criar capacitação</a>
          </>
        }
      />
      <Container className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="adm-card p-5"><div className="text-xs uppercase tracking-wide text-zinc-500">Capacitações</div><div className="text-2xl font-semibold">{pages.length}</div><div className="text-sm text-zinc-500">{open} com inscrições abertas</div></div>
          <div className="adm-card p-5"><div className="text-xs uppercase tracking-wide text-zinc-500">Inscrições</div><div className="text-2xl font-semibold">{total}</div><div className="text-sm text-zinc-500">{vagas ? `${vagas} vagas ofertadas` : "sem limite de vagas definido"}</div></div>
          <div className="adm-card p-5"><div className="text-xs uppercase tracking-wide text-zinc-500">Mais procurada</div><div className="truncate text-lg font-semibold">{total ? [...pages].sort((a, b) => b.total - a.total)[0].title : "—"}</div><div className="text-sm text-zinc-500">{total ? `${Math.max(...pages.map((p) => p.total))} inscrição(ões)` : "nenhuma inscrição ainda"}</div></div>
        </div>
        <AreaPagesList pages={pages} base="/capacitacoes" empty="Nenhuma capacitação ainda. Em Páginas e eventos → Nova página, escolha o tipo Capacitação." />
      </Container>
    </>
  );
}
