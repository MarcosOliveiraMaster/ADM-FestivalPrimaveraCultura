import { requireAdmin } from "@/lib/auth";
import { PageHeader, Container } from "@/components/PageHeader";
import { UsersManager } from "./UsersManager";

export const metadata = { title: "Usuários" };

export default async function UsersPage() {
  const { supabase, user } = await requireAdmin();
  const [{ data: profiles }, { data: invites }] = await Promise.all([
    supabase.from("profiles").select("id, email, full_name, role, created_at").order("created_at"),
    supabase.from("staff_invites").select("email, role, created_at, token_expires_at").order("created_at"),
  ]);
  return (
    <>
      <PageHeader title="Usuários" description="Quem pode acessar este painel. Editores cuidam do conteúdo; administradores também veem inscritos, métricas e configurações." />
      <Container>
        <UsersManager me={user.id} profiles={profiles ?? []} invites={invites ?? []} />
      </Container>
    </>
  );
}
