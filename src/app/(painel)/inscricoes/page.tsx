import { requireStaff } from "@/lib/auth";
import { PageHeader, Container } from "@/components/PageHeader";
import { AreaPagesList } from "@/components/AreaPagesList";
import { areaPagesWithCounts } from "@/lib/registrations";

export const metadata = { title: "Inscrições" };

/** Inscrições de todas as páginas com formulário: capacitações, eventos e cortejos. */
export default async function InscricoesPage() {
  const { supabase, profile } = await requireStaff();
  const [caps, eventos, cortejos] = await Promise.all([
    areaPagesWithCounts(supabase, "capacitacao"),
    areaPagesWithCounts(supabase, "evento"),
    areaPagesWithCounts(supabase, "cortejo"),
  ]);
  const all = [...caps, ...eventos, ...cortejos];
  const total = all.reduce((s, p) => s + p.total, 0);
  const present = all.reduce((s, p) => s + p.attended, 0);
  const top = total ? [...all].sort((a, b) => b.total - a.total)[0] : null;
  const groups = [
    { title: "Capacitações", pages: caps, empty: "Nenhuma capacitação ainda. Em Páginas e eventos → Nova página, escolha o tipo Capacitação." },
    { title: "Eventos", pages: eventos, empty: "Nenhum evento ainda." },
    { title: "Cortejos", pages: cortejos, empty: "Nenhum cortejo ainda." },
  ];
  return (
    <>
      <PageHeader
        title="Inscrições"
        description="Respostas dos formulários de inscrição de cada página. Abra uma página para ver os inscritos, marcar presença e emitir certificados."
        actions={
          <>
            <a href="/certificados/padrao" className="adm-btn-secondary">Modelo padrão de certificado</a>
            {profile.role === "admin" && <a href="/comunicados?publico=capacitacoes" className="adm-btn-secondary">Mensagem a todos</a>}
          </>
        }
      />
      <Container className="flex flex-col gap-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="adm-card p-5"><div className="text-xs uppercase tracking-wide text-zinc-500">Inscrições</div><div className="text-2xl font-semibold">{total}</div><div className="text-sm text-zinc-500">em {all.length} página(s)</div></div>
          <div className="adm-card p-5"><div className="text-xs uppercase tracking-wide text-zinc-500">Presenças</div><div className="text-2xl font-semibold">{present}</div><div className="text-sm text-zinc-500">com certificado liberado</div></div>
          <div className="adm-card p-5"><div className="text-xs uppercase tracking-wide text-zinc-500">Mais procurada</div><div className="truncate text-lg font-semibold">{top?.title ?? "—"}</div><div className="text-sm text-zinc-500">{top ? `${top.total} inscrição(ões)` : "nenhuma inscrição ainda"}</div></div>
        </div>
        {groups.map((g) => (
          <section key={g.title} className="flex flex-col gap-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">{g.title}</h2>
            <AreaPagesList showAttended pages={g.pages} base="/inscricoes" empty={g.empty} />
          </section>
        ))}
      </Container>
    </>
  );
}
