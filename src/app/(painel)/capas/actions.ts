"use server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { normalizeContent } from "@/shared/blocks";
import type { Brand } from "@/shared/types";

/** Salva até 5 imagens de capa (revezam automaticamente) e o tempo de troca. */
export async function saveCovers(urls: string[], interval: number) {
  const { supabase, user } = await requireAdmin();
  const list = urls.filter(Boolean).slice(0, 5);
  const { data } = await supabase.from("site_settings").select("brand").eq("id", 1).maybeSingle();
  const brand: Brand = { ...((data?.brand as Brand) ?? {}), hero_cover_urls: list, hero_cover_url: list[0] ?? undefined, hero_interval: Math.min(30, Math.max(2, Math.round(interval) || 6)) };
  const { error } = await supabase.from("site_settings").update({ brand, updated_by: user.id }).eq("id", 1);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/capas");
  return { ok: true as const };
}

/**
 * Faz a primeira seção da página inicial usar a capa padrão (as imagens escolhidas aqui):
 * fundo "Imagem" sem foto própria. Altera a versão publicada e o rascunho.
 */
export async function applyCoversToHome() {
  const { supabase, user } = await requireAdmin();
  const { data: home } = await supabase.from("pages").select("id, content").eq("kind", "home").maybeSingle();
  if (!home) return { ok: false as const, error: "Página inicial não encontrada." };
  const { data: draft } = await supabase.from("page_drafts").select("content").eq("page_id", home.id).maybeSingle();
  const fix = (raw: unknown) => {
    const c = normalizeContent(raw);
    if (!c.sections.length) return c;
    const first = c.sections[0];
    c.sections[0] = { ...first, style: { ...first.style, bgType: "image", bgUrl: "", bgImages: undefined } };
    return c;
  };
  const { error } = await supabase.from("pages").update({ content: fix(home.content), updated_by: user.id }).eq("id", home.id);
  if (error) return { ok: false as const, error: error.message };
  if (draft) await supabase.from("page_drafts").update({ content: fix(draft.content), updated_by: user.id }).eq("page_id", home.id);
  revalidatePath("/capas");
  return { ok: true as const };
}
