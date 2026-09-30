import { NewPasswordForm } from "@/components/AuthForms";
export const metadata = { title: "Nova senha" };
export default function Page() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-semibold">Criar nova senha</h1>
      <NewPasswordForm />
    </div>
  );
}
