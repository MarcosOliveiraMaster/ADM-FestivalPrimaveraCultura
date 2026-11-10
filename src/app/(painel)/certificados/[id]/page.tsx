import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { SITE_URL } from "@/lib/supabase/env";
import { mergeSettings } from "@/shared/theme";
import { AREAS, isArea } from "@/shared/areas";
import { CertificateEditor } from "./CertificateEditor";

export const metadata = { title: "Modelo de certificado" };

/** Editor do modelo de certificado: "padrao" (festival) ou o id de um evento/cortejo/capacitação. */
export default async function CertificadoModelo({ params }: PageProps<"/certificados/[id]">) {
  const { id } = await params;
  const { supabase } = await requireStaff();
  const { data: settings } = await supabase.from("site_settings").select("festival_name, theme, certificate_template").eq("id", 1).maybeSingle();
  const s = mergeSettings(settings as never);
  const festivalTemplate = settings?.certificate_template ?? null;

  if (id === "padrao") {
    return (
      <CertificateEditor
        target="padrao"
        title="Modelo padrão do festival"
        subtitle="Usado por todos os eventos, cortejos e capacitações que não têm modelo próprio."
        back={{ href: "/participantes", label: "Participantes" }}
        initial={festivalTemplate}
        festivalTemplate={null}
        hasOwn={!!festivalTemplate}
        theme={s.theme}
        festival={s.festival_name}
        event={{ title: "Nome do evento", starts_at: null, location: null, hours: null }}
        siteUrl={SITE_URL}
      />
    );
  }

  const { data: page } = await supabase.from("pages").select("id, title, kind, starts_at, ends_at, location, certificate_hours, certificate_template").eq("id", id).maybeSingle();
  if (!page || !isArea(page.kind)) notFound();
  const back = page.kind === "capacitacao" ? { href: `/capacitacoes/${page.id}`, label: "Inscritos" } : { href: `/participantes/${page.id}`, label: "Inscritos" };
  return (
    <CertificateEditor
      target={page.id}
      title={`Certificado · ${page.title}`}
      subtitle={`${AREAS[page.kind].singular}. ${page.certificate_template ? "Modelo próprio desta página." : "Usando o modelo padrão do festival — ao salvar, esta página passa a ter modelo próprio."}`}
      back={back}
      initial={page.certificate_template ?? festivalTemplate}
      festivalTemplate={festivalTemplate}
      hasOwn={!!page.certificate_template}
      theme={s.theme}
      festival={s.festival_name}
      event={{ title: page.title, starts_at: page.starts_at, ends_at: page.ends_at, location: page.location, hours: page.certificate_hours }}
      siteUrl={SITE_URL}
    />
  );
}
