"use server";
import { revalidatePath } from "next/cache";
import { requireAdmin, requireStaff } from "@/lib/auth";
import { profileNames } from "@/lib/profiles";
import { PAGE_TEMPLATES, defaultHomeContent, normalizeContent } from "@/shared/blocks";
import { slugify } from "@/shared/format";
import type { PageContent, PageKind } from "@/shared/types";

type Result<T = unknown> = { ok: true; data?: T } | { ok: false; error: string };

async function uniqueSlug(supabase: Awaited<ReturnType<typeof requireStaff>>["supabase"], base: string, ignoreId?: string) {
  const root = slugify(base) || "pagina";
  for (let i = 0; i < 50; i++) {
    const slug = i === 0 ? root : `${root}-${i + 1}`;
    let q = supabase.from("pages").select("id").eq("slug", slug);
    if (ignoreId) q = q.neq("id", ignoreId);
    const { data } = await q.maybeSingle();
    if (!data) return slug;
  }
  return `${root}-${Date.now().toString(36)}`;
}

export async function ensureHome() {
  const { supabase, user } = await requireStaff();
  const { data } = await supabase.from("pages").select("id").eq("kind", "home").maybeSingle();
  if (data) return data.id as string;
  const content = defaultHomeContent();
  const { data: created } = await supabase
    .from("pages")
    .insert({ kind: "home", slug: "inicio", title: "Início", status: "published", content, published_at: new Date().toISOString(), show_in_nav: false, created_by: user.id, updated_by: user.id })
    .select("id")
    .single();
  return created?.id as string;
}

export async function createPage(input: { title: string; kind: PageKind; template: string }): Promise<Result<string>> {
  const { supabase, user } = await requireStaff();
  const title = input.title.trim();
  if (!title) return { ok: false, error: "Informe um título." };
  if (input.kind === "home") return { ok: false, error: "A página inicial já existe." };
  const tpl = PAGE_TEMPLATES.find((t) => t.id === input.template) ?? PAGE_TEMPLATES[0];
  const content = tpl.build(title);
  const slug = await uniqueSlug(supabase, title);
  const { data: max } = await supabase.from("pages").select("sort_order").order("sort_order", { ascending: false }).limit(1).maybeSingle();
  const { data, error } = await supabase
    .from("pages")
    .insert({ title, slug, kind: input.kind, status: "draft", created_by: user.id, updated_by: user.id, sort_order: (max?.sort_order ?? 0) + 1 })
    .select("id")
    .single();
  if (error || !data) return { ok: false, error: error?.message ?? "Erro ao criar." };
  await supabase.from("page_drafts").insert({ page_id: data.id, content, updated_by: user.id });
  revalidatePath("/paginas");
  return { ok: true, data: data.id };
}

export async function duplicatePage(id: string): Promise<Result<string>> {
  const { supabase, user } = await requireStaff();
  const { data: p } = await supabase.from("pages").select("*").eq("id", id).single();
  if (!p) return { ok: false, error: "Página não encontrada." };
  if (p.kind === "home") return { ok: false, error: "A página inicial não pode ser duplicada." };
  const { data: d } = await supabase.from("page_drafts").select("content").eq("page_id", id).maybeSingle();
  const title = `${p.title} (cópia)`;
  const slug = await uniqueSlug(supabase, title);
  const { data, error } = await supabase
    .from("pages")
    .insert({
      title, slug, kind: p.kind, status: "draft", category: p.category, starts_at: p.starts_at, ends_at: p.ends_at, location: p.location,
      cover_url: p.cover_url, show_in_nav: p.show_in_nav, seo: p.seo, color: p.color, registration_enabled: false, capacity: p.capacity, certificate_hours: p.certificate_hours, sort_order: p.sort_order + 1, created_by: user.id, updated_by: user.id,
    })
    .select("id")
    .single();
  if (error || !data) return { ok: false, error: error?.message ?? "Erro ao duplicar." };
  await supabase.from("page_drafts").insert({ page_id: data.id, content: d?.content ?? p.content, updated_by: user.id });
  revalidatePath("/paginas");
  return { ok: true, data: data.id };
}

export async function deletePage(id: string): Promise<Result> {
  const { supabase } = await requireAdmin();
  const { data: p } = await supabase.from("pages").select("kind").eq("id", id).single();
  if (p?.kind === "home") return { ok: false, error: "A página inicial não pode ser excluída." };
  const { error } = await supabase.from("pages").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/paginas");
  return { ok: true };
}

export async function reorderPages(ids: string[]): Promise<Result> {
  const { supabase } = await requireStaff();
  await Promise.all(ids.map((id, i) => supabase.from("pages").update({ sort_order: i + 1 }).eq("id", id)));
  revalidatePath("/paginas");
  return { ok: true };
}

