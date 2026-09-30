"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { DndContext, closestCenter, PointerSensor, KeyboardSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Copy, ExternalLink, EyeOff, GripVertical, Home, Pencil, Plus, Send, Trash2 } from "lucide-react";
import { Modal } from "@/components/Modal";
import { StatusBadge } from "@/components/StatusBadge";
import { PAGE_TEMPLATES } from "@/shared/blocks";
import { formatDate, formatDateTime } from "@/shared/format";
import type { PageKind, PageStatus } from "@/shared/types";
import { createPage, deletePage, duplicatePage, reorderPages, setStatus } from "./actions";

export interface PageRow {
  id: string;
  kind: PageKind;
  slug: string;
  title: string;
  status: PageStatus;
  publish_at: string | null;
  category: string | null;
  starts_at: string | null;
  show_in_nav: boolean;
  updated_at: string;
  editor: string | null;
  pending: boolean;
}

export function publicPath(p: { kind: PageKind; slug: string }) {
  return p.kind === "home" ? "/" : `/eventos/${p.slug}`;
}

function Row({ p, isAdmin, siteUrl, onAction, busy }: { p: PageRow; isAdmin: boolean; siteUrl: string; onAction: (fn: () => Promise<unknown>) => void; busy: boolean }) {
  const { setNodeRef, transform, transition, isDragging, attributes, listeners } = useSortable({ id: p.id, disabled: p.kind === "home" });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const live = p.status === "published" || (p.status === "scheduled" && p.publish_at && new Date(p.publish_at) <= new Date());
  return (
    <tr ref={setNodeRef} style={style} className={isDragging ? "relative z-10 bg-white shadow-lg" : ""}>
      <td className="w-8 !pr-0">
        {p.kind !== "home" ? (
          <button type="button" className="cursor-grab text-zinc-400 hover:text-zinc-700" aria-label="Arrastar" {...attributes} {...listeners}>
            <GripVertical size={16} />
          </button>
        ) : (
          <Home size={16} className="text-brand-500" />
        )}
      </td>
      <td>
        <a href={`/paginas/${p.id}`} className="font-medium text-zinc-900 hover:text-brand-600">{p.title}</a>
        <div className="text-xs text-zinc-500">
          {publicPath(p)}
          {p.kind === "evento" && !p.show_in_nav && " · fora do menu"}
          {p.kind === "institucional" && " · institucional"}
        </div>
      </td>
      <td>
        <div className="flex flex-col items-start gap-1">
          <StatusBadge status={p.status} publishAt={p.publish_at} />
          {p.pending && live && <span className="text-xs text-amber-700">alterações não publicadas</span>}
        </div>
      </td>
      <td className="hidden text-zinc-600 md:table-cell">{p.kind === "home" ? "—" : formatDate(p.starts_at, { day: "2-digit", month: "short", year: "numeric" }) ?? "A definir"}</td>
      <td className="hidden text-xs text-zinc-500 lg:table-cell">
        {formatDateTime(p.updated_at)}
        {p.editor && <div>por {p.editor}</div>}
      </td>
      <td>
        <div className="flex justify-end gap-1">
          <a href={`/paginas/${p.id}`} className="adm-btn-secondary adm-btn-sm"><Pencil size={14} /> Editar</a>
          {live ? (
            <a href={`${siteUrl}${publicPath(p)}`} target="_blank" rel="noopener noreferrer" className="adm-btn-ghost adm-btn-sm" title="Ver no site"><ExternalLink size={14} /></a>
          ) : null}
          {p.kind !== "home" && (
            <>
              {live ? (
                <button type="button" disabled={busy} className="adm-btn-ghost adm-btn-sm" title="Despublicar" onClick={() => onAction(() => setStatus(p.id, "draft"))}><EyeOff size={14} /></button>
              ) : (
                <button type="button" disabled={busy} className="adm-btn-ghost adm-btn-sm" title="Publicar como está" onClick={() => onAction(() => setStatus(p.id, "published"))}><Send size={14} /></button>
              )}
              <button type="button" disabled={busy} className="adm-btn-ghost adm-btn-sm" title="Duplicar" onClick={() => onAction(() => duplicatePage(p.id))}><Copy size={14} /></button>
              {isAdmin && (
                <button
                  type="button"
                  disabled={busy}
                  className="adm-btn-ghost adm-btn-sm text-red-600"
                  title="Excluir"
                  onClick={() => confirm(`Excluir “${p.title}”? Essa ação não pode ser desfeita.`) && onAction(() => deletePage(p.id))}
                >
                  <Trash2 size={14} />
                </button>
              )}
            </>
          )}
        </div>
      </td>
    </tr>
  );
}

