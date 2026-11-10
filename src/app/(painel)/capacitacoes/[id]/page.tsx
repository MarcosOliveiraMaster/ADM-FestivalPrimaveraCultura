import { notFound } from "next/navigation";
import { Download, Mail, Pencil } from "lucide-react";
import { requireStaff } from "@/lib/auth";
import { PageHeader, Container } from "@/components/PageHeader";
import { formatRange } from "@/shared/format";
import { AttendanceTable, type AttendanceRow } from "../../participantes/AttendanceTable";
import { SITE_URL } from "@/lib/supabase/env";
import { ResendButton } from "@/components/ResendButton";

export const metadata = { title: "Capacitações" };

export default async function TrainingRegistrations({ params }: PageProps<"/capacitacoes/[id]">) {
  const { id } = await params;
  const { supabase, profile } = await requireStaff();
  const [{ data: page }, { data: rows }] = await Promise.all([
    supabase.from("pages").select("id, title, starts_at, ends_at, capacity, registration_enabled, certificate_hours").eq("id", id).eq("kind", "capacitacao").maybeSingle(),
    supabase.from("training_registrations").select("id, name, email, phone, attended, certificate_code, certificate_sent_at, email_sent_at, created_at").eq("page_id", id).order("created_at"),
  ]);
  if (!page) notFound();
  const list = (rows ?? []) as AttendanceRow[];
  const present = list.filter((r) => r.attended).length;
  return (
    <>
      <PageHeader
        title={page.title}
        description={`${formatRange(page.starts_at, page.ends_at) ?? "Data a definir"} · ${list.length} inscrito(s)${page.capacity ? ` de ${page.capacity} vagas` : ""} · ${present} presente(s) · inscrições ${page.registration_enabled ? "abertas" : "fechadas"}${page.certificate_hours ? ` · certificado de ${Number(page.certificate_hours)}h` : ""}`}
        actions={
          <>
            <a href="/capacitacoes" className="adm-btn-ghost">← Capacitações</a>
            {profile.role === "admin" && <a href={`/comunicados?publico=capacitacao:${page.id}`} className="adm-btn-primary"><Mail size={16} /> Enviar mensagem aos inscritos</a>}
            <ResendButton kind="capacitacao" pageId={page.id} pending={list.filter((r) => !r.email_sent_at).length} />
            <a href={`/paginas/${page.id}`} className="adm-btn-secondary"><Pencil size={16} /> Editar página</a>
            <a href={`/capacitacoes/csv?page=${page.id}`} className="adm-btn-secondary"><Download size={16} /> Exportar (CSV)</a>
          </>
        }
      />
      <Container>
        <AttendanceTable rows={list} kind="capacitacao" pageId={page.id} isAdmin={profile.role === "admin"} siteUrl={SITE_URL} />
      </Container>
    </>
  );
}
