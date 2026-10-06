"use server";
import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/auth";
import { MEDIA_BUCKET } from "@/lib/supabase/env";

/** Caminho do arquivo no bucket a partir da URL pública (ignora o enquadramento "#fp=…"). */
function pathFromUrl(url: string) {
  const clean = url.split("#")[0].split("?")[0];
  const marker = `/object/public/${MEDIA_BUCKET}/`;
  const i = clean.indexOf(marker);
  return i >= 0 ? decodeURIComponent(clean.slice(i + marker.length)) : null;
}

/**
 * Apaga do servidor (armazenamento + cadastro de mídia) os arquivos removidos de uma página,
 * liberando espaço. Arquivos usados em OUTRA página ou nas configurações são mantidos.
 */
export async function purgeMedia(urls: string[], pageId?: string) {
  const { supabase } = await requireStaff();
  const paths = [...new Set(urls.map(pathFromUrl).filter((p): p is string => !!p))];
  if (!paths.length) return { ok: true as const, deleted: 0, kept: 0, freed: 0 };

  let pagesQ = supabase.from("pages").select("content, cover_url, seo");
  let draftsQ = supabase.from("page_drafts").select("content");
  if (pageId) {
    pagesQ = pagesQ.neq("id", pageId);
    draftsQ = draftsQ.neq("page_id", pageId);
  }
  const [{ data: pages }, { data: drafts }, { data: settings }, { data: rows }] = await Promise.all([
    pagesQ,
    draftsQ,
    supabase.from("site_settings").select("brand, theme").eq("id", 1).maybeSingle(),
    supabase.from("media").select("id, path, size_bytes").in("path", paths),
  ]);
  const elsewhere = JSON.stringify([pages, drafts, settings]);

  const toDelete = paths.filter((p) => !elsewhere.includes(p));
  const kept = paths.length - toDelete.length;
  if (toDelete.length) {
    const { error } = await supabase.storage.from(MEDIA_BUCKET).remove(toDelete);
    if (error) return { ok: false as const, error: `Não foi possível apagar do servidor: ${error.message}` };
    await supabase.from("media").delete().in("path", toDelete);
  }
  const freed = (rows ?? []).filter((r) => toDelete.includes(r.path)).reduce((s, r) => s + (r.size_bytes ?? 0), 0);
  revalidatePath("/midia");
  revalidatePath("/armazenamento");
  return { ok: true as const, deleted: toDelete.length, kept, freed };
}
