import { requireStaff } from "@/lib/auth";
import { PageHeader, Container } from "@/components/PageHeader";
import { AreaPagesList } from "@/components/AreaPagesList";
import { areaPagesWithCounts } from "@/lib/registrations";

export const metadata = { title: "Capacitações" };

export default async function CapacitacoesPage() {
  const { supabase } = await requireStaff();
  const pages = await areaPagesWithCounts(supabase, "capacitacao");
  return (
    <>
      <PageHeader title="Capacitações" description="Capacitações criadas e as inscrições recebidas pelo formulário (nome, e-mail e telefone, sem login)." actions={<a href="/paginas" className="adm-btn-primary">Criar capacitação</a>} />
      <Container>
        <AreaPagesList pages={pages} base="/capacitacoes" empty="Nenhuma capacitação ainda. Em Páginas e eventos → Nova página, escolha o tipo Capacitação." />
      </Container>
    </>
  );
}
