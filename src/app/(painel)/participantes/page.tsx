import { requireStaff } from "@/lib/auth";
import { PageHeader, Container } from "@/components/PageHeader";
import { AreaPagesList } from "@/components/AreaPagesList";
import { areaPagesWithCounts } from "@/lib/registrations";

export const metadata = { title: "Participantes" };

export default async function ParticipantesPage() {
  const { supabase } = await requireStaff();
  const [eventos, cortejos] = await Promise.all([areaPagesWithCounts(supabase, "evento"), areaPagesWithCounts(supabase, "cortejo")]);
  return (
    <>
      <PageHeader
        title="Participantes"
        description="Inscrições feitas no site (sem login) em eventos e cortejos. Marque a presença, edite o modelo de certificado e envie por e-mail ou baixe todos em ZIP."
        actions={<a href="/certificados/padrao" className="adm-btn-secondary">Modelo padrão de certificado</a>}
      />
      <Container>
        <div className="flex flex-col gap-6">
          <section className="flex flex-col gap-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Eventos</h2>
            <AreaPagesList pages={eventos} base="/participantes" showAttended empty="Nenhum evento ainda. Crie em Páginas e eventos." />
          </section>
          <section className="flex flex-col gap-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Cortejos</h2>
            <AreaPagesList pages={cortejos} base="/participantes" showAttended empty="Nenhum cortejo ainda. Crie em Páginas e eventos." />
          </section>
        </div>
      </Container>
    </>
  );
}
