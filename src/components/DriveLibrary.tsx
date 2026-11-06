"use client";
import { useEffect, useMemo, useState } from "react";
import { Check, ChevronDown, ChevronsUp, Copy, ExternalLink, FileText, FolderOpen, Link2, RefreshCw, Search, Trash2 } from "lucide-react";
import type { MediaItem, MediaKind } from "@/lib/media";
import { formatBytes } from "@/lib/bytes";
import { driveFileUrl, driveMatchesKind, driveThumbUrl, driveToMediaItem, fileFormat, type DriveFile, type DriveFolder } from "@/lib/drive";
import { listDriveFiles, listDriveFolders, removeDriveFolder, syncDriveFolder } from "@/lib/drive-client";
import { formatDate, formatDateTime } from "@/shared/format";
import { Modal } from "./Modal";

interface Progress {
  key: string; // "new" ou id da pasta
  pct: number;
  label: string;
}

/**
 * Aba "Google Drive" da biblioteca: pastas públicas do Drive vinculadas à plataforma.
 * Os arquivos são exibidos direto do Drive (não ocupam o armazenamento).
 */
export function DriveLibrary({ kind = "any", onSelect, multiple }: { kind?: MediaKind; onSelect?: (items: MediaItem[]) => void; multiple?: boolean }) {
  const [folders, setFolders] = useState<DriveFolder[] | null>(null);
  const [files, setFiles] = useState<Record<string, DriveFile[] | undefined>>({});
  const [open, setOpen] = useState<string[]>([]);
  const [q, setQ] = useState("");
  const [link, setLink] = useState("");
  const [progress, setProgress] = useState<Progress | null>(null);
  const [error, setError] = useState<string | null>(null);
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

  const visible = useMemo(() => (folders ?? []).filter((f) => !q || f.name.toLowerCase().includes(q.toLowerCase())), [folders, q]);

  async function loadFiles(id: string) {
    try {
      const list = await listDriveFiles(id);
      setFiles((m) => ({ ...m, [id]: list }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar arquivos.");
    }
  }

  function toggle(id: string) {
    setOpen((o) => (o.includes(id) ? o.filter((x) => x !== id) : [...o, id]));
    if (!files[id]) loadFiles(id);
  }

  async function sync(input: string, key: string) {
    if (progress) return;
    setError(null);
    setProgress({ key, pct: 0, label: "Começando…" });
    try {
      const folder = await syncDriveFolder(input, (pct, label) => setProgress({ key, pct, label }));
      setFolders((list) => [...(list ?? []).filter((f) => f.id !== folder.id), folder].sort((a, b) => a.name.localeCompare(b.name)));
      setFiles((m) => ({ ...m, [folder.id]: undefined }));
      setOpen((o) => (o.includes(folder.id) ? o : [...o, folder.id]));
      await loadFiles(folder.id);
      if (key === "new") setLink("");
      setTimeout(() => setProgress(null), 1200);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao importar a pasta.");
      setProgress(null);
    }
  }

  async function remove(f: DriveFolder) {
    if (!confirm(`Remover a pasta “${f.name}” da plataforma?\n\nOs arquivos continuam no Google Drive. Imagens dela que já estão em páginas continuam aparecendo enquanto existirem no Drive.`)) return;
    try {
      await removeDriveFolder(f.id);
      setFolders((list) => (list ?? []).filter((x) => x.id !== f.id));
      setSelected((s) => s.filter((m) => m.folder !== f.name));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao remover.");
    }
  }

  function pick(file: DriveFile, folder: DriveFolder) {
    if (!onSelect) return setDetail({ file, folder });
    const item = driveToMediaItem(file, folder);
    setSelected((s) => (s.some((m) => m.id === item.id) ? s.filter((m) => m.id !== item.id) : multiple ? [...s, item] : [item]));
  }

  return (
    <div className="flex flex-col gap-4">
      <form
        className="flex flex-wrap gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (link.trim()) sync(link, "new");
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
        A pasta precisa estar compartilhada como “Qualquer pessoa com o link”. Entram só as imagens e PDFs da própria pasta (subpastas são ignoradas). Os arquivos continuam no Drive e não ocupam o armazenamento.
      </p>

      {progress && (
        <div className="rounded-lg border border-brand-100 bg-brand-50 px-3 py-2">
          <div className="mb-1 flex justify-between text-xs text-zinc-700">
            <span>{progress.label}</span>
            <span className="font-semibold tabular-nums">{progress.pct}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white">
            <div className="h-full rounded-full bg-brand-500 transition-all" style={{ width: `${progress.pct}%` }} />
          </div>
        </div>
      )}
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-40 flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar pasta pelo nome" className="adm-input pl-9" />
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
          {visible.map((f) => {
            const isOpen = open.includes(f.id);
            const list = (files[f.id] ?? []).filter((x) => driveMatchesKind(x.mime, kind));
            const busy = progress?.key === f.id;
            return (
              <div key={f.id} className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
                <div className="flex flex-wrap items-center gap-2 px-3 py-2.5">
                  <button type="button" onClick={() => toggle(f.id)} className="flex min-w-0 flex-1 items-center gap-2 text-left" aria-expanded={isOpen}>
                    <ChevronDown size={18} className={`shrink-0 text-zinc-500 transition ${isOpen ? "" : "-rotate-90"}`} />
                    <FolderOpen size={18} className="shrink-0 text-brand-600" />
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{f.name}</span>
                      <span className="block text-xs text-zinc-500">
                        {f.file_count} arquivo(s) · último envio {f.last_upload_at ? formatDate(f.last_upload_at, { day: "2-digit", month: "2-digit", year: "numeric" }) : "—"}
                        {f.synced_at && <span title={`Atualizado em ${formatDateTime(f.synced_at)}`}> · atualizado {formatDate(f.synced_at, { day: "2-digit", month: "2-digit" })}</span>}
                      </span>
                    </span>
                  </button>
                  <a href={f.url} target="_blank" rel="noreferrer" className="adm-btn-ghost adm-btn-sm" title="Abrir a pasta no Google Drive (nova aba)">
                    <ExternalLink size={14} /> Abrir
                  </a>
                  <button type="button" className="adm-btn-secondary adm-btn-sm" onClick={() => sync(f.url, f.id)} disabled={!!progress} title="Buscar no Drive os arquivos novos e retirar os apagados">
                    <RefreshCw size={14} className={busy ? "animate-spin" : ""} /> Atualizar
                  </button>
                  <button type="button" className="adm-btn-ghost adm-btn-sm text-red-600" onClick={() => remove(f)} disabled={busy} title="Tirar esta pasta da plataforma">
                    <Trash2 size={14} /> Remover
                  </button>
                  <button type="button" onClick={() => toggle(f.id)} className="rounded p-1 text-zinc-500 hover:bg-zinc-100" aria-label={isOpen ? "Recolher" : "Expandir"}>
                    <ChevronDown size={18} className={`transition ${isOpen ? "rotate-180" : ""}`} />
                  </button>
                </div>
                {isOpen && (
                  <div className="border-t border-zinc-200 bg-zinc-50 p-3">
                    {!files[f.id] ? (
                      <p className="p-4 text-center text-sm text-zinc-500">Carregando arquivos…</p>
                    ) : list.length === 0 ? (
                      <p className="p-4 text-center text-sm text-zinc-500">{kind === "pdf" ? "Nenhum PDF nesta pasta." : kind === "image" ? "Nenhuma imagem nesta pasta." : "Pasta vazia."}</p>
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
                )}
              </div>
            );
          })}
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
