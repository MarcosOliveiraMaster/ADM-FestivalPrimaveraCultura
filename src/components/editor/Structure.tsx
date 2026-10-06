"use client";
import { useState } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCenter,
  pointerWithin,
  useDroppable,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { restrictToVerticalAxis, restrictToWindowEdges } from "@dnd-kit/modifiers";
import { CSS } from "@dnd-kit/utilities";
import { ChevronDown, ChevronRight, EyeOff, GripVertical, Plus } from "lucide-react";
import type { Block, Section } from "@/shared/types";
import { blockLabel } from "@/shared/blocks";
import type { Selection } from "./Editor";

function blockSummary(b: Block) {
  switch (b.type) {
    case "heading": return b.props.text;
    case "richtext": return b.props.html.replace(/<[^>]+>/g, " ").trim();
    case "button": return b.props.label;
    case "image": return b.props.alt || (b.props.url ? "imagem" : "sem imagem");
    case "gallery": return `${b.props.images.length} imagens`;
    case "links": return `${b.props.items.length} links`;
    case "faq": return `${b.props.items.length} perguntas`;
    case "news": return `${b.props.items.length} notícias`;
    case "registration": return b.props.title ?? "";
    case "training": return b.props.title ?? "";
    case "logos": return `${b.props.items.length} logos`;
    case "form": return b.props.title ?? "";
    case "schedule": return b.props.title ?? "";
    default: return "";
  }
}

/**
 * Sensores pensados para mouse e toque:
 * - mouse: começa a arrastar depois de mover 4px (clique simples continua selecionando);
 * - toque: segurar ~180ms na alça inicia o arraste; deslizar direto continua rolando a tela.
 */
function useDragSensors() {
  return useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
}

function vibrate() {
  try {
    navigator.vibrate?.(12);
  } catch {}
}

const HANDLE = "flex shrink-0 cursor-grab touch-none items-center justify-center rounded text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 active:cursor-grabbing";

function BlockRow({ block, selected, onSelect, dragging, overlay }: { block: Block; selected?: boolean; onSelect?: () => void; dragging?: boolean; overlay?: boolean }) {
  return (
    <div className={`flex min-w-0 items-center gap-1 overflow-hidden rounded-md border text-xs ${overlay ? "border-brand-500 bg-white shadow-xl ring-2 ring-brand-500/30" : selected ? "border-brand-500 bg-brand-50" : "border-transparent bg-white hover:border-zinc-300"} ${dragging ? "opacity-40" : ""}`}>
      <span className={`${HANDLE} h-9 w-8 md:h-7 md:w-6`}>
        <GripVertical size={14} />
      </span>
      <button type="button" onClick={onSelect} className="min-w-0 flex-1 truncate py-2 pr-2 text-left md:py-1.5">
        <span className="font-medium text-zinc-800">{blockLabel(block.type)}</span>
        <span className="ml-1.5 text-zinc-500">{blockSummary(block).slice(0, 60)}</span>
      </button>
    </div>
  );
}

function SortableBlock({ block, selected, onSelect }: { block: Block; selected: boolean; onSelect: () => void }) {
  const { setNodeRef, transform, transition, isDragging, attributes, listeners, setActivatorNodeRef } = useSortable({ id: block.id, data: { type: "block" } });
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Translate.toString(transform), transition }} className="relative">
      <div className={`flex min-w-0 items-center gap-1 overflow-hidden rounded-md border text-xs ${selected ? "border-brand-500 bg-brand-50" : "border-transparent bg-white hover:border-zinc-300"} ${isDragging ? "opacity-40" : ""}`}>
        <button type="button" ref={setActivatorNodeRef} className={`${HANDLE} h-9 w-8 md:h-7 md:w-6`} aria-label="Arrastar bloco" {...attributes} {...listeners}>
          <GripVertical size={14} />
        </button>
        <button type="button" onClick={onSelect} className="min-w-0 flex-1 truncate py-2 pr-2 text-left md:py-1.5">
          <span className="font-medium text-zinc-800">{blockLabel(block.type)}</span>
          <span className="ml-1.5 text-zinc-500">{blockSummary(block).slice(0, 60)}</span>
        </button>
      </div>
    </div>
  );
}

