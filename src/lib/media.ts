"use client";
import { createClient } from "./supabase/client";
import { MEDIA_BUCKET } from "./supabase/env";
import { slugify } from "@/shared/format";

export interface MediaItem {
  id: string;
  path: string;
  url: string;
  mime: string | null;
  size_bytes: number | null;
  width: number | null;
  height: number | null;
  alt: string | null;
  folder: string | null;
  created_at: string;
}

export type MediaKind = "image" | "video" | "font" | "pdf" | "any";

export const ACCEPT: Record<MediaKind, string> = {
  image: "image/png,image/jpeg,image/webp,image/gif,image/svg+xml,image/avif",
  video: "video/mp4,video/webm",
  font: ".woff2,.woff,.ttf,.otf,font/woff2,font/woff,font/ttf,font/otf",
  pdf: "application/pdf",
  any: "image/*,video/mp4,video/webm,application/pdf,.woff2,.woff,.ttf,.otf",
};

export function matchesKind(mime: string | null, kind: MediaKind) {
  if (kind === "any" || !mime) return true;
  if (kind === "pdf") return mime === "application/pdf";
  if (kind === "font") return mime.startsWith("font/");
  return mime.startsWith(kind + "/");
}

const FONT_MIME: Record<string, string> = { woff2: "font/woff2", woff: "font/woff", ttf: "font/ttf", otf: "font/otf" };

async function readImage(file: File): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = URL.createObjectURL(file);
  });
}

/** Reduz imagens grandes (máx. 2400px, qualidade 85%) antes do envio. */
async function compress(file: File): Promise<{ blob: Blob; width?: number; height?: number; ext: string; type: string }> {
  const ext = (file.name.split(".").pop() || "").toLowerCase();
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
    const img = file.type.startsWith("image/") ? await readImage(file) : null;
    return { blob: file, width: img?.naturalWidth, height: img?.naturalHeight, ext, type: file.type || FONT_MIME[ext] || "application/octet-stream" };
  }
  const img = await readImage(file);
  if (!img) return { blob: file, ext, type: file.type };
  const max = 2400;
  const scale = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
  if (scale === 1 && file.size < 1.5 * 1024 * 1024) return { blob: file, width: img.naturalWidth, height: img.naturalHeight, ext, type: file.type };
  const w = Math.round(img.naturalWidth * scale);
  const h = Math.round(img.naturalHeight * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
  const type = file.type === "image/png" ? "image/png" : "image/webp";
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, type, 0.85));
  if (!blob || blob.size >= file.size) return { blob: file, width: img.naturalWidth, height: img.naturalHeight, ext, type: file.type };
  return { blob, width: w, height: h, ext: type === "image/png" ? "png" : "webp", type };
}

export async function uploadFile(file: File, folder = "geral"): Promise<MediaItem> {
  const supabase = createClient();
  const { blob, width, height, ext, type } = await compress(file);
  const base = slugify(file.name.replace(/\.[^.]+$/, "")) || "arquivo";
  const path = `${slugify(folder) || "geral"}/${Date.now().toString(36)}-${base}.${ext}`;
  const { error } = await supabase.storage.from(MEDIA_BUCKET).upload(path, blob, { contentType: type, cacheControl: "31536000", upsert: false });
  if (error) throw new Error(error.message.includes("mime") ? "Tipo de arquivo não permitido." : error.message);
  const url = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(path).data.publicUrl;
  const { data: user } = await supabase.auth.getUser();
  const { data, error: e2 } = await supabase
    .from("media")
    .insert({ path, url, mime: type, size_bytes: blob.size, width: width ?? null, height: height ?? null, alt: base.replace(/-/g, " "), folder: folder || "geral", created_by: user.user?.id })
    .select("*")
    .single();
  if (e2) throw new Error(e2.message);
  return data as MediaItem;
}

export async function listMedia(): Promise<MediaItem[]> {
  const { data } = await createClient().from("media").select("*").order("created_at", { ascending: false }).limit(500);
  return (data ?? []) as MediaItem[];
}

export async function deleteMedia(item: MediaItem) {
  const supabase = createClient();
  await supabase.storage.from(MEDIA_BUCKET).remove([item.path]);
  const { error } = await supabase.from("media").delete().eq("id", item.id);
  if (error) throw new Error(error.message);
}

export async function updateMedia(id: string, patch: Partial<Pick<MediaItem, "alt" | "folder">>) {
  const { error } = await createClient().from("media").update(patch).eq("id", id);
  if (error) throw new Error(error.message);
}

export { formatBytes } from "./bytes";
