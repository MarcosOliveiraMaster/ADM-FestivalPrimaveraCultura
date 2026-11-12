import { notFound } from "next/navigation";
import { Award, Download, Mail, Pencil } from "lucide-react";
import { requireStaff } from "@/lib/auth";
import { PageHeader, Container } from "@/components/PageHeader";
import { ResendButton } from "@/components/ResendButton";
import { SITE_URL } from "@/lib/supabase/env";
import { formatRange } from "@/shared/format";
import { mergeSettings } from "@/shared/theme";
import { AREAS } from "@/shared/areas";
import { normalizeTemplate } from "@/shared/certificate";
import { AUTO_FORM_ID, pageForms } from "@/shared/forms";
import type { AreaKind, PageContent } from "@/shared/types";
import { AttendanceTable, type AttendanceRow } from "@/app/(painel)/participantes/AttendanceTable";

/** Inscritos de um evento, cortejo ou capacitação: respostas, presença, certificados (e-mail e ZIP) e modelo. */
export async function RegistrationsDetail({ id, kinds, back }: { id: string; kinds: AreaKind[]; back: { href: string; label: string } }) {
  const { supabase, profile } = await requireStaff();
  const [{ data: page }, { data: rows }, { data: settings }] = await Promise.all([
    supabase
      .from("pages")
      .select("id, title, kind, content, starts_at, ends_at, location, certificate_hours, certificate_template")
      .eq("id", id)
      .in("kind", kinds)
      .maybeSingle(),
    supabase
      .from("training_registrations")
      .select("id, form_id, name, email, phone, cpf, address, answers, attended, certificate_code, certificate_sent_at, email_sent_at, created_at")
      .eq("page_id", id)
      .order("created_at"),
    supabase.from("site_settings").select("festival_name, theme, certificate_template").eq("id", 1).maybeSingle(),
  ]);
  if (!page) notFound();
  const kind = page.kind as AreaKind;
  const list = (rows ?? []) as AttendanceRow[];
  const present = list.filter((r) => r.attended).length;
  const s = mergeSettings(settings as never);
  const template = normalizeTemplate(page.certificate_template ?? settings?.certificate_template, s.theme.primary);
  const forms = pageForms(page.content as PageContent).map((f) => ({ id: f.id, title: f.title, custom: f.props.custom ?? [] }));
  if (kind === "capacitacao" && !forms.length) forms.push({ id: AUTO_FORM_ID, title: "Formulário de inscrição", custom: [] });
  return (
    <>
      <PageHeader
        title={page.title}
        description={`${AREAS[kind].singular} · ${formatRange(page.starts_at, page.ends_at) ?? "Data a definir"} · ${list.length} inscrito(s) · ${present} presente(s)${page.certificate_hours ? ` · certificado de ${Number(page.certificate_hours)}h` : ""}`}
        actions={
          <>
            <a href={back.href} className="adm-btn-ghost">← {back.label}</a>
            <a href={`/certificados/${page.id}`} className="adm-btn-secondary"><Award size={16} /> Modelo de certificado{page.certificate_template ? "" : " (padrão)"}</a>
            {profile.role === "admin" && <a href={`/comunicados?publico=${kind === "capacitacao" ? "capacitacao" : "evento"}:${page.id}`} className="adm-btn-secondary"><Mail size={16} /> Mensagem aos inscritos</a>}
            <ResendButton kind={kind} pageId={page.id} pending={list.filter((r) => !r.email_sent_at).length} />
            <a href={`/paginas/${page.id}`} className="adm-btn-secondary"><Pencil size={16} /> Editar página</a>
            <a href={`/inscricoes/csv?page=${page.id}`} className="adm-btn-secondary"><Download size={16} /> CSV</a>
          </>
        }
      />
      <Container>
        {!forms.length && (
          <p className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Esta página ainda não tem formulário de inscrição. Em <a className="underline" href={`/paginas/${page.id}`}>Editar página</a>, adicione o bloco “Formulário de inscrição”.
          </p>
        )}
        <AttendanceTable
          rows={list}
          kind={kind}
          pageId={page.id}
          isAdmin={profile.role === "admin"}
          siteUrl={SITE_URL}
          forms={forms}
          cert={{
            template,
            theme: s.theme,
            festival: s.festival_name,
            event: { title: page.title, starts_at: page.starts_at, ends_at: page.ends_at, location: page.location, hours: page.certificate_hours },
          }}
        />
      </Container>
    </>
  );
}