/** Coluna que aceita blocos soltos (inclusive quando está vazia). */
function ColumnDrop({ id, children, highlight }: { id: string; children: React.ReactNode; highlight: boolean }) {
  const { setNodeRef, isOver } = useDroppable({ id, data: { type: "column" } });
  return (
    <div ref={setNodeRef} className={`flex min-h-10 min-w-0 flex-col gap-0.5 rounded-md p-0.5 transition ${isOver || highlight ? "bg-brand-50 ring-1 ring-brand-500/40" : ""}`}>
      {children}
    </div>
  );
}

const colId = (sid: string, ci: number) => `col|${sid}|${ci}`;

function SortableSection({ section, index, expanded, onToggle, selection, onSelect, onAddBlock, onMoveBlock }: {
  section: Section;
  index: number;
  expanded: boolean;
  onToggle: () => void;
  selection: Selection;
  onSelect: (s: Selection, fromStructure?: boolean) => void;
  onAddBlock: (col: number) => void;
  onMoveBlock: (blockId: string, toCol: number, toIndex: number) => void;
}) {
  const { setNodeRef, transform, transition, isDragging, attributes, listeners, setActivatorNodeRef } = useSortable({ id: section.id, data: { type: "section" } });
  const sensors = useDragSensors();
  const [active, setActive] = useState<Block | null>(null);
  const [overCol, setOverCol] = useState<number | null>(null);
  const sel = selection?.sid === section.id && selection.kind === "section";

  const findCol = (id: string): { col: number; index: number } | null => {
    if (id.startsWith("col|")) {
      const ci = Number(id.split("|")[2]);
      return { col: ci, index: section.columns[ci]?.length ?? 0 };
    }
    for (let ci = 0; ci < section.columns.length; ci++) {
      const i = section.columns[ci].findIndex((b) => b.id === id);
      if (i >= 0) return { col: ci, index: i };
    }
    return null;
  };

  // Prioriza o bloco sob o ponteiro; se não houver, a coluna; por fim o mais próximo.
  const collision: CollisionDetection = (args) => {
    const within = pointerWithin(args);
    const blocks = within.filter((c) => !String(c.id).startsWith("col|"));
    if (blocks.length) return blocks;
    if (within.length) return within;
    return closestCenter(args);
  };

  function onStart(e: DragStartEvent) {
    vibrate();
    const f = findCol(String(e.active.id));
    if (f) setActive(section.columns[f.col][f.index]);
  }
  function onEnd(e: DragEndEvent) {
    setActive(null);
    setOverCol(null);
    if (!e.over) return;
    const from = findCol(String(e.active.id));
    const to = findCol(String(e.over.id));
    if (!from || !to) return;
    if (from.col === to.col && from.index === to.index) return;
    onMoveBlock(String(e.active.id), to.col, to.index);
  }

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={`rounded-lg border bg-white ${sel ? "border-brand-500 ring-1 ring-brand-500" : "border-zinc-200"} ${isDragging ? "relative z-20 opacity-50" : ""}`}
    >
      <div className="flex items-center gap-1 px-1 py-1">
        <button type="button" ref={setActivatorNodeRef} className={`${HANDLE} h-10 w-9 md:h-8 md:w-7`} aria-label="Arrastar seção" {...attributes} {...listeners}>
          <GripVertical size={16} />
        </button>
        <button type="button" onClick={onToggle} className="flex h-9 w-7 items-center justify-center text-zinc-500 md:h-7 md:w-6" aria-label={expanded ? "Recolher" : "Expandir"}>
          {expanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
        </button>
        <button
          type="button"
          onClick={() => {
            onSelect({ kind: "section", sid: section.id }, true);
            if (!expanded) onToggle();
          }}
          className="min-w-0 flex-1 truncate py-1.5 text-left text-sm font-medium"
        >
          {section.name || `Seção ${index + 1}`}
        </button>
        {section.style.hideOn !== "none" && <EyeOff size={13} className="shrink-0 text-zinc-400" />}
        <span className="mr-1 flex h-4 w-8 shrink-0 gap-px">
          {section.layout.split("-").map((w, i) => (
            <span key={i} className="rounded-[2px] bg-zinc-300" style={{ flex: Number(w) }} />
          ))}
        </span>
      </div>
      {expanded && (
        <DndContext
          id={`blocos-${section.id}`}
          sensors={sensors}
          collisionDetection={collision}
          modifiers={[restrictToVerticalAxis, restrictToWindowEdges]}
          onDragStart={onStart}
          onDragOver={(e) => setOverCol(e.over ? findCol(String(e.over.id))?.col ?? null : null)}
          onDragEnd={onEnd}
          onDragCancel={() => {
            setActive(null);
            setOverCol(null);
          }}
        >
          <div className="grid grid-cols-1 gap-1.5 border-t border-zinc-100 bg-zinc-50 p-1.5">
            {section.columns.map((col, ci) => (
              <div key={ci} className="flex min-w-0 flex-col">
                {section.columns.length > 1 && <span className="px-1 pb-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-400">Coluna {ci + 1}</span>}
                <ColumnDrop id={colId(section.id, ci)} highlight={!!active && overCol === ci}>
                  <SortableContext items={col.map((b) => b.id)} strategy={verticalListSortingStrategy}>
                    {col.map((b) => (
                      <SortableBlock
                        key={b.id}
                        block={b}
                        selected={selection?.kind === "block" && selection.bid === b.id}
                        onSelect={() => onSelect({ kind: "block", sid: section.id, bid: b.id }, true)}
                      />
                    ))}
                  </SortableContext>
                  {col.length === 0 && <span className="px-2 py-2 text-[11px] text-zinc-400">{active ? "Solte aqui" : "Coluna vazia"}</span>}
                </ColumnDrop>
                <button type="button" onClick={() => onAddBlock(ci)} className="flex items-center gap-1 rounded-md px-2 py-2 text-xs text-brand-600 hover:bg-brand-50 md:py-1">
                  <Plus size={13} /> Bloco
                </button>
              </div>
            ))}
          </div>
          <DragOverlay dropAnimation={{ duration: 180, easing: "cubic-bezier(0.2, 0, 0, 1)" }}>{active ? <BlockRow block={active} overlay /> : null}</DragOverlay>
        </DndContext>
      )}
    </div>
  );
}