export async function setStatus(id: string, status: "draft" | "published"): Promise<Result> {
  const { supabase, user } = await requireStaff();
  const { data: p } = await supabase.from("pages").select("kind").eq("id", id).single();
  if (p?.kind === "home" && status === "draft") return { ok: false, error: "A página inicial fica sempre publicada." };
  const patch: Record<string, unknown> = { status, updated_by: user.id, publish_at: null };
  if (status === "published") patch.published_at = new Date().toISOString();
  const { error } = await supabase.from("pages").update(patch).eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/paginas");
  return { ok: true };
}

export async function saveDraft(id: string, content: PageContent): Promise<Result<string>> {
  const { supabase, user } = await requireStaff();
  const clean = normalizeContent(content);
  const { error } = await supabase.from("page_drafts").upsert({ page_id: id, content: clean, updated_by: user.id });
  if (error) return { ok: false, error: error.message };
  await supabase.from("pages").update({ updated_by: user.id, updated_at: new Date().toISOString() }).eq("id", id);
  return { ok: true, data: new Date().toISOString() };
}

/** Publica o rascunho agora (ou agenda para `at`). Guarda uma versão no histórico. */
export async function publishPage(id: string, content: PageContent, at?: string | null): Promise<Result> {
  const { supabase, user } = await requireStaff();
  const clean = normalizeContent(content);
  const scheduled = at && new Date(at).getTime() > Date.now();
  const { error } = await supabase
    .from("pages")
    .update({
      content: clean,
      status: scheduled ? "scheduled" : "published",
      publish_at: scheduled ? new Date(at!).toISOString() : null,
      published_at: new Date().toISOString(),
      updated_by: user.id,
    })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  await supabase.from("page_drafts").upsert({ page_id: id, content: clean, updated_by: user.id });
  await supabase.from("page_versions").insert({ page_id: id, content: clean, created_by: user.id });
  revalidatePath("/paginas");
  revalidatePath(`/paginas/${id}`);
  return { ok: true };
}

export interface PageMeta {
  title: string;
  slug: string;
  kind: PageKind;
  category: string | null;
  starts_at: string | null;
  ends_at: string | null;
  location: string | null;
  cover_url: string | null;
  show_in_nav: boolean;
  seo: { title?: string; description?: string; image?: string };
  /** Cor própria da página (#rrggbb) ou null para usar a cor do tema. */
  color: string | null;
  registration_enabled: boolean;
  capacity: number | null;
  certificate_hours: number | null;
}

export async function updatePageMeta(id: string, meta: PageMeta): Promise<Result<string>> {
  const { supabase, user } = await requireStaff();
  const { data: cur } = await supabase.from("pages").select("kind").eq("id", id).single();
  const title = meta.title.trim();
  if (!title) return { ok: false, error: "Informe um título." };
  const slug = cur?.kind === "home" ? "inicio" : slugify(meta.slug || title);
  if (!slug) return { ok: false, error: "Endereço inválido." };
  const { data: clash } = await supabase.from("pages").select("id").eq("slug", slug).neq("id", id).maybeSingle();
  if (clash) return { ok: false, error: "Já existe uma página com esse endereço." };
  if (meta.starts_at && meta.ends_at && new Date(meta.ends_at) < new Date(meta.starts_at)) return { ok: false, error: "O término é antes do início." };
  const { error } = await supabase
    .from("pages")
    .update({
      title,
      slug,
      kind: cur?.kind === "home" ? "home" : meta.kind === "home" ? "evento" : meta.kind,
      category: meta.category?.trim() || null,
      starts_at: meta.starts_at || null,
      ends_at: meta.ends_at || null,
      location: meta.location?.trim() || null,
      cover_url: meta.cover_url || null,
      show_in_nav: meta.show_in_nav,
      seo: meta.seo ?? {},
      color: meta.color && /^#[0-9a-f]{6}$/i.test(meta.color) ? meta.color : null,
      registration_enabled: meta.registration_enabled,
      capacity: meta.capacity && meta.capacity > 0 ? Math.round(meta.capacity) : null,
      certificate_hours: meta.certificate_hours && meta.certificate_hours > 0 ? meta.certificate_hours : null,
      updated_by: user.id,
    })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/paginas");
  return { ok: true, data: slug };
}

export async function listVersions(id: string) {
  const { supabase } = await requireStaff();
  const { data } = await supabase.from("page_versions").select("id, created_at, created_by").eq("page_id", id).order("created_at", { ascending: false }).limit(30);
  const names = await profileNames(supabase, (data ?? []).map((v) => v.created_by));
  return (data ?? []).map((v) => ({ id: v.id as string, created_at: v.created_at as string, author: names[v.created_by as string] ?? "—" }));
}

export async function getVersion(versionId: string): Promise<PageContent | null> {
  const { supabase } = await requireStaff();
  const { data } = await supabase.from("page_versions").select("content").eq("id", versionId).single();
  return data ? normalizeContent(data.content) : null;
}
