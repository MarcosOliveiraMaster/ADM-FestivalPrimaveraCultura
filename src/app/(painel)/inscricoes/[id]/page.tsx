import { RegistrationsDetail } from "@/components/RegistrationsDetail";

export const metadata = { title: "Inscrições" };

export default async function InscricoesDaPagina({ params }: PageProps<"/inscricoes/[id]">) {
  const { id } = await params;
  return <RegistrationsDetail id={id} kinds={["capacitacao", "evento", "cortejo"]} back={{ href: "/inscricoes", label: "Inscrições" }} />;
}
