import { RegistrationsDetail } from "@/components/RegistrationsDetail";

export const metadata = { title: "Participantes" };

export default async function EventParticipants({ params }: PageProps<"/participantes/[id]">) {
  const { id } = await params;
  return <RegistrationsDetail id={id} kinds={["evento", "cortejo"]} back={{ href: "/participantes", label: "Eventos e cortejos" }} />;
}
