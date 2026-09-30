"use client";
import { DndContext, closestCenter, PointerSensor, KeyboardSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
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
    case "logos": return `${b.props.items.length} logos`;
    case "form": return b.props.title ?? "";
    case "schedule": return b.props.title ?? "";
    default: return "";
  }
}

function SortableBlock({ block, selected, onSelect }: { block: Block; selected: boolean; onSelect: () => void }) {
  const { setNodeRef, transform, transition, isDragging, attributes, listeners } = useSortable({ id: block.id });
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className={`group flex min-w-0 items-center gap-1 overflow-hidden rounded-md border text-xs ${selected ? "border-brand-500 bg-brand-50" : "border-transparent bg-white hover:border-zinc-300"} ${isDragging ? "z-10 shadow" : ""}`}>
      <button type="button" className="cursor-grab px-1 py-1.5 text-zinc-300 group-hover:text-zinc-500" aria-label="Arrastar bloco" {...attributes} {...listeners}>
        <GripVertical size={13} />
      </button>
      <button type="button" onClick={onSelect} className="min-w-0 flex-1 truncate py-1.5 pr-2 text-left">
        <span className="font-medium text-zinc-800">{blockLabel(block.type)}</span>
        <span className="ml-1.5 text-zinc-500">{blockSummary(block).slice(0, 40)}</span>
      </button>
    </div>
  );
}

function SortableSection({ section, index, expanded, onToggle, selection, onSelect, onAddBlock, onReorderBlocks }: {
  section: Section;
  index: number;
  expanded: boolean;
  onToggle: () => void;
  selection: Selection;
  onSelect: (s: Selection) => void;
  onAddBlock: (col: number) => void;
  onReorderBlocks: (col: number, from: string, to: string) => void;
}) {
  const { setNodeRef, transform, transition, isDragging, attributes, listeners } = useSortable({ id: section.id });
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));
  const sel = selection?.sid === section.id && selection.kind === "section";
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className={`rounded-lg border bg-white ${sel ? "border-brand-500 ring-1 ring-brand-500" : "border-zinc-200"} ${isDragging ? "z-20 shadow-lg" : ""}`}>
      <div className="flex items-center gap-1 px-1.5 py-1.5">
        <button type="button" className="cursor-grab p-1 text-zinc-400 hover:text-zinc-700" aria-label="Arrastar seção" {...attributes} {...listeners}>
          <GripVertical size={15} />
        </button>
        <button type="button" onClick={onToggle} className="p-0.5 text-zinc-500" aria-label="Expandir">
          {expanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
        </button>
        <button
          type="button"
          onClick={() => {
            onSelect({ kind: "section", sid: section.id });
            if (!expanded) onToggle();
          }}
          className="min-w-0 flex-1 truncate text-left text-sm font-medium"
        >
          {section.name || `Seção ${index + 1}`}
        </button>
        {section.style.hideOn !== "none" && <EyeOff size={13} className="text-zinc-400" />}
        <span className="flex h-4 w-8 gap-px">
          {section.layout.split("-").map((w, i) => (
            <span key={i} className="rounded-[2px] bg-zinc-300" style={{ flex: Number(w) }} />
          ))}
        </span>
      </div>
      {expanded && (
        <div className="grid grid-cols-1 gap-1.5 border-t border-zinc-100 bg-zinc-50 p-1.5">
          {section.columns.map((col, ci) => (
            <div key={ci} className="flex flex-col gap-0.5 rounded-md">
              {section.columns.length > 1 && <span className="px-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-400">Coluna {ci + 1}</span>}
              <DndContext
                id={`blocos-${section.id}-${ci}`}
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={(e: DragEndEvent) => e.over && e.active.id !== e.over.id && onReorderBlocks(ci, String(e.active.id), String(e.over.id))}
              >
                <SortableContext items={col.map((b) => b.id)} strategy={verticalListSortingStrategy}>
                  {col.map((b) => (
                    <SortableBlock key={b.id} block={b} selected={selection?.kind === "block" && selection.bid === b.id} onSelect={() => onSelect({ kind: "block", sid: section.id, bid: b.id })} />
                  ))}
                </SortableContext>
              </DndContext>
              <button type="button" onClick={() => onAddBlock(ci)} className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-brand-600 hover:bg-brand-50">
                <Plus size={13} /> Bloco
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function Structure({ sections, selection, expanded, onToggle, onSelect, onReorderSections, onAddSection, onAddBlock, onReorderBlocks }: {
  sections: Section[];
  selection: Selection;
  expanded: Set<string>;
  onToggle: (id: string) => void;
  onSelect: (s: Selection) => void;
  onReorderSections: (from: string, to: string) => void;
  onAddSection: (at: number) => void;
  onAddBlock: (sid: string, col: number) => void;
  onReorderBlocks: (sid: string, col: number, from: string, to: string) => void;
}) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  return (
    <div className="flex flex-col gap-2 p-3">
      <DndContext id="secoes" sensors={sensors} collisionDetection={closestCenter} onDragEnd={(e) => e.over && e.active.id !== e.over.id && onReorderSections(String(e.active.id), String(e.over.id))}>
        <SortableContext items={sections.map((s) => s.id)} strategy={verticalListSortingStrategy}>
          {sections.map((s, i) => (
            <SortableSection
              key={s.id}
              section={s}
              index={i}
              expanded={expanded.has(s.id)}
              onToggle={() => onToggle(s.id)}
              selection={selection}
              onSelect={onSelect}
              onAddBlock={(col) => onAddBlock(s.id, col)}
              onReorderBlocks={(col, from, to) => onReorderBlocks(s.id, col, from, to)}
            />
          ))}
        </SortableContext>
      </DndContext>
      <button type="button" onClick={() => onAddSection(sections.length)} className="flex items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-zinc-300 py-3 text-sm font-medium text-zinc-600 hover:border-brand-500 hover:text-brand-600">
        <Plus size={16} /> Adicionar seção
      </button>
    </div>
  );
}
