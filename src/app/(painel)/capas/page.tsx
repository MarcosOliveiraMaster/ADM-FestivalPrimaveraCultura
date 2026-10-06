import { requireAdmin } from "@/lib/auth";
import { PageHeader, Container } from "@/components/PageHeader";
import { mergeSettings } from "@/shared/theme";
import { CoverPicker } from "./CoverPicker";

export const metadata = { title: "Opções de capa" };

export default async function CapasPage() {
  const { supabase } = await requireAdmin();
  const [{ data: media }, { data: settings }] = await Promise.all([
    supabase.from("media").select("id, url, alt, width, height, mime").like("mime", "image/%").order("created_at", { ascending: false }),
    supabase.from("site_settings").select("*").eq("id", 1).maybeSingle(),
  ]);
  const s = mergeSettings(settings);
  return (
    <>
      <PageHeader
        title="Opções de capa"
        description="Compare as fotos da biblioteca como capa da página inicial (para a reunião de aprovação) e defina a escolhida."
      />
      <Container>
        <CoverPicker images={(media ?? []).filter((m) => !/svg/.test(m.mime ?? ""))} current={s.brand.hero_cover_url ?? ""} festival={s.festival_name} tagline={s.tagline} brand={s.brand} />
      </Container>
    </>
  );
}
