import { AcceptInviteForm } from "@/components/AuthForms";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Primeiro acesso" };

/** Só funciona com o link do convite (token válido por 1 hora). */
export default async function Page({ searchParams }: PageProps<"/primeiro-acesso">) {
  const sp = await searchParams;
  const token = typeof sp.token === "string" ? sp.token : "";
  let invite: { email: string; expired: boolean } | null = null;
  if (token.length >= 20) {
    const supabase = await createClient();
    const { data } = await supabase.rpc("invite_lookup", { p_token: token }).maybeSingle<{ email: string; expired: boolean }>();
    invite = data ?? null;
  }
  if (!invite || invite.expired) {
    return (
      <div className="flex flex-col gap-3 text-center">
        <h1 className="text-lg font-semibold">{invite?.expired ? "Este convite expirou" : "Acesso somente por convite"}</h1>
        <p className="text-sm text-zinc-500">
          {invite?.expired
            ? "O link de convite vale por 1 hora. Peça à administração um novo link."
            : "Para criar uma conta, use o link pessoal enviado pela administração do festival."}
        </p>
        <a href="/login" className="text-sm text-brand-700 hover:underline">Já tenho acesso</a>
      </div>
    );
  }
  return <AcceptInviteForm token={token} email={invite.email} />;
}
