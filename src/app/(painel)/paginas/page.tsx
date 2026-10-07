import { requireStaff } from "@/lib/auth";
import { profileNames } from "@/lib/profiles";
import { PageHeader, Container } from "@/components/PageHeader";
import { PagesList, type PageRow } from "./PagesList";
import { ensureHome } from "./actions";
import { SITE_URL } from "@/lib/supabase/env";

export const metadata = { title: "Páginas e eventos" };

export default async function PagesPage() {
  const { supabase, profile } = await requireStaff();
  await ensureHome();
  const { data } = await supabase
    .from("pages")
    .select("id, kind, slug, title, status, publish_at, category, starts_at, show_in_nav, sort_order, updated_at, updated_by")
    .order("sort_order", { ascending: true });
  const rows = data ?? [];
  const names = await profileNames(supabase, rows.map((r) => r.updated_by));
  const { data: drafts } = await supabase.from("page_drafts").select("page_id, updated_at");
  const { data: pub } = await supabase.from("pages").select("id, published_at");
  const pubMap = Object.fromEntries((pub ?? []).map((p) => [p.id, p.published_at]));
  const pending = new Set((drafts ?? []).filter((d) => !pubMap[d.page_id] || new Date(d.updated_at) > new Date(pubMap[d.page_id])).map((d) => d.page_id));
  const pages: PageRow[] = rows.map((r) => ({ ...r, editor: names[r.updated_by] ?? null, pending: pending.has(r.id) }));
  return (
    <>
      <PageHeader title="Páginas e eventos" description="Cada página de evento aparece automaticamente no menu “Eventos” do site quando publicada." />
      <Container>
        <PagesList pages={pages} isAdmin={profile.role === "admin"} siteUrl={SITE_URL} />
      </Container>
    </>
  );
}
