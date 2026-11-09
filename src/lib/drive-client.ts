"use client";
import { createClient } from "./supabase/client";
import type { DriveFile, DriveFileInput, DriveFolder, DriveReadResult } from "./drive";

const CHUNK = 200;
const PARALLEL = 4;
const MAX_FOLDERS = 5000;

type Ok = Extract<DriveReadResult, { ok: true }>;

/** Lê uma pasta no Drive pela rota do painel (a chave da API fica só no servidor). */
async function readFolder(link: string, sub: boolean): Promise<Ok> {
  const res = await fetch(`/midia/drive?link=${encodeURIComponent(link)}&sub=${sub ? 1 : 0}`, { cache: "no-store" });
  let data: DriveReadResult;
  try {
    data = (await res.json()) as DriveReadResult;
  } catch {
    throw new Error(res.redirected || res.status === 401 ? "Sessão expirada. Entre novamente." : `Erro ${res.status} ao ler o Google Drive.`);
  }
  if (!data.ok) throw new Error(data.error);
  return data;
}

/** Busca todas as linhas de uma consulta, de 1000 em 1000 (limite do banco por consulta). */
async function all<T>(query: (from: number, to: number) => PromiseLike<{ data: unknown; error: { message: string } | null }>): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await query(from, from + 999);
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as T[];
    out.push(...rows);
    if (rows.length < 1000) return out;
  }
}

export async function listDriveFolders(): Promise<DriveFolder[]> {
  const supabase = createClient();
  return all<DriveFolder>((a, b) => supabase.from("drive_folders").select("*").order("name").range(a, b));
}

export async function listDriveFiles(folderId: string): Promise<DriveFile[]> {
  const supabase = createClient();
  return all<DriveFile>((a, b) => supabase.from("drive_files").select("*").eq("folder_id", folderId).order("name").range(a, b));
}

/** O que varrer: uma pasta nova (pelo link) ou uma já importada (principal ou subpasta). */
export type SyncTarget = { kind: "new"; link: string; recursive: boolean } | { kind: "folder"; folder: DriveFolder };

interface ScanNode {
  driveId: string;
  name: string;
  url: string;
  parentDriveId: string | null;
  depth: number;
  files: DriveFileInput[];
}

/**
 * Varre o Drive e grava na plataforma. Com subpastas, percorre a árvore inteira (sem limite de
 * níveis), lendo várias pastas em paralelo. Ao final, retira da lista o que foi apagado no Drive.
 * `onProgress` recebe 0–100 e um texto.
 */
export interface SyncResult {
  folderId: string;
  /** Subpastas que não puderam ser lidas (restritas no Drive, por exemplo). */
  skipped: string[];
}

