import { requireAdmin } from "@/lib/auth";
import { PageHeader } from "@/components/PageHeader";
import { mergeSettings } from "@/shared/theme";
import { SettingsForm } from "./SettingsForm";
import { SITE_URL } from "@/lib/supabase/env";

export const metadata = { title: "Configurações" };

export default async function SettingsPage({ searchParams }: PageProps<"/configuracoes">) {
  const { aba } = await searchParams;
  const { supabase } = await requireAdmin();
  const [{ data }, { data: pages }] = await Promise.all([
    supabase.from("site_settings").select("*").eq("id", 1).maybeSingle(),
    supabase.from("pages").select("title, slug, kind").neq("kind", "home").order("sort_order"),
  ]);
  return (
    <>
      <PageHeader title="Configurações do site" description="Informações do festival, identidade visual, menu e rodapé. As mudanças valem para o site todo." />
      <SettingsForm initial={mergeSettings(data)} tab={typeof aba === "string" ? aba : "geral"} pages={pages ?? []} siteUrl={SITE_URL} />
    </>
  );
}
