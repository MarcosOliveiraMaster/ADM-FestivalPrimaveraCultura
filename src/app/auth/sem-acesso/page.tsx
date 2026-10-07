import { SignOutButton } from "@/components/SignOutButton";

export const metadata = { title: "Sem acesso" };

export default function NoAccess() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="adm-card max-w-md p-8 text-center">
        <div className="text-4xl">🔒</div>
        <h1 className="mt-3 text-lg font-semibold">Seu acesso ainda não foi liberado</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Sua conta existe, mas este e-mail não foi convidado para a equipe. Peça a um administrador para te convidar em <b>Usuários</b> e depois entre novamente.
        </p>
        <div className="mt-6 flex justify-center"><SignOutButton className="adm-btn-secondary" /></div>
      </div>
    </div>
  );
}
