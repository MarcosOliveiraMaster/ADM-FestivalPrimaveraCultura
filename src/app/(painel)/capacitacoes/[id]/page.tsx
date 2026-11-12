import { redirect } from "next/navigation";

/** Endereço antigo: tudo fica em Inscrições. */
export default async function Antigo({ params }: PageProps<"/capacitacoes/[id]">) {
  redirect(`/inscricoes/${(await params).id}`);
}
