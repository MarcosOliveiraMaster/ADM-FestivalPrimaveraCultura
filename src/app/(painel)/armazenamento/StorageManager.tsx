"use client";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FileText, Film, Trash2 } from "lucide-react";
import { deleteMedia, formatBytes, type MediaItem } from "@/lib/media";
import { FramedImage } from "@/shared/render/FramedImage";
import { formatDate } from "@/shared/format";

export type StorageFile = Pick<MediaItem, "id" | "path" | "url" | "mime" | "size_bytes" | "alt" | "folder" | "created_at"> & { used: boolean };

/** Todas as mídias, da maior para a menor, com indicação de uso e exclusão (individual ou em lote). */
export function StorageManager({ files }: { files: StorageFile[] }) {
  const router = useRouter();
  const [busy, start] = useTransition();
  const [filter, setFilter] = useState<"todos" | "sem-uso" | "em-uso">("todos");
  const [sel, setSel] = useState<Set<string>>(new Set());
  const list = useMemo(() => files.filter((f) => filter === "todos" || (filter === "sem-uso" ? !f.used : f.used)), [files, filter]);
  const chosen = files.filter((f) => sel.has(f.id));
  const toggle = (id: string) => setSel((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  function remove(items: StorageFile[]) {
    const inUse = items.filter((f) => f.used).length;
    const msg = `Excluir ${items.length} arquivo(s) (${formatBytes(items.reduce((s, f) => s + (f.size_bytes ?? 0), 0))})?` +
      (inUse ? `\n\nATENÇÃO: ${inUse} deles está(ão) em uso no site e deixará(ão) de aparecer.` : "") + "\n\nEsta ação não pode ser desfeita.";
    if (!confirm(msg)) return;
    start(async () => {
      for (const f of items) await deleteMedia(f as unknown as MediaItem).catch((e) => alert(e.message));
      setSel(new Set());
      router.refresh();
    });
  }

  return (
    <div className="adm-card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 px-4 py-3">
        <div className="text-sm font-semibold">Todas as mídias ({files.length})</div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex gap-1 rounded-lg bg-zinc-100 p-1 text-sm">
            {([["todos", "Todas"], ["sem-uso", "Sem uso"], ["em-uso", "Em uso"]] as const).map(([v, l]) => (
              <button key={v} type="button" onClick={() => { setFilter(v); setSel(new Set()); }} className={`rounded-md px-3 py-1 ${filter === v ? "bg-white font-medium shadow-sm" : "text-zinc-600"}`}>{l}</button>
            ))}
          </div>
          {filter === "sem-uso" && list.length > 0 && <button type="button" className="adm-btn-secondary adm-btn-sm" onClick={() => setSel(new Set(list.map((f) => f.id)))}>Selecionar todas</button>}
          <button type="button" className="adm-btn-sm adm-btn-primary !bg-red-600 hover:!bg-red-700" disabled={busy || !chosen.length} onClick={() => remove(chosen)}>
            <Trash2 size={14} /> Excluir selecionadas{chosen.length ? ` (${chosen.length})` : ""}
          </button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="adm-table">
          <thead><tr><th /><th>Arquivo</th><th>Tamanho</th><th className="hidden md:table-cell">Pasta</th><th className="hidden md:table-cell">Enviado</th><th>Uso</th><th /></tr></thead>
          <tbody>
            {list.map((f) => (
              <tr key={f.id} className={sel.has(f.id) ? "bg-red-50/50" : ""}>
                <td className="w-8"><input type="checkbox" className="h-4 w-4" checked={sel.has(f.id)} onChange={() => toggle(f.id)} aria-label="Selecionar" /></td>
                <td>
                  <a href={f.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3">
                    <span className="flex h-10 w-14 shrink-0 items-center justify-center overflow-hidden rounded bg-zinc-100 text-zinc-400">
                      {f.mime?.startsWith("image/") ? <FramedImage url={f.url} className="h-full w-full object-cover" /> : f.mime?.startsWith("video/") ? <Film size={18} /> : <FileText size={18} />}
                    </span>
                    <span className="min-w-0"><span className="block max-w-56 truncate text-sm">{f.alt || f.path.split("/").pop()}</span><span className="text-xs text-zinc-500">{f.mime}</span></span>
                  </a>
                </td>
                <td className="whitespace-nowrap font-medium">{formatBytes(f.size_bytes) || "—"}</td>
                <td className="hidden text-sm text-zinc-500 md:table-cell">{f.folder ?? "—"}</td>
                <td className="hidden text-xs text-zinc-500 md:table-cell">{formatDate(f.created_at, { day: "2-digit", month: "short", year: "numeric" })}</td>
                <td>{f.used ? <span className="adm-badge bg-brand-50 text-brand-700">em uso</span> : <span className="adm-badge bg-zinc-100 text-zinc-600">sem uso</span>}</td>
                <td className="text-right"><button type="button" className="adm-btn-ghost adm-btn-sm text-red-600" disabled={busy} onClick={() => remove([f])} aria-label="Excluir"><Trash2 size={14} /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
        {!list.length && <p className="p-8 text-center text-sm text-zinc-500">Nenhum arquivo aqui.</p>}
      </div>
    </div>
  );
}
