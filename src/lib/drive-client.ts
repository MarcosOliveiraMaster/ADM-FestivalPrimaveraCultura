"use client";
import { createClient } from "./supabase/client";
import { fetchDriveFolder } from "@/app/(painel)/midia/drive-actions";
import type { DriveFile, DriveFolder } from "./drive";

const CHUNK = 100;

export async function listDriveFolders(): Promise<DriveFolder[]> {
  const { data, error } = await createClient().from("drive_folders").select("*").order("name");
  if (error) throw new Error(error.message);
  return (data ?? []) as DriveFolder[];
}

/** Todos os arquivos de uma pasta (em páginas de 1000, limite do banco por consulta). */
export async function listDriveFiles(folderId: string): Promise<DriveFile[]> {
  const supabase = createClient();
  const all: DriveFile[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from("drive_files").select("*").eq("folder_id", folderId).order("name").range(from, from + 999);
    if (error) throw new Error(error.message);
    all.push(...((data ?? []) as DriveFile[]));
    if (!data || data.length < 1000) return all;
  }
}

/**
 * Adiciona uma pasta (ou atualiza, se já existir): lê o Drive, grava os arquivos em lotes
 * e remove os que saíram da pasta. `onProgress` recebe 0–100.
 */
export async function syncDriveFolder(link: string, onProgress: (pct: number, label: string) => void): Promise<DriveFolder> {
  const supabase = createClient();
  onProgress(3, "Lendo a pasta no Google Drive…");
  const res = await fetchDriveFolder(link);
  if (!res.ok) throw new Error(res.error);
  onProgress(10, `${res.files.length} arquivo(s) encontrados`);

  const { data: existing } = await supabase.from("drive_folders").select("id").eq("drive_id", res.driveId).maybeSingle();
  let folderId = existing?.id as string | undefined;
  if (folderId) {
    const { error } = await supabase.from("drive_folders").update({ name: res.name, url: res.url }).eq("id", folderId);
    if (error) throw new Error(error.message);
  } else {
    const { data: user } = await supabase.auth.getUser();
    const { data, error } = await supabase.from("drive_folders").insert({ drive_id: res.driveId, name: res.name, url: res.url, created_by: user.user?.id }).select("id").single();
    if (error) throw new Error(error.message);
    folderId = data.id as string;
  }

  const before = folderId && existing ? await listDriveFiles(folderId) : [];
  const total = res.files.length;
  for (let i = 0; i < total; i += CHUNK) {
    const rows = res.files.slice(i, i + CHUNK).map((f) => ({ ...f, folder_id: folderId }));
    const { error } = await supabase.from("drive_files").upsert(rows, { onConflict: "folder_id,drive_id" });
    if (error) throw new Error(error.message);
    const done = Math.min(total, i + CHUNK);
    onProgress(10 + Math.round((done / total) * 85), `Importando ${done} de ${total}…`);
  }

  const keep = new Set(res.files.map((f) => f.drive_id));
  const stale = before.filter((f) => !keep.has(f.drive_id)).map((f) => f.id);
  for (let i = 0; i < stale.length; i += CHUNK) {
    const { error } = await supabase.from("drive_files").delete().in("id", stale.slice(i, i + CHUNK));
    if (error) throw new Error(error.message);
  }

  const lastUpload = res.files.reduce<string | null>((m, f) => (f.drive_created_at && (!m || f.drive_created_at > m) ? f.drive_created_at : m), null);
  const { data: folder, error } = await supabase
    .from("drive_folders")
    .update({ file_count: total, last_upload_at: lastUpload, synced_at: new Date().toISOString() })
    .eq("id", folderId)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  onProgress(100, stale.length ? `Pronto · ${stale.length} arquivo(s) apagados no Drive saíram da lista` : "Pronto");
  return folder as DriveFolder;
}

/** Tira a pasta da plataforma (os arquivos continuam no Drive). */
export async function removeDriveFolder(id: string) {
  const { error } = await createClient().from("drive_folders").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
