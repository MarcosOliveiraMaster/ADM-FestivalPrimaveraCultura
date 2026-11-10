import { RegistrationsDetail } from "@/components/RegistrationsDetail";

export const metadata = { title: "Capacitações" };

export default async function TrainingRegistrations({ params }: PageProps<"/capacitacoes/[id]">) {
  const { id } = await params;
  return <RegistrationsDetail id={id} kinds={["capacitacao"]} back={{ href: "/capacitacoes", label: "Capacitações" }} />;
}
