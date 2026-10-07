import { notFound } from "next/navigation";
import { Download } from "lucide-react";
import { requireStaff } from "@/lib/auth";
import { PageHeader, Container } from "@/components/PageHeader";
import { SITE_URL } from "@/lib/supabase/env";
import { formatRange } from "@/shared/format";
import { AttendanceTable, type AttendanceRow } from "../AttendanceTable";
import { ResendButton } from "@/components/ResendButton";

export const metadata = { title: "Participantes" };

export default async function EventParticipants({ params }: PageProps<"/participantes/[id]">) {
  const { id } = await params;
  const { supabase, profile } = await requireStaff();
  const [{ data: page }, { data: rows }] = await Promise.all([
    supabase.from("pages").select("id, title, starts_at, ends_at, capacity, certificate_hours").eq("id", id).eq("kind", "evento").maybeSingle(),
    supabase.from("registrations").select("id, full_name, email, attended, certificate_code, created_at, email_sent_at").eq("page_id", id).order("created_at"),
  ]);
  if (!page) notFound();
  const list = (rows ?? []) as AttendanceRow[];
  const present = list.filter((r) => r.attended).length;
  return (
    <>
      <PageHeader
        title={page.title}
        description={`${formatRange(page.starts_at, page.ends_at) ?? "Data a definir"} · ${list.length} inscrito(s)${page.capacity ? ` de ${page.capacity} vagas` : ""} · ${present} presente(s)${page.certificate_hours ? ` · certificado de ${Number(page.certificate_hours)}h` : ""}`}
        actions={
          <>
            <a href="/participantes" className="adm-btn-ghost">← Eventos</a>
            <ResendButton kind="evento" pageId={page.id} pending={list.filter((r) => !r.email_sent_at).length} />
            <a href={`/participantes/csv?page=${page.id}`} className="adm-btn-secondary"><Download size={16} /> Exportar (CSV)</a>
          </>
        }
      />
      <Container>
        <AttendanceTable rows={list} isAdmin={profile.role === "admin"} siteUrl={SITE_URL} />
      </Container>
    </>
  );
}
