import { requireStaff } from "@/lib/auth";
import { PageHeader, Container } from "@/components/PageHeader";
import { NewPasswordForm } from "@/components/AuthForms";
import { NameForm } from "./NameForm";

export const metadata = { title: "Minha conta" };

export default async function AccountPage() {
  const { profile } = await requireStaff();
  return (
    <>
      <PageHeader title="Minha conta" description={`${profile.email} · ${profile.role === "admin" ? "Administrador" : "Editor"}`} />
      <Container className="grid max-w-3xl gap-6 md:grid-cols-2">
        <section className="adm-card p-5">
          <h2 className="mb-4 font-semibold">Nome</h2>
          <NameForm initial={profile.full_name ?? ""} />
        </section>
        <section className="adm-card p-5">
          <h2 className="mb-4 font-semibold">Trocar senha</h2>
          <NewPasswordForm redirectTo="" />
        </section>
      </Container>
    </>
  );
}
