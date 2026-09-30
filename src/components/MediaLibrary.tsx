"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, Copy, FileText, Film, Search, Trash2, Type, Upload } from "lucide-react";
import { ACCEPT, deleteMedia, formatBytes, listMedia, matchesKind, updateMedia, uploadFile, type MediaItem, type MediaKind } from "@/lib/media";
import { Modal } from "./Modal";

function Thumb({ m }: { m: MediaItem }) {
  if (m.mime?.startsWith("image/")) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={m.url} alt={m.alt ?? ""} className="h-full w-full object-cover" loading="lazy" />;
  }
  const Icon = m.mime?.startsWith("video/") ? Film : m.mime?.startsWith("font/") ? Type : FileText;
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-1 bg-zinc-100 p-2 text-zinc-500">
      <Icon size={28} />
      <span className="line-clamp-2 break-all text-center text-[10px]">{m.path.split("/").pop()}</span>
    </div>
  );
}

export function MediaLibrary({ kind = "any", onSelect, multiple, defaultFolder = "geral" }: { kind?: MediaKind; onSelect?: (items: MediaItem[]) => void; multiple?: boolean; defaultFolder?: string }) {
  const [items, setItems] = useState<MediaItem[] | null>(null);
  const [q, setQ] = useState("");
  const [folder, setFolder] = useState<string>("todas");
  const [selected, setSelected] = useState<string[]>([]);
  const [uploading, setUploading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<MediaItem | null>(null);
  const [drag, setDrag] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const [uploadFolder, setUploadFolder] = useState(defaultFolder);

  const load = useCallback(async () => setItems(await listMedia()), []);
  useEffect(() => {
    let alive = true;
    listMedia().then((r) => alive && setItems(r));
    return () => {
      alive = false;
    };
  }, []);

  const folders = useMemo(() => [...new Set((items ?? []).map((m) => m.folder || "geral"))].sort(), [items]);
  const visible = (items ?? []).filter(
    (m) => matchesKind(m.mime, kind) && (folder === "todas" || (m.folder || "geral") === folder) && (!q || `${m.alt} ${m.path}`.toLowerCase().includes(q.toLowerCase())),
  );

  async function upload(files: FileList | File[]) {
    setError(null);
    const list = [...files];
    const done: MediaItem[] = [];
    for (let i = 0; i < list.length; i++) {
      setUploading(`Enviando ${i + 1} de ${list.length}…`);
      try {
        done.push(await uploadFile(list[i], uploadFolder));
      } catch (e) {
        setError(`${list[i].name}: ${e instanceof Error ? e.message : "erro"}`);
      }
    }
    setUploading(null);
    await load();
    if (onSelect && done.length) {
      if (multiple) setSelected((s) => [...s, ...done.map((d) => d.id)]);
      else setSelected([done[0].id]);
    }
  }

  function toggle(m: MediaItem) {
    if (!onSelect) return setEditing(m);
    setSelected((s) => (multiple ? (s.includes(m.id) ? s.filter((x) => x !== m.id) : [...s, m.id]) : [m.id]));
  }

  return (
    <div
      className="flex flex-col gap-4"
      onDragOver={(e) => {
        e.preventDefault();
        setDrag(true);
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDrag(false);
        if (e.dataTransfer.files.length) upload(e.dataTransfer.files);
      }}
    >
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-40 flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar" className="adm-input pl-9" />
        </div>
        <select value={folder} onChange={(e) => setFolder(e.target.value)} className="adm-input w-auto">
          <option value="todas">Todas as pastas</option>
          {folders.map((f) => (
            <option key={f}>{f}</option>
          ))}
        </select>
        <input value={uploadFolder} onChange={(e) => setUploadFolder(e.target.value)} className="adm-input w-36" title="Pasta dos novos envios" placeholder="pasta" />
        <input ref={input} type="file" multiple accept={ACCEPT[kind]} className="hidden" onChange={(e) => e.target.files && upload(e.target.files)} />
        <button type="button" className="adm-btn-primary" onClick={() => input.current?.click()} disabled={!!uploading}>
          <Upload size={16} /> {uploading ?? "Enviar arquivos"}
        </button>
      </div>
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <div className={`rounded-xl border-2 border-dashed p-3 transition ${drag ? "border-brand-500 bg-brand-50" : "border-transparent"}`}>
        {items === null ? (
          <p className="p-8 text-center text-sm text-zinc-500">Carregando…</p>
        ) : visible.length === 0 ? (
          <div className="flex flex-col items-center gap-2 p-10 text-center text-sm text-zinc-500">
            <Upload size={28} />
            Arraste arquivos para cá ou clique em “Enviar arquivos”.
            <span className="text-xs">Imagens grandes são reduzidas automaticamente.</span>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
            {visible.map((m) => {
              const sel = selected.includes(m.id);
              return (
                <button type="button" key={m.id} onClick={() => toggle(m)} className={`group relative aspect-square overflow-hidden rounded-lg border bg-white text-left ${sel ? "border-brand-500 ring-2 ring-brand-500" : "border-zinc-200 hover:border-zinc-400"}`}>
                  <Thumb m={m} />
                  {sel && <span className="absolute right-1.5 top-1.5 rounded-full bg-brand-500 p-0.5 text-white"><Check size={14} /></span>}
                  <span className="absolute inset-x-0 bottom-0 truncate bg-black/55 px-2 py-1 text-[10px] text-white opacity-0 transition group-hover:opacity-100">
                    {m.alt || m.path.split("/").pop()} {m.width ? `· ${m.width}×${m.height}` : ""}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
      {onSelect && (
        <div className="sticky bottom-0 flex items-center justify-end gap-2 border-t border-zinc-200 bg-white pt-3">
          <span className="mr-auto text-sm text-zinc-500">{selected.length ? `${selected.length} selecionado(s)` : "Clique para selecionar"}</span>
          <button type="button" className="adm-btn-primary" disabled={!selected.length} onClick={() => onSelect(selected.map((id) => items!.find((m) => m.id === id)!).filter(Boolean))}>
            Usar {multiple ? "selecionados" : "arquivo"}
          </button>
        </div>
      )}
      <EditMedia item={editing} onClose={() => setEditing(null)} onChanged={load} />
    </div>
  );
}

function EditMedia({ item, onClose, onChanged }: { item: MediaItem | null; onClose: () => void; onChanged: () => void }) {
  const [alt, setAlt] = useState("");
  const [folder, setFolder] = useState("");
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [lastId, setLastId] = useState<string | null>(null);
  if (item && item.id !== lastId) {
    setLastId(item.id);
    setAlt(item.alt ?? "");
    setFolder(item.folder ?? "geral");
  }
  if (!item) return null;
  return (
    <Modal open onClose={onClose} title="Detalhes do arquivo" wide>
      <div className="grid gap-5 md:grid-cols-2">
        <div className="overflow-hidden rounded-lg border bg-zinc-50">
          {item.mime?.startsWith("image/") ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.url} alt={item.alt ?? ""} className="max-h-80 w-full object-contain" />
          ) : item.mime?.startsWith("video/") ? (
            <video src={item.url} controls className="w-full" />
          ) : (
            <div className="aspect-square"><Thumb m={item} /></div>
          )}
        </div>
        <div className="flex flex-col gap-3 text-sm">
          <label className="adm-label">Texto alternativo (acessibilidade)<input value={alt} onChange={(e) => setAlt(e.target.value)} className="adm-input" /></label>
          <label className="adm-label">Pasta<input value={folder} onChange={(e) => setFolder(e.target.value)} className="adm-input" /></label>
          <div className="text-zinc-500">
            {item.mime} · {formatBytes(item.size_bytes)} {item.width ? `· ${item.width}×${item.height}px` : ""}
          </div>
          <div className="flex gap-2">
            <input readOnly value={item.url} className="adm-input text-xs" />
            <button type="button" className="adm-btn-secondary" onClick={() => navigator.clipboard.writeText(item.url).then(() => setCopied(true))}>
              {copied ? <Check size={16} /> : <Copy size={16} />}
            </button>
          </div>
          <div className="mt-auto flex justify-between gap-2 pt-3">
            <button
              type="button"
              className="adm-btn-ghost text-red-600"
              disabled={busy}
              onClick={async () => {
                if (!confirm("Excluir este arquivo? Se ele estiver em uso em alguma página, deixará de aparecer.")) return;
                setBusy(true);
                await deleteMedia(item).catch((e) => alert(e.message));
                setBusy(false);
                onChanged();
                onClose();
              }}
            >
              <Trash2 size={16} /> Excluir
            </button>
            <button
              type="button"
              className="adm-btn-primary"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                await updateMedia(item.id, { alt, folder: folder || "geral" }).catch((e) => alert(e.message));
                setBusy(false);
                onChanged();
                onClose();
              }}
            >
              Salvar
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

/** Campo de formulário que escolhe um arquivo da biblioteca. */
export function MediaField({ label, value, onChange, kind = "image", help, folder }: { label: string; value?: string | null; onChange: (url: string) => void; kind?: MediaKind; help?: string; folder?: string }) {
  const [open, setOpen] = useState(false);
  const isImg = kind === "image" || (value && /\.(png|jpe?g|webp|gif|svg|avif)(\?|$)/i.test(value));
  return (
    <div className="adm-label">
      {label}
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => setOpen(true)} className="flex h-16 w-24 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-dashed border-zinc-300 bg-zinc-50 text-xs text-zinc-400 hover:border-brand-500">
          {value ? (
            isImg ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={value} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="px-1 text-center">arquivo ✓</span>
            )
          ) : (
            "Escolher"
          )}
        </button>
        <div className="flex flex-col gap-1">
          <div className="flex gap-1">
            <button type="button" className="adm-btn-secondary adm-btn-sm" onClick={() => setOpen(true)}>{value ? "Trocar" : "Escolher"}</button>
            {value && <button type="button" className="adm-btn-ghost adm-btn-sm text-red-600" onClick={() => onChange("")}>Remover</button>}
          </div>
          {help && <span className="adm-help">{help}</span>}
        </div>
      </div>
      <Modal open={open} onClose={() => setOpen(false)} title="Biblioteca de mídia" wide="xl">
        <MediaLibrary
          kind={kind}
          defaultFolder={folder}
          onSelect={(items) => {
            if (items[0]) onChange(items[0].url);
            setOpen(false);
          }}
        />
      </Modal>
    </div>
  );
}

export function MediaPickerModal({ open, onClose, onSelect, kind = "image", multiple }: { open: boolean; onClose: () => void; onSelect: (items: MediaItem[]) => void; kind?: MediaKind; multiple?: boolean }) {
  return (
    <Modal open={open} onClose={onClose} title="Biblioteca de mídia" wide="xl">
      <MediaLibrary
        kind={kind}
        multiple={multiple}
        onSelect={(items) => {
          onSelect(items);
          onClose();
        }}
      />
    </Modal>
  );
}