export async function syncDrive(target: SyncTarget, onProgress: (pct: number, label: string) => void): Promise<SyncResult> {
  const supabase = createClient();
  const startLink = target.kind === "new" ? target.link : target.folder.url;
  const isSub = target.kind === "folder" && !!target.folder.parent_id;
  const recursive = target.kind === "new" ? target.recursive : isSub || target.folder.recursive;

  // 1) Leitura no Drive (até 40%)
  onProgress(1, "Lendo a pasta no Google Drive…");
  const first = await readFolder(startLink, recursive);
  const nodes: ScanNode[] = [{ driveId: first.driveId, name: first.name, url: first.url, parentDriveId: null, depth: 0, files: first.files }];
  const seen = new Set([first.driveId]);
  let queue = recursive ? first.subfolders.map((s) => ({ ...s, parent: first.driveId, depth: 1 })) : [];
  queue = queue.filter((s) => !seen.has(s.id) && seen.add(s.id));
  let discovered = 1 + queue.length;
  const skipped: string[] = [];
  const skippedDrive = new Set<string>();
  while (queue.length) {
    if (nodes.length + queue.length > MAX_FOLDERS) throw new Error(`A pasta tem mais de ${MAX_FOLDERS} subpastas. Importe partes menores.`);
    const batch = queue.splice(0, PARALLEL);
    // Uma subpasta restrita ou com erro não interrompe a varredura: ela é pulada e avisada no final.
    const results = await Promise.all(batch.map((s) => readFolder(s.id, true).catch((e: Error) => (skipped.push(`${s.name} (${e.message})`), skippedDrive.add(s.id), null))));
    results.forEach((r, i) => {
      const s = batch[i];
      if (!r) return;
      nodes.push({ driveId: r.driveId, name: r.name, url: r.url, parentDriveId: s.parent, depth: s.depth, files: r.files });
      for (const c of r.subfolders) {
        if (seen.has(c.id)) continue; // evita repetição (pasta com mais de um "pai")
        seen.add(c.id);
        queue.push({ ...c, parent: r.driveId, depth: s.depth + 1 });
        discovered++;
      }
    });
    const read = nodes.length + skipped.length;
    onProgress(1 + Math.round((read / discovered) * 39), `Lendo pastas no Drive: ${read} de ${discovered}`);
  }

  // 2) Pasta de partida e árvore existente
  onProgress(41, "Organizando pastas…");
  let rootId: string;
  let startId: string;
  if (target.kind === "new") {
    const { data: existing } = await supabase.from("drive_folders").select("id").eq("drive_id", first.driveId).is("parent_id", null).maybeSingle();
    if (existing) {
      startId = existing.id as string;
      const { error } = await supabase.from("drive_folders").update({ name: first.name, url: first.url, recursive }).eq("id", startId);
      if (error) throw new Error(error.message);
    } else {
      const { data: user } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("drive_folders")
        .insert({ drive_id: first.driveId, name: first.name, url: first.url, recursive, created_by: user.user?.id })
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      startId = data.id as string;
    }
    rootId = startId;
  } else {
    startId = target.folder.id;
    rootId = target.folder.root_id ?? target.folder.id;
    const { error } = await supabase.from("drive_folders").update({ name: first.name }).eq("id", startId);
    if (error) throw new Error(error.message);
  }

  const tree = await all<{ id: string; drive_id: string; parent_id: string | null }>((a, b) =>
    supabase.from("drive_folders").select("id, drive_id, parent_id").eq("root_id", rootId).range(a, b),
  );
  const idByDrive = new Map(tree.map((t) => [t.drive_id, t.id]));
  idByDrive.set(first.driveId, startId);

  // 3) Subpastas (pais antes dos filhos)
  const rows = nodes
    .slice(1)
    .sort((a, b) => a.depth - b.depth)
    .map((n) => {
      const id = idByDrive.get(n.driveId) ?? crypto.randomUUID();
      idByDrive.set(n.driveId, id);
      return { id, drive_id: n.driveId, name: n.name, url: n.url, parent_id: idByDrive.get(n.parentDriveId!)!, root_id: rootId };
    });
  for (let i = 0; i < rows.length; i += CHUNK) {
    const { error } = await supabase.from("drive_folders").upsert(rows.slice(i, i + CHUNK), { onConflict: "id" });
    if (error) throw new Error(error.message);
  }

  // Subpastas que sumiram do Drive (só abaixo da pasta de partida)
  const children = new Map<string, string[]>();
  for (const t of tree) if (t.parent_id) children.set(t.parent_id, [...(children.get(t.parent_id) ?? []), t.id]);
  const below: string[] = [];
  const walk = (id: string) => (children.get(id) ?? []).forEach((c) => (below.push(c), walk(c)));
  walk(startId);
  const keepIds = new Set(rows.map((r) => r.id));
  // Subpastas que não puderam ser lidas agora ficam como estavam (com o que há dentro delas).
  const kept: string[] = tree.filter((t) => skippedDrive.has(t.drive_id)).map((t) => t.id);
  for (const id of [...kept]) {
    const sub = (x: string): void => (children.get(x) ?? []).forEach((c) => (kept.push(c), sub(c)));
    sub(id);
  }
  kept.forEach((id) => keepIds.add(id));
  const staleFolders = below.filter((id) => !keepIds.has(id));
  for (let i = 0; i < staleFolders.length; i += CHUNK) {
    const { error } = await supabase.from("drive_folders").delete().in("id", staleFolders.slice(i, i + CHUNK));
    if (error) throw new Error(error.message);
  }

  // 4) Arquivos (até 95%)
  const folderIds = nodes.map((n) => idByDrive.get(n.driveId)!);
  const before: { id: string; folder_id: string; drive_id: string }[] = [];
  for (let i = 0; i < folderIds.length; i += 100) {
    const ids = folderIds.slice(i, i + 100);
    before.push(...(await all<{ id: string; folder_id: string; drive_id: string }>((a, b) => supabase.from("drive_files").select("id, folder_id, drive_id").in("folder_id", ids).range(a, b))));
  }
  const fileRows = nodes.flatMap((n) => n.files.map((f) => ({ ...f, folder_id: idByDrive.get(n.driveId)! })));
  const total = fileRows.length;
  for (let i = 0; i < total; i += CHUNK) {
    const { error } = await supabase.from("drive_files").upsert(fileRows.slice(i, i + CHUNK), { onConflict: "folder_id,drive_id" });
    if (error) throw new Error(error.message);
    const done = Math.min(total, i + CHUNK);
    onProgress(42 + Math.round((done / total) * 53), `Importando arquivos: ${done} de ${total}`);
  }
  const keepFiles = new Set(fileRows.map((f) => `${f.folder_id}/${f.drive_id}`));
  const staleFiles = before.filter((f) => !keepFiles.has(`${f.folder_id}/${f.drive_id}`)).map((f) => f.id);
  for (let i = 0; i < staleFiles.length; i += CHUNK) {
    const { error } = await supabase.from("drive_files").delete().in("id", staleFiles.slice(i, i + CHUNK));
    if (error) throw new Error(error.message);
  }

  // 5) Totais e data do último envio
  onProgress(97, "Atualizando contagens…");
  const { error: e1 } = await supabase.rpc("drive_recount", { p_root: rootId });
  if (e1) throw new Error(e1.message);
  const now = new Date().toISOString();
  const { error: e2 } = await supabase.from("drive_folders").update({ synced_at: now }).in("id", [...new Set([startId, rootId])]);
  if (e2) throw new Error(e2.message);

  const removed = staleFolders.length + staleFiles.length;
  onProgress(100, `Pronto · ${nodes.length} pasta(s), ${total} arquivo(s)${removed ? ` · ${removed} item(ns) apagados no Drive saíram da lista` : ""}`);
  return { folderId: startId, skipped };
}

/** Tira a pasta principal (e todas as subpastas) da plataforma. Os arquivos continuam no Drive. */
export async function removeDriveFolder(id: string) {
  const { error } = await createClient().from("drive_folders").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