export function PagesList({ pages, isAdmin, siteUrl }: { pages: PageRow[]; isAdmin: boolean; siteUrl: string }) {
  const router = useRouter();
  const [items, setItems] = useState(pages);
  const [synced, setSynced] = useState(pages);
  if (synced !== pages) {
    setSynced(pages);
    setItems(pages);
  }
  const [busy, start] = useTransition();
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"todas" | "evento" | "institucional">("todas");
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  const onAction = (fn: () => Promise<unknown>) =>
    start(async () => {
      const r = (await fn()) as { ok: boolean; error?: string; data?: string } | undefined;
      if (r && !r.ok) setError(r.error ?? "Erro");
      router.refresh();
    });

  function onDragEnd(e: DragEndEvent) {
    if (!e.over || e.active.id === e.over.id) return;
    const from = items.findIndex((i) => i.id === e.active.id);
    const to = items.findIndex((i) => i.id === e.over!.id);
    if (items[to]?.kind === "home") return;
    const next = arrayMove(items, from, to);
    setItems(next);
    start(async () => {
      await reorderPages(next.filter((p) => p.kind !== "home").map((p) => p.id));
    });
  }

  const visible = items.filter((p) => filter === "todas" || p.kind === filter || p.kind === "home");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 rounded-lg bg-zinc-100 p-1 text-sm">
          {(["todas", "evento", "institucional"] as const).map((f) => (
            <button type="button" key={f} onClick={() => setFilter(f)} className={`rounded-md px-3 py-1 ${filter === f ? "bg-white font-medium shadow-sm" : "text-zinc-600"}`}>
              {f === "todas" ? "Todas" : f === "evento" ? "Eventos" : "Institucionais"}
            </button>
          ))}
        </div>
        <button type="button" className="adm-btn-primary" onClick={() => setCreating(true)}><Plus size={16} /> Nova página</button>
      </div>
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <div className="adm-card overflow-x-auto">
        <DndContext id="lista-paginas" sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <table className="adm-table">
            <thead>
              <tr>
                <th />
                <th>Página</th>
                <th>Status</th>
                <th className="hidden md:table-cell">Data do evento</th>
                <th className="hidden lg:table-cell">Última edição</th>
                <th />
              </tr>
            </thead>
            <SortableContext items={visible.map((p) => p.id)} strategy={verticalListSortingStrategy}>
              <tbody>
                {visible.map((p) => (
                  <Row key={p.id} p={p} isAdmin={isAdmin} siteUrl={siteUrl} onAction={onAction} busy={busy} />
                ))}
              </tbody>
            </SortableContext>
          </table>
        </DndContext>
        {visible.length <= 1 && <p className="p-8 text-center text-sm text-zinc-500">Nenhuma página de evento ainda. Clique em “Nova página” para começar.</p>}
      </div>
      <p className="text-xs text-zinc-500">Arraste pelas alças ⠿ para definir a ordem em que os eventos aparecem no site.</p>
      <CreateModal open={creating} onClose={() => setCreating(false)} />
    </div>
  );
}

function CreateModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [template, setTemplate] = useState("show");
  const [kind, setKind] = useState<PageKind>("evento");
  const [error, setError] = useState<string | null>(null);
  const [busy, start] = useTransition();
  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const title = String(new FormData(e.currentTarget).get("title") ?? "");
    start(async () => {
      const r = await createPage({ title, kind, template });
      if (!r.ok) return setError(r.error);
      router.push(`/paginas/${r.data}`);
    });
  }
  return (
    <Modal open={open} onClose={onClose} title="Nova página" wide>
      <form onSubmit={submit} className="flex flex-col gap-5">
        <label className="adm-label">Título<input name="title" required autoFocus className="adm-input" placeholder="Ex.: Show de abertura" /></label>
        <div className="adm-label">
          Tipo
          <div className="grid grid-cols-2 gap-2">
            {([["evento", "Evento", "Aparece em “Eventos” no menu e na programação"], ["institucional", "Institucional", "Página avulsa (ex.: Regulamento, Imprensa)"]] as const).map(([v, l, d]) => (
              <button type="button" key={v} onClick={() => setKind(v)} className={`rounded-lg border p-3 text-left ${kind === v ? "border-brand-500 bg-brand-50 ring-2 ring-brand-500/20" : "border-zinc-200"}`}>
                <div className="font-medium">{l}</div>
                <div className="text-xs font-normal text-zinc-500">{d}</div>
              </button>
            ))}
          </div>
        </div>
        <div className="adm-label">
          Modelo
          <div className="grid gap-2 sm:grid-cols-2">
            {PAGE_TEMPLATES.map((t) => (
              <button type="button" key={t.id} onClick={() => setTemplate(t.id)} className={`rounded-lg border p-3 text-left ${template === t.id ? "border-brand-500 bg-brand-50 ring-2 ring-brand-500/20" : "border-zinc-200"}`}>
                <div className="font-medium">{t.label}</div>
                <div className="text-xs font-normal text-zinc-500">{t.description}</div>
              </button>
            ))}
          </div>
        </div>
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" className="adm-btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="adm-btn-primary" disabled={busy}>{busy ? "Criando…" : "Criar e editar"}</button>
        </div>
      </form>
    </Modal>
  );
}
