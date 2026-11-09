"use client";
import { useEffect, useMemo, useState } from "react";
import { Check, ChevronDown, ChevronsUp, Copy, ExternalLink, FileText, FolderOpen, FolderTree, Link2, RefreshCw, Search, Trash2 } from "lucide-react";
import type { MediaItem, MediaKind } from "@/lib/media";
import { formatBytes } from "@/lib/bytes";
import { driveFileUrl, driveMatchesKind, driveThumbUrl, driveToMediaItem, fileFormat, type DriveFile, type DriveFolder } from "@/lib/drive";
import { listDriveFiles, listDriveFolders, removeDriveFolder, syncDrive, type SyncTarget } from "@/lib/drive-client";
import { formatDate, formatDateTime } from "@/shared/format";
import { Modal } from "./Modal";

interface Progress {
  key: string; // "new" ou id da pasta
  pct: number;
  label: string;
}

const byName = (a: DriveFolder, b: DriveFolder) => a.name.localeCompare(b.name, "pt-BR", { numeric: true, sensitivity: "base" });
const shortDate = (iso: string | null) => (iso ? formatDate(iso, { day: "2-digit", month: "2-digit", year: "numeric" }) : "—");

/**
 * Aba "Google Drive" da biblioteca: pastas públicas do Drive vinculadas à plataforma, em árvore
 * (pasta principal → subpastas → …). Os arquivos são exibidos direto do Drive (não ocupam o armazenamento).
 */
