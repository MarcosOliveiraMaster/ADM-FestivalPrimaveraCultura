import { requireStaff } from "@/lib/auth";
import { PageHeader, Container } from "@/components/PageHeader";
import { AreaPagesList } from "@/components/AreaPagesList";
import { areaPagesWithCounts } from "@/lib/registrations";

export const metadata = { title: "Participantes" };

export default async function ParticipantesPage() {
  const { supabase } = await requireStaff();
  const pages = await areaPagesWithCounts(supabase, "evento");
  return (
    <>
      <PageHeader title="Participantes dos eventos" description="Inscrições feitas no site (com login). Marque a presença para liberar o certificado." />
      <Container>
        <AreaPagesList pages={pages} base="/participantes" showAttended empty="Nenhum evento ainda. Crie em Páginas e eventos." />
      </Container>
    </>
  );
}