export function Structure({ sections, selection, expanded, onToggle, onSelect, onReorderSections, onAddSection, onAddBlock, onMoveBlock }: {
  sections: Section[];
  selection: Selection;
  expanded: Set<string>;
  onToggle: (id: string) => void;
  onSelect: (s: Selection, fromStructure?: boolean) => void;
  onReorderSections: (from: string, to: string) => void;
  onAddSection: (at: number) => void;
  onAddBlock: (sid: string, col: number) => void;
  onMoveBlock: (sid: string, blockId: string, toCol: number, toIndex: number) => void;
}) {
  const sensors = useDragSensors();
  const [active, setActive] = useState<Section | null>(null);
  return (
    <div className="flex flex-col gap-2 p-3">
      <DndContext
        id="secoes"
        sensors={sensors}
        collisionDetection={closestCenter}
        modifiers={[restrictToVerticalAxis, restrictToWindowEdges]}
        onDragStart={(e) => {
          vibrate();
          setActive(sections.find((s) => s.id === e.active.id) ?? null);
        }}
        onDragEnd={(e) => {
          setActive(null);
          if (e.over && e.active.id !== e.over.id) onReorderSections(String(e.active.id), String(e.over.id));
        }}
        onDragCancel={() => setActive(null)}
      >
        <SortableContext items={sections.map((s) => s.id)} strategy={verticalListSortingStrategy}>
          {sections.map((s, i) => (
            <SortableSection
              key={s.id}
              section={s}
              index={i}
              expanded={expanded.has(s.id) && active?.id !== s.id}
              onToggle={() => onToggle(s.id)}
              selection={selection}
              onSelect={onSelect}
              onAddBlock={(col) => onAddBlock(s.id, col)}
              onMoveBlock={(bid, col, idx) => onMoveBlock(s.id, bid, col, idx)}
            />
          ))}
        </SortableContext>
        <DragOverlay dropAnimation={{ duration: 180, easing: "cubic-bezier(0.2, 0, 0, 1)" }}>
          {active ? (
            <div className="flex items-center gap-2 rounded-lg border border-brand-500 bg-white px-3 py-2.5 text-sm font-medium shadow-xl ring-2 ring-brand-500/30">
              <GripVertical size={16} className="text-zinc-400" />
              {active.name || `Seção ${sections.findIndex((s) => s.id === active.id) + 1}`}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
      <button type="button" onClick={() => onAddSection(sections.length)} className="flex items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-zinc-300 py-3 text-sm font-medium text-zinc-600 hover:border-brand-500 hover:text-brand-600">
        <Plus size={16} /> Adicionar seção
      </button>
      <p className="px-1 text-[11px] leading-snug text-zinc-400">
        Arraste pela alça ⠿. No celular, segure a alça por um instante antes de arrastar. Blocos podem ir para outra coluna da mesma seção.
      </p>
    </div>
  );
}