export function DriveLibrary({ kind = "any", onSelect, multiple }: { kind?: MediaKind; onSelect?: (items: MediaItem[]) => void; multiple?: boolean }) {
  const [folders, setFolders] = useState<DriveFolder[] | null>(null);
  const [files, setFiles] = useState<Record<string, DriveFile[] | undefined>>({});
  const [open, setOpen] = useState<string[]>([]);
  const [q, setQ] = useState("");
  const [link, setLink] = useState("");
  const [asking, setAsking] = useState(false);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [selected, setSelected] = useState<MediaItem[]>([]);
  const [detail, setDetail] = useState<{ file: DriveFile; folder: DriveFolder } | null>(null);

  useEffect(() => {
    let alive = true;
    listDriveFolders()
      .then((r) => alive && setFolders(r))
      .catch((e) => {
        if (!alive) return;
        setFolders([]);
        setError(e instanceof Error ? e.message : "Não foi possível carregar as pastas.");
      });
    return () => {
      alive = false;
    };
  }, []);

  const { byId, children, roots } = useMemo(() => {
    const byId = new Map((folders ?? []).map((f) => [f.id, f]));
    const children = new Map<string, DriveFolder[]>();
    const roots: DriveFolder[] = [];
    for (const f of folders ?? []) {
      if (f.parent_id && byId.has(f.parent_id)) children.set(f.parent_id, [...(children.get(f.parent_id) ?? []), f]);
      else if (!f.parent_id) roots.push(f);
    }
    children.forEach((list) => list.sort(byName));
    return { byId, children, roots: roots.sort(byName) };
  }, [folders]);

  /** Caminho "Principal › Sub › Sub" de uma pasta. */
  const pathOf = (f: DriveFolder) => {
    const names: string[] = [];
    for (let p = f.parent_id ? byId.get(f.parent_id) : undefined; p; p = p.parent_id ? byId.get(p.parent_id) : undefined) names.unshift(p.name);
    return names.join(" › ");
  };

  const term = q.trim().toLowerCase();
  const visible = term ? (folders ?? []).filter((f) => f.name.toLowerCase().includes(term)).sort(byName) : roots;

  async function loadFiles(id: string) {
    try {
      const list = await listDriveFiles(id);
      setFiles((m) => ({ ...m, [id]: list }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar arquivos.");
    }
  }

  function toggle(f: DriveFolder) {
    setOpen((o) => (o.includes(f.id) ? o.filter((x) => x !== f.id) : [...o, f.id]));
    if (!files[f.id] && f.file_count > 0) loadFiles(f.id);
  }

  async function sync(target: SyncTarget, key: string) {
    if (progress) return;
    setError(null);
    setNotice(null);
    setProgress({ key, pct: 0, label: "Começando…" });
    try {
      const { folderId, skipped } = await syncDrive(target, (pct, label) => setProgress({ key, pct, label }));
      const list = await listDriveFolders();
      setFolders(list);
      setFiles({});
      // Abre a pasta atualizada e o caminho até ela.
      const map = new Map(list.map((f) => [f.id, f]));
      const chain: string[] = [];
      for (let f = map.get(folderId); f; f = f.parent_id ? map.get(f.parent_id) : undefined) chain.push(f.id);
      setOpen((o) => [...new Set([...o, ...chain])]);
      const opened = map.get(folderId);
      if (opened && opened.file_count > 0) loadFiles(opened.id);
      if (target.kind === "new") setLink("");
      if (skipped.length) setNotice(`${skipped.length} subpasta(s) não puderam ser lidas e ficaram de fora: ${skipped.slice(0, 5).join("; ")}${skipped.length > 5 ? "…" : ""}`);
      setTimeout(() => setProgress(null), 1500);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao importar a pasta.");
      setProgress(null);
    }
  }

  async function remove(f: DriveFolder) {
    const subs = (folders ?? []).filter((x) => x.root_id === f.id).length;
    if (!confirm(`Remover “${f.name}”${subs ? ` e suas ${subs} subpasta(s)` : ""} da plataforma?\n\nOs arquivos continuam no Google Drive. Imagens que já estão em páginas continuam aparecendo enquanto existirem no Drive.`)) return;
    try {
      await removeDriveFolder(f.id);
      setFolders((list) => (list ?? []).filter((x) => x.id !== f.id && x.root_id !== f.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao remover.");
    }
  }

  function pick(file: DriveFile, folder: DriveFolder) {
    if (!onSelect) return setDetail({ file, folder });
    const item = driveToMediaItem(file, folder);
    setSelected((s) => (s.some((m) => m.id === item.id) ? s.filter((m) => m.id !== item.id) : multiple ? [...s, item] : [item]));
  }

  function renderNode(f: DriveFolder, depth: number, showPath = false): React.ReactNode {
    const isOpen = open.includes(f.id);
    const kids = children.get(f.id) ?? [];
    const list = (files[f.id] ?? []).filter((x) => driveMatchesKind(x.mime, kind));
    const busy = progress?.key === f.id;
    const isRoot = !f.parent_id;
    const path = showPath ? pathOf(f) : "";
    return (
      <div key={f.id} className={depth === 0 ? "overflow-hidden rounded-xl border border-zinc-200 bg-white" : "border-t border-zinc-200"}>
        <div className="flex flex-wrap items-center gap-2 px-3 py-2.5">
          <button type="button" onClick={() => toggle(f)} className="flex min-w-0 flex-1 items-center gap-2 text-left" aria-expanded={isOpen}>
            <ChevronDown size={18} className={`shrink-0 text-zinc-500 transition ${isOpen ? "" : "-rotate-90"}`} />
            {kids.length ? <FolderTree size={18} className="shrink-0 text-brand-600" /> : <FolderOpen size={18} className="shrink-0 text-brand-600" />}
            <span className="min-w-0">
              {path && <span className="block truncate text-[11px] text-zinc-400">{path} ›</span>}
              <span className="block truncate font-medium">{f.name}</span>
              <span className="block text-xs text-zinc-500">
                {kids.length ? `${f.file_count} arquivo(s) aqui · ${f.total_count} no total · ${kids.length} subpasta(s)` : `${f.file_count} arquivo(s)`} · último envio {shortDate(f.last_upload_at)}
                {f.synced_at && <span title={`Atualizado em ${formatDateTime(f.synced_at)}`}> · atualizado {formatDate(f.synced_at, { day: "2-digit", month: "2-digit" })}</span>}
              </span>
            </span>
          </button>
          <a href={f.url} target="_blank" rel="noreferrer" className="adm-btn-ghost adm-btn-sm" title="Abrir no Google Drive (nova aba)">
            <ExternalLink size={14} /> Abrir
          </a>
          <button
            type="button"
            className="adm-btn-secondary adm-btn-sm"
            onClick={() => sync({ kind: "folder", folder: f }, f.id)}
            disabled={!!progress}
            title={isRoot && !f.recursive ? "Buscar no Drive os arquivos novos e retirar os apagados" : "Varrer de novo esta pasta e todas as de dentro"}
          >
            <RefreshCw size={14} className={busy ? "animate-spin" : ""} /> Atualizar
          </button>
          {isRoot && (
            <button type="button" className="adm-btn-ghost adm-btn-sm text-red-600" onClick={() => remove(f)} disabled={!!progress} title="Tirar esta pasta (e as de dentro) da plataforma">
              <Trash2 size={14} /> Remover
            </button>
          )}
        </div>
        {isOpen && (
          <div className="border-t border-zinc-200 bg-zinc-50">
            {kids.length > 0 && <div className="ml-4 border-l-2 border-brand-100 bg-white">{kids.map((c) => renderNode(c, depth + 1))}</div>}
            <div className="p-3">
              {f.file_count === 0 ? (
                <p className="p-2 text-center text-sm text-zinc-500">Nenhum arquivo nesta pasta.</p>
              ) : !files[f.id] ? (
                <p className="p-2 text-center text-sm text-zinc-500">Carregando arquivos…</p>
              ) : list.length === 0 ? (
                <p className="p-2 text-center text-sm text-zinc-500">{kind === "pdf" ? "Nenhum PDF nesta pasta." : kind === "image" ? "Nenhuma imagem nesta pasta." : "Nenhum arquivo nesta pasta."}</p>
              ) : (
                <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
                  {list.map((file) => {
                    const sel = selected.some((m) => m.id === `drive:${file.id}`);
                    return (
                      <button type="button" key={file.id} onClick={() => pick(file, f)} className="flex min-w-0 flex-col gap-1 text-left" title={file.name}>
                        <span className={`relative block aspect-square w-full overflow-hidden rounded-lg border bg-white ${sel ? "border-brand-500 ring-2 ring-brand-500" : "border-zinc-200 hover:border-zinc-400"}`}>
                          <DriveThumb file={file} />
                          {sel && <span className="absolute right-1.5 top-1.5 rounded-full bg-brand-500 p-0.5 text-white"><Check size={14} /></span>}
                        </span>
                        <span className="truncate text-xs text-zinc-700">{file.name.replace(/\.[^.]+$/, "")}</span>
                        <span className="-mt-1 text-[10px] font-semibold uppercase text-zinc-400">{fileFormat(file)}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <form
        className="flex flex-wrap gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (link.trim() && !progress) setAsking(true);
        }}
      >
        <div className="relative min-w-60 flex-1">
          <Link2 size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input value={link} onChange={(e) => setLink(e.target.value)} placeholder="Cole o link de uma pasta do Google Drive" className="adm-input pl-9" />
        </div>
        <button type="submit" className="adm-btn-primary" disabled={!link.trim() || !!progress}>
          <FolderOpen size={16} /> Adicionar pasta
        </button>
      </form>
      <p className="-mt-2 text-xs text-zinc-500">
        A pasta precisa estar compartilhada como “Qualquer pessoa com o link”. Entram imagens e PDFs; com a varredura completa, também todas as subpastas, organizadas em árvore. Os arquivos continuam no Drive e não ocupam o armazenamento.
      </p>

      {progress && (
        <div className="rounded-lg border border-brand-100 bg-brand-50 px-3 py-2">
          <div className="mb-1 flex justify-between gap-3 text-xs text-zinc-700">
            <span>{progress.label}</span>
            <span className="font-semibold tabular-nums">{progress.pct}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white">
            <div className="h-full rounded-full bg-brand-500 transition-all" style={{ width: `${progress.pct}%` }} />
          </div>
        </div>
      )}
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {notice && <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">{notice}</p>}

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-40 flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar pasta ou subpasta pelo nome" className="adm-input pl-9" />
        </div>
        <button type="button" className="adm-btn-secondary" onClick={() => setOpen([])} disabled={!open.length}>
          <ChevronsUp size={16} /> Recolher todas
        </button>
      </div>

      {folders === null ? (
        <p className="p-8 text-center text-sm text-zinc-500">Carregando…</p>
      ) : visible.length === 0 ? (
        <div className="flex flex-col items-center gap-2 p-10 text-center text-sm text-zinc-500">
          <FolderOpen size={28} />
          {folders.length ? "Nenhuma pasta com esse nome." : "Nenhuma pasta do Drive adicionada ainda."}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {term && <p className="text-xs text-zinc-500">{visible.length} pasta(s) encontrada(s)</p>}
          {visible.map((f) => renderNode(f, 0, !!term))}
        </div>
      )}

      {onSelect && (
        <div className="sticky bottom-0 flex items-center justify-end gap-2 border-t border-zinc-200 bg-white pt-3">
          <span className="mr-auto text-sm text-zinc-500">{selected.length ? `${selected.length} selecionado(s)` : "Abra uma pasta e clique para selecionar"}</span>
          <button type="button" className="adm-btn-primary" disabled={!selected.length} onClick={() => onSelect(selected)}>
            Usar {multiple ? "selecionados" : "arquivo"}
          </button>
        </div>
      )}

      <Modal open={asking} onClose={() => setAsking(false)} title="Como importar esta pasta?">
        <div className="flex flex-col gap-3">
          <button
            type="button"
            className="flex items-start gap-3 rounded-xl border-2 border-brand-500 bg-brand-50 p-4 text-left hover:bg-brand-100"
            onClick={() => {
              setAsking(false);
              sync({ kind: "new", link, recursive: true }, "new");
            }}
          >
            <FolderTree size={22} className="mt-0.5 shrink-0 text-brand-600" />
            <span>
              <span className="block font-semibold">Varredura completa</span>
              <span className="text-sm text-zinc-600">Esta pasta e todas as subpastas, em todos os níveis, organizadas em árvore.</span>
            </span>
          </button>
          <button
            type="button"
            className="flex items-start gap-3 rounded-xl border border-zinc-200 p-4 text-left hover:border-zinc-400"
            onClick={() => {
              setAsking(false);
              sync({ kind: "new", link, recursive: false }, "new");
            }}
          >
            <FolderOpen size={22} className="mt-0.5 shrink-0 text-zinc-500" />
            <span>
              <span className="block font-semibold">Apenas esta pasta</span>
              <span className="text-sm text-zinc-600">Só as imagens e PDFs que estão direto nela; as subpastas são ignoradas.</span>
            </span>
          </button>
        </div>
      </Modal>
      <DriveDetail detail={detail} onClose={() => setDetail(null)} />
    </div>
  );
}

function DriveThumb({ file }: { file: DriveFile }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <span className="flex h-full w-full flex-col items-center justify-center gap-1 bg-zinc-100 text-zinc-500">
        <FileText size={26} />
        <span className="text-[10px] font-semibold">{fileFormat(file)}</span>
      </span>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={driveThumbUrl(file)} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(true)} className="h-full w-full object-cover" />;
}

function DriveDetail({ detail, onClose }: { detail: { file: DriveFile; folder: DriveFolder } | null; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  if (!detail) return null;
  const { file, folder } = detail;
  const url = driveFileUrl(file);
  const pdf = file.mime === "application/pdf";
  return (
    <Modal open onClose={onClose} title={file.name} wide>
      <div className="grid gap-5 md:grid-cols-2">
        <div className="overflow-hidden rounded-lg border bg-zinc-50">
          {pdf ? (
            <iframe src={`https://drive.google.com/file/d/${file.drive_id}/preview`} className="h-80 w-full" title={file.name} />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={driveThumbUrl(file, 1200)} alt="" referrerPolicy="no-referrer" className="max-h-80 w-full object-contain" />
          )}
        </div>
        <div className="flex flex-col gap-3 text-sm">
          <div className="text-zinc-500">
            Pasta do Drive: <strong className="text-zinc-700">{folder.name}</strong>
            <br />
            {fileFormat(file)} · {formatBytes(file.size_bytes)} {file.width ? `· ${file.width}×${file.height}px` : ""}
            {file.drive_created_at && <><br />Enviado em {formatDateTime(file.drive_created_at)}</>}
          </div>
          <label className="adm-label">
            Endereço usado no site
            <div className="flex gap-2">
              <input readOnly value={url} className="adm-input text-xs" />
              <button type="button" className="adm-btn-secondary" onClick={() => navigator.clipboard.writeText(url).then(() => setCopied(true))}>
                {copied ? <Check size={16} /> : <Copy size={16} />}
              </button>
            </div>
          </label>
          <p className="adm-help">Para usar no site, escolha este arquivo na aba “Google Drive” dos campos de imagem, galerias, botões ou listas de links do editor.</p>
          <a href={`https://drive.google.com/file/d/${file.drive_id}/view`} target="_blank" rel="noreferrer" className="adm-btn-secondary mt-auto self-start">
            <ExternalLink size={16} /> Abrir no Google Drive
          </a>
        </div>
      </div>
    </Modal>
  );
}
