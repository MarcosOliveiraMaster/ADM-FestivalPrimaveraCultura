import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { mergeSettings } from "@/shared/theme";
import { normalizeContent } from "@/shared/blocks";
import { Editor, type EditorPage } from "@/components/editor/Editor";
import { SITE_URL } from "@/lib/supabase/env";
import type { EventSummary } from "@/shared/types";

export const metadata = { title: "Editor" };

export default async function EditPage({ params }: PageProps<"/paginas/[id]">) {
  const { id } = await params;
  const { supabase } = await requireStaff();
  const [{ data: page }, { data: draft }, { data: settings }, { data: events }] = await Promise.all([
    supabase.from("pages").select("*").eq("id", id).maybeSingle(),
    supabase.from("page_drafts").select("content").eq("page_id", id).maybeSingle(),
    supabase.from("site_settings").select("*").eq("id", 1).maybeSingle(),
    supabase.from("pages").select("id, slug, title, category, starts_at, ends_at, location, cover_url").eq("kind", "evento").in("status", ["published", "scheduled"]).order("sort_order"),
  ]);
  if (!page) notFound();
  const published = normalizeContent(page.content);
  const content = draft ? normalizeContent(draft.content) : published;
  const editorPage: EditorPage = {
    id: page.id, title: page.title, slug: page.slug, kind: page.kind, status: page.status, publish_at: page.publish_at, published_at: page.published_at,
    category: page.category, starts_at: page.starts_at, ends_at: page.ends_at, location: page.location, cover_url: page.cover_url, show_in_nav: page.show_in_nav, seo: page.seo ?? {},
  };
  return (
    <Editor
      page={editorPage}
      initialContent={content}
      publishedJson={page.published_at ? JSON.stringify(published) : ""}
      settings={mergeSettings(settings)}
      events={(events ?? []) as EventSummary[]}
      siteUrl={SITE_URL}
    />
  );
}
