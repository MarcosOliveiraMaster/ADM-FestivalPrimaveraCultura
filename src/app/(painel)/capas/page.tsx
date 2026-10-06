import { requireAdmin } from "@/lib/auth";
import { PageHeader, Container } from "@/components/PageHeader";
import { mergeSettings } from "@/shared/theme";
import { normalizeContent } from "@/shared/blocks";
import { CoverPicker } from "./CoverPicker";

export const metadata = { title: "Opções de capa" };

export default async function CapasPage() {
  const { supabase } = await requireAdmin();
  const [{ data: media }, { data: settings }, { data: home }] = await Promise.all([
    supabase.from("media").select("id, url, alt, width, height, mime").like("mime", "image/%").order("created_at", { ascending: false }),
    supabase.from("site_settings").select("*").eq("id", 1).maybeSingle(),
    supabase.from("pages").select("content").eq("kind", "home").maybeSingle(),
  ]);
  const first = normalizeContent(home?.content).sections[0]?.style;
  const homeUsesCover = !first || (first.bgType === "image" && !first.bgUrl);
  const s = mergeSettings(settings);
  return (
    <>
      <PageHeader
        title="Opções de capa"
        description="Escolha até 5 fotos para a capa da página inicial. Elas revezam automaticamente, com transição suave."
      />
      <Container>
        <CoverPicker images={(media ?? []).filter((m) => !/svg/.test(m.mime ?? ""))} festival={s.festival_name} tagline={s.tagline} brand={s.brand} homeUsesCover={homeUsesCover} />
      </Container>
    </>
  );
}
