import { redirect } from "next/navigation";

/** Endereço antigo: tudo fica em Inscrições. */
export default function Antigo() {
  redirect("/inscricoes");
}
