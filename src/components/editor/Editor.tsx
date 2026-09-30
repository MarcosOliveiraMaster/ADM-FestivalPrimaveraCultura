"use client";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CalendarClock, Check, ChevronDown, CloudOff, Eye, ExternalLink, History, ListTree, Loader2, Monitor, Redo2, Settings2, SlidersHorizontal, Smartphone, Tablet, Undo2 } from "lucide-react";
import type { Block, BlockType, EventSummary, PageContent, PageKind, PageStatus, Section, SiteSettings } from "@/shared/types";
import { BLOCK_LIBRARY, layoutCols, LAYOUTS, newBlock, newSection, relayout, uid } from "@/shared/blocks";
import { googleFontsHref, themeCss } from "@/shared/theme";
import { currentTime, formatDateTime } from "@/shared/format";
import { SectionView } from "@/shared/render/PageRenderer";
import { BlockView } from "@/shared/render/BlockView";
import { BrandIcon } from "@/shared/render/BrandIcon";
import { StatusBadge } from "../StatusBadge";
import { Modal } from "../Modal";
import { Structure } from "./Structure";
import { BlockInspector, SectionInspector } from "./Inspector";
import { SECTION_PRESETS } from "./presets";
import { PageSettingsModal } from "./PageSettingsModal";
import { getVersion, listVersions, publishPage, saveDraft, type PageMeta } from "@/app/(painel)/paginas/actions";
import { DateTime } from "./fields";

export type Selection = { kind: "section"; sid: string } | { kind: "block"; sid: string; bid: string } | null;

export interface EditorPage extends PageMeta {
  id: string;
  status: PageStatus;
  publish_at: string | null;
  published_at: string | null;
  kind: PageKind;
}

const DEVICES = { desktop: { w: "100%", icon: Monitor, label: "Computador" }, tablet: { w: "820px", icon: Tablet, label: "Tablet" }, mobile: { w: "390px", icon: Smartphone, label: "Celular" } } as const;

function cloneSection(s: Section): Section {
  return { ...structuredClone(s), id: uid(), columns: s.columns.map((c) => c.map((b) => ({ ...structuredClone(b), id: uid() }))) };
}

export function Editor({ page: initialPage, initialContent, publishedJson, settings, events, siteUrl }: {
  page: EditorPage;
  initialContent: PageContent;
  publishedJson: string;
  settings: SiteSettings;
  events: EventSummary[];
  siteUrl: string;
}) {
  const router = useRouter();
  const [page, setPage] = useState(initialPage);
  const [content, setContentRaw] = useState(initialContent);
  const [past, setPast] = useState<PageContent[]>([]);
  const [future, setFuture] = useState<PageContent[]>([]);
  const lastCommit = useRef<{ key: string; t: number }>({ key: "", t: 0 });
  const [selection, setSelection] = useState<Selection>(null);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(initialContent.sections.slice(0, 1).map((s) => s.id)));
  const [device, setDevice] = useState<keyof typeof DEVICES>("desktop");
  const [mobileTab, setMobileTab] = useState<"structure" | "preview" | "inspector">("preview");
  const isMobile = () => typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches;
  const [save, setSave] = useState<"saved" | "dirty" | "saving" | "error">("saved");
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [publishedSnapshot, setPublishedSnapshot] = useState(publishedJson);
  const [addSectionAt, setAddSectionAt] = useState<number | null>(null);
  const [addBlockTo, setAddBlockTo] = useState<{ sid: string; col: number } | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [versionsOpen, setVersionsOpen] = useState(false);
  const [publishMenu, setPublishMenu] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [notice, setNotice] = useState<{ type: "ok" | "error"; text: string } | null>(null);
  const [publishing, startPublish] = useTransition();

  /** Aplica uma mudança guardando histórico (mudanças seguidas no mesmo campo são agrupadas). */
  const update = useCallback((fn: (c: PageContent) => PageContent, key = "") => {
    setContentRaw((cur) => {
      const next = fn(cur);
      if (next === cur) return cur;
      const now = Date.now();
      const group = key && lastCommit.current.key === key && now - lastCommit.current.t < 800;
      lastCommit.current = { key, t: now };
      if (!group) {
        setPast((p) => [...p.slice(-60), cur]);
        setFuture([]);
      }
      return next;
    });
    setSave("dirty");
  }, []);

  const undo = useCallback(() => {
    setPast((p) => {
      if (!p.length) return p;
      const prev = p[p.length - 1];
      setContentRaw((cur) => {
        setFuture((f) => [cur, ...f]);
        return prev;
      });
      setSave("dirty");
      return p.slice(0, -1);
    });
  }, []);
  const redo = useCallback(() => {
    setFuture((f) => {
      if (!f.length) return f;
      const [next, ...rest] = f;
      setContentRaw((cur) => {
        setPast((p) => [...p, cur]);
        return next;
      });
      setSave("dirty");
      return rest;
    });
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (el.closest("input, textarea, [contenteditable=true]")) return;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo]);

  // Salvamento automático do rascunho
  useEffect(() => {
    if (save !== "dirty") return;
    const t = setTimeout(async () => {
      setSave("saving");
      const r = await saveDraft(page.id, content);
      if (r.ok) {
        setSave((s) => (s === "saving" ? "saved" : s));
        setSavedAt(r.data ?? null);
      } else setSave("error");
    }, 1200);
    return () => clearTimeout(t);
  }, [content, save, page.id]);

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (save === "dirty" || save === "saving") e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [save]);

  const unpublished = useMemo(() => JSON.stringify(content) !== publishedSnapshot, [content, publishedSnapshot]);

  // ---------- operações ----------
  const mapSection = (sid: string, fn: (s: Section) => Section, key?: string) => update((c) => ({ sections: c.sections.map((s) => (s.id === sid ? fn(s) : s)) }), key);
  const mapBlock = (bid: string, fn: (b: Block) => Block, key?: string) =>
    update((c) => ({ sections: c.sections.map((s) => ({ ...s, columns: s.columns.map((col) => col.map((b) => (b.id === bid ? fn(b) : b))) })) }), key);

  const findBlock = (bid: string) => {
    for (const s of content.sections) for (let ci = 0; ci < s.columns.length; ci++) {
      const i = s.columns[ci].findIndex((b) => b.id === bid);
      if (i >= 0) return { section: s, col: ci, index: i, block: s.columns[ci][i] };
    }
    return null;
  };

  const addSection = (at: number, section: Section) => {
    update((c) => {
      const sections = [...c.sections];
      sections.splice(at, 0, section);
      return { sections };
    });
    setExpanded((e) => new Set(e).add(section.id));
    setSelection({ kind: "section", sid: section.id });
    setTimeout(() => document.querySelector(`[data-editor-section="${section.id}"]`)?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  };

  const addBlock = (sid: string, col: number, type: BlockType) => {
    const block = newBlock(type) as Block;
    mapSection(sid, (s) => ({ ...s, columns: s.columns.map((c, i) => (i === col ? [...c, block] : c)) }));
    setSelection({ kind: "block", sid, bid: block.id });
  };

  const moveSection = (sid: string, d: -1 | 1) =>
    update((c) => {
      const i = c.sections.findIndex((s) => s.id === sid);
      const j = i + d;
      if (i < 0 || j < 0 || j >= c.sections.length) return c;
      const sections = [...c.sections];
      [sections[i], sections[j]] = [sections[j], sections[i]];
      return { sections };
    });

  const reorderSections = (from: string, to: string) =>
    update((c) => {
      const a = c.sections.findIndex((s) => s.id === from);
      const b = c.sections.findIndex((s) => s.id === to);
      const sections = [...c.sections];
      const [m] = sections.splice(a, 1);
      sections.splice(b, 0, m);
      return { sections };
    });

  /** Move um bloco para outra posição (inclusive outra coluna) dentro da mesma seção. */
  const moveBlockTo = (sid: string, bid: string, toCol: number, toIndex: number) =>
    mapSection(sid, (s) => {
      let fromCol = -1;
      let fromIndex = -1;
      s.columns.forEach((c, ci) => {
        const i = c.findIndex((b) => b.id === bid);
        if (i >= 0) {
          fromCol = ci;
          fromIndex = i;
        }
      });
      if (fromCol < 0 || !s.columns[toCol]) return s;
      const columns = s.columns.map((c) => [...c]);
      const [moved] = columns[fromCol].splice(fromIndex, 1);
      const target = Math.min(toIndex, columns[toCol].length);
      columns[toCol].splice(target, 0, moved);
      return { ...s, columns };
    });

  const moveBlock = (bid: string, d: -1 | 1) => {
    const f = findBlock(bid);
    if (!f) return;
    mapSection(f.section.id, (s) => {
      const list = [...s.columns[f.col]];
      const j = f.index + d;
      if (j < 0 || j >= list.length) return s;
      [list[f.index], list[j]] = [list[j], list[f.index]];
      return { ...s, columns: s.columns.map((c, i) => (i === f.col ? list : c)) };
    });
  };

  const moveBlockToColumn = (bid: string, col: number) => {
    const f = findBlock(bid);
    if (!f || f.col === col) return;
    mapSection(f.section.id, (s) => ({ ...s, columns: s.columns.map((c, i) => (i === f.col ? c.filter((b) => b.id !== bid) : i === col ? [...c, f.block] : c)) }));
  };

  const duplicateBlock = (bid: string) => {
    const f = findBlock(bid);
    if (!f) return;
    const copy = { ...structuredClone(f.block), id: uid() } as Block;
    mapSection(f.section.id, (s) => ({ ...s, columns: s.columns.map((c, i) => (i === f.col ? [...c.slice(0, f.index + 1), copy, ...c.slice(f.index + 1)] : c)) }));
    setSelection({ kind: "block", sid: f.section.id, bid: copy.id });
  };

  const deleteBlock = (bid: string) => {
    const f = findBlock(bid);
    if (!f) return;
    mapSection(f.section.id, (s) => ({ ...s, columns: s.columns.map((c) => c.filter((b) => b.id !== bid)) }));
    setSelection({ kind: "section", sid: f.section.id });
  };

  // ---------- publicação ----------
  function doPublish(at?: string | null) {
    startPublish(async () => {
      if (save !== "saved") await saveDraft(page.id, content);
      const r = await publishPage(page.id, content, at);
      if (!r.ok) return setNotice({ type: "error", text: r.error });
      setPublishedSnapshot(JSON.stringify(content));
      const scheduled = at && new Date(at).getTime() > Date.now();
      setPage((p) => ({ ...p, status: scheduled ? "scheduled" : "published", publish_at: scheduled ? at! : null, published_at: new Date().toISOString() }));
      setSave("saved");
      setNotice({ type: "ok", text: scheduled ? `Publicação agendada para ${formatDateTime(at)}.` : "Página publicada! Já está no ar." });
      setScheduleOpen(false);
      router.refresh();
    });
  }

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 5000);
    return () => clearTimeout(t);
  }, [notice]);

  // ---------- pré-visualização ----------
  const ctx = useMemo(
    () => ({ mode: "preview" as const, pageId: page.id, settings, events, now: 0, page: { title: page.title, starts_at: page.starts_at, ends_at: page.ends_at, location: page.location } }),
    [page.id, page.title, page.starts_at, page.ends_at, page.location, settings, events],
  );
  const [now] = useState(() => Date.now());
  const previewCtx = useMemo(() => ({ ...ctx, now }), [ctx, now]);
  const fonts = googleFontsHref(settings.theme);

  const selSection = selection ? content.sections.find((s) => s.id === selection.sid) : null;
  const selBlock = selection?.kind === "block" ? findBlock(selection.bid) : null;
  const publicUrl = `${siteUrl}${page.kind === "home" ? "/" : `/eventos/${page.slug}`}`;
  const isLive = page.status === "published" || (page.status === "scheduled" && !!page.publish_at && new Date(page.publish_at).getTime() <= now);

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-zinc-100">
      {fonts && <link rel="stylesheet" href={fonts} />}
      <style dangerouslySetInnerHTML={{ __html: themeCss(settings.theme, ".fp-scope") }} />

      {/* Barra superior */}
      <header className="flex h-14 shrink-0 items-center gap-1 border-b border-zinc-200 bg-white px-2 sm:gap-2 sm:px-3">
        <a href="/paginas" className="adm-btn-ghost adm-btn-sm" title="Voltar"><ArrowLeft size={16} /></a>
        <div className="min-w-0 flex-1 md:flex-none">
          <div className="flex min-w-0 items-center gap-2">
            <span className="min-w-0 truncate font-semibold md:max-w-[40vw]">{page.title}</span>
            <span className="shrink-0 max-sm:hidden"><StatusBadge status={page.status} publishAt={page.publish_at} /></span>
          </div>
          <div className="flex min-w-0 items-center gap-1 truncate whitespace-nowrap text-xs text-zinc-500">
            {save === "saving" ? (<><Loader2 size={12} className="animate-spin" /> Salvando rascunho…</>) : save === "dirty" ? "Alterações pendentes…" : save === "error" ? (<span className="flex items-center gap-1 text-red-600"><CloudOff size={12} /> Erro ao salvar — verifique a conexão</span>) : (<><Check size={12} className="shrink-0" /> Rascunho salvo {savedAt ? formatDateTime(savedAt)?.split(", ").pop() : ""}</>)}
            {unpublished && isLive && <span className="ml-2 text-amber-700 max-sm:hidden">· alterações ainda não publicadas</span>}
          </div>
        </div>
        <div className="mx-auto hidden items-center gap-0.5 rounded-lg bg-zinc-100 p-0.5 md:flex">
          {(Object.keys(DEVICES) as (keyof typeof DEVICES)[]).map((d) => {
            const Icon = DEVICES[d].icon;
            return (
              <button type="button" key={d} title={DEVICES[d].label} onClick={() => setDevice(d)} className={`rounded-md p-1.5 ${device === d ? "bg-white shadow-sm" : "text-zinc-500"}`}>
                <Icon size={16} />
              </button>
            );
          })}
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-0.5 sm:gap-1">
          <button type="button" className="adm-btn-ghost adm-btn-sm" onClick={undo} disabled={!past.length} title="Desfazer (Ctrl+Z)"><Undo2 size={16} /></button>
          <button type="button" className="adm-btn-ghost adm-btn-sm" onClick={redo} disabled={!future.length} title="Refazer (Ctrl+Shift+Z)"><Redo2 size={16} /></button>
          <button type="button" className="adm-btn-ghost adm-btn-sm max-sm:hidden" onClick={() => setVersionsOpen(true)} title="Histórico de versões"><History size={16} /></button>
          <button type="button" className="adm-btn-secondary adm-btn-sm" onClick={() => setSettingsOpen(true)}><Settings2 size={15} /> <span className="hidden lg:inline">Configurações da página</span></button>
          {isLive && <a href={publicUrl} target="_blank" rel="noopener noreferrer" className="adm-btn-ghost adm-btn-sm max-sm:hidden" title="Ver no site"><ExternalLink size={16} /></a>}
          <div className="relative flex">
            <button type="button" className="adm-btn-primary rounded-r-none max-sm:px-2.5" disabled={publishing} onClick={() => doPublish(null)}>
              {publishing ? <Loader2 size={15} className="animate-spin" /> : null} <span className="max-sm:hidden">{isLive ? "Publicar alterações" : "Publicar"}</span><span className="sm:hidden">Publicar</span>
            </button>
            <button type="button" className="adm-btn-primary rounded-l-none border-l border-white/25 px-2" onClick={() => setPublishMenu((o) => !o)} aria-label="Mais opções"><ChevronDown size={15} /></button>
            {publishMenu && (
              <div className="absolute right-0 top-full z-50 mt-1 w-56 overflow-hidden rounded-lg border border-zinc-200 bg-white py-1 text-sm shadow-lg" onMouseLeave={() => setPublishMenu(false)}>
                <button type="button" disabled={isLive} className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-zinc-50 disabled:opacity-50" onClick={() => { setPublishMenu(false); setScheduleOpen(true); }}>
                  <CalendarClock size={15} /> Agendar publicação
                </button>
                {isLive && <p className="px-3 pb-2 text-xs text-zinc-500">Disponível para páginas que ainda não estão no ar.</p>}
              </div>
            )}
          </div>
        </div>
      </header>

      {notice && (
        <div className={`absolute left-1/2 top-16 z-[300] -translate-x-1/2 rounded-lg px-4 py-2 text-sm shadow-lg ${notice.type === "ok" ? "bg-brand-600 text-white" : "bg-red-600 text-white"}`}>{notice.text}</div>
      )}

      <div className="flex min-h-0 flex-1">
        {/* Estrutura */}
        <aside className={`${mobileTab === "structure" ? "flex w-full" : "hidden"} shrink-0 flex-col overflow-y-auto overflow-x-hidden border-r border-zinc-200 bg-zinc-50 md:flex md:w-72`}>
          <div className="px-4 pt-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">Estrutura da página</div>
          <Structure
            sections={content.sections}
            selection={selection}
            expanded={expanded}
            onToggle={(id) => setExpanded((e) => { const n = new Set(e); if (n.has(id)) n.delete(id); else n.add(id); return n; })}
            onSelect={(sel, fromStructure) => {
              setSelection(sel);
              if (fromStructure && isMobile()) setMobileTab("inspector");
            }}
            onReorderSections={reorderSections}
            onAddSection={(at) => setAddSectionAt(at)}
            onAddBlock={(sid, col) => setAddBlockTo({ sid, col })}
            onMoveBlock={moveBlockTo}
          />
        </aside>

        {/* Pré-visualização */}
        <main
          className={`min-w-0 flex-1 overflow-y-auto p-2 md:p-4 ${mobileTab === "preview" ? "" : "max-md:hidden"}`}
          onClick={(e) => { if (e.target === e.currentTarget) setSelection(null); }}
        >
          <div
            className="fp-scope mx-auto overflow-hidden rounded-lg bg-white shadow-xl ring-1 ring-black/5 transition-[max-width] duration-300"
            style={{ maxWidth: DEVICES[device].w }}
            onClickCapture={(e) => {
              const t = e.target as HTMLElement;
              if (t.closest("a, button[type=submit], summary")) e.preventDefault();
            }}
            onSubmitCapture={(e) => e.preventDefault()}
          >
            <div className="@container fp-page min-h-[60vh]">
              {content.sections.length === 0 && (
                <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 p-10 text-center text-zinc-500">
                  <BrandIcon url={settings.brand.icon_url} className="h-12" />
                  <p>Esta página está vazia.</p>
                  <button type="button" className="adm-btn-primary" onClick={() => setAddSectionAt(0)}>Adicionar a primeira seção</button>
                </div>
              )}
              {content.sections.map((s, i) => {
                const selected = selection?.sid === s.id && selection.kind === "section";
                return (
                  <div
                    key={s.id}
                    data-editor-section={s.id}
                    className={`group/sec relative ${selected ? "outline outline-2 -outline-offset-2 outline-brand-500" : "hover:outline hover:outline-1 hover:-outline-offset-1 hover:outline-brand-500/50"}`}
                    onClick={() => {
                      setSelection({ kind: "section", sid: s.id });
                      setExpanded((e) => new Set(e).add(s.id));
                    }}
                  >
                    <span className={`pointer-events-none absolute left-2 top-2 z-10 rounded bg-brand-500 px-1.5 py-0.5 text-[10px] font-semibold text-white ${selected ? "" : "opacity-0 group-hover/sec:opacity-100"}`}>
                      {s.name || `Seção ${i + 1}`}
                    </span>
                    <SectionView
                      section={s}
                      ctx={previewCtx}
                      renderBlock={(block) => {
                        const sel = selection?.kind === "block" && selection.bid === block.id;
                        return (
                          <div
                            key={block.id}
                            className={`relative rounded-sm ${sel ? "outline outline-2 outline-offset-4 outline-sky-500" : "hover:outline hover:outline-1 hover:outline-offset-4 hover:outline-sky-400/70"}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelection({ kind: "block", sid: s.id, bid: block.id });
                              setExpanded((ex) => new Set(ex).add(s.id));
                            }}
                          >
                            <BlockView block={block} ctx={previewCtx} />
                          </div>
                        );
                      }}
                    />
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setAddSectionAt(i + 1); }}
                      className="absolute -bottom-3 left-1/2 z-20 hidden -translate-x-1/2 rounded-full bg-brand-500 px-3 py-1 text-xs font-medium text-white shadow group-hover/sec:block"
                    >
                      + Seção
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </main>

        {/* Inspetor */}
        <aside
          className={`w-80 shrink-0 overflow-y-auto border-l border-zinc-200 bg-white md:max-lg:absolute md:max-lg:bottom-0 md:max-lg:right-0 md:max-lg:top-14 md:max-lg:z-40 md:max-lg:shadow-xl ${selection ? "" : "md:max-lg:hidden"} ${mobileTab === "inspector" ? "max-md:w-full" : "max-md:hidden"}`}
        >
          {selBlock && selSection ? (
            <BlockInspector
              key={selBlock.block.id}
              block={selBlock.block}
              columns={layoutCols(selSection.layout)}
              column={selBlock.col}
              onChange={(b) => mapBlock(b.id, () => b, `b:${b.id}`)}
              onMove={(d) => moveBlock(selBlock.block.id, d)}
              onMoveColumn={(c) => moveBlockToColumn(selBlock.block.id, c)}
              onDuplicate={() => duplicateBlock(selBlock.block.id)}
              onDelete={() => deleteBlock(selBlock.block.id)}
            />
          ) : selSection ? (
            <SectionInspector
              key={selSection.id}
              section={selSection}
              onChange={(s) => mapSection(s.id, () => s, `s:${s.id}`)}
              onLayout={(l) => mapSection(selSection.id, (s) => relayout(s, l))}
              onMove={(d) => moveSection(selSection.id, d)}
              onDuplicate={() => {
                const i = content.sections.findIndex((s) => s.id === selSection.id);
                addSection(i + 1, cloneSection(selSection));
              }}
              onDelete={() => {
                if (!confirm("Excluir esta seção e todos os blocos dentro dela?")) return;
                update((c) => ({ sections: c.sections.filter((s) => s.id !== selSection.id) }));
                setSelection(null);
              }}
            />
          ) : (
            <div className="flex flex-col gap-4 p-5 text-sm text-zinc-600">
              <div className="text-base font-semibold text-zinc-900">Como editar</div>
              <p>• Clique em qualquer parte da página para editar aquela seção ou bloco.</p>
              <p>• Use a coluna da esquerda para reorganizar arrastando ⠿.</p>
              <p>• Passe o mouse sobre uma seção e clique em <b>+ Seção</b> para inserir outra abaixo.</p>
              <p>• As mudanças são salvas automaticamente como rascunho. O público só vê depois de <b>Publicar</b>.</p>
              <button type="button" className="adm-btn-secondary" onClick={() => setAddSectionAt(content.sections.length)}>+ Adicionar seção no final</button>
            </div>
          )}
        </aside>
      </div>

      {/* Abas do celular */}
      <nav className="grid h-14 shrink-0 grid-cols-3 border-t border-zinc-200 bg-white md:hidden">
        {([
          ["structure", "Estrutura", ListTree],
          ["preview", "Prévia", Eye],
          ["inspector", "Editar", SlidersHorizontal],
        ] as const).map(([k, label, Icon]) => (
          <button key={k} type="button" onClick={() => setMobileTab(k)} className={`relative flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium ${mobileTab === k ? "text-brand-600" : "text-zinc-500"}`}>
            <Icon size={19} />
            {label}
            {k === "inspector" && selection && mobileTab !== "inspector" && <span className="absolute right-[30%] top-2 h-2 w-2 rounded-full bg-brand-500" />}
          </button>
        ))}
      </nav>

      {/* Modais */}
      <Modal open={addSectionAt !== null} onClose={() => setAddSectionAt(null)} title="Adicionar seção" wide>
        <div className="flex flex-col gap-5">
          <div>
            <div className="mb-2 text-sm font-medium">Seção vazia</div>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
              {LAYOUTS.map((l) => (
                <button type="button" key={l.value} onClick={() => { addSection(addSectionAt!, newSection(l.value)); setAddSectionAt(null); }} className="flex flex-col items-center gap-1.5 rounded-lg border border-zinc-200 p-2 text-xs hover:border-brand-500 hover:bg-brand-50">
                  <span className="flex h-8 w-full gap-0.5">
                    {l.value.split("-").map((w, i) => (<span key={i} className="rounded-sm bg-zinc-300" style={{ flex: Number(w) }} />))}
                  </span>
                  {l.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="mb-2 text-sm font-medium">Seções prontas</div>
            <div className="grid gap-2 sm:grid-cols-3">
              {SECTION_PRESETS.map((p) => (
                <button type="button" key={p.id} onClick={() => { addSection(addSectionAt!, p.build()); setAddSectionAt(null); }} className="rounded-lg border border-zinc-200 p-3 text-left hover:border-brand-500 hover:bg-brand-50">
                  <div className="text-sm font-medium">{p.label}</div>
                  <div className="text-xs text-zinc-500">{p.description}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </Modal>

      <Modal open={!!addBlockTo} onClose={() => setAddBlockTo(null)} title="Adicionar bloco" wide>
        {(["Conteúdo", "Mídia", "Evento", "Estrutura"] as const).map((g) => (
          <div key={g} className="mb-4">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">{g}</div>
            <div className="grid gap-2 sm:grid-cols-3">
              {BLOCK_LIBRARY.filter((b) => b.group === g).map((b) => (
                <button type="button" key={b.type} onClick={() => { addBlock(addBlockTo!.sid, addBlockTo!.col, b.type); setAddBlockTo(null); }} className="rounded-lg border border-zinc-200 p-3 text-left hover:border-brand-500 hover:bg-brand-50">
                  <div className="text-sm font-medium">{b.label}</div>
                  <div className="text-xs text-zinc-500">{b.description}</div>
                </button>
              ))}
            </div>
          </div>
        ))}
      </Modal>

      <PageSettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        page={page}
        onSaved={(meta) => { setPage((p) => ({ ...p, ...meta })); setNotice({ type: "ok", text: "Configurações da página salvas." }); router.refresh(); }}
      />

      <VersionsModal
        open={versionsOpen}
        pageId={page.id}
        onClose={() => setVersionsOpen(false)}
        onRestore={(c) => { update(() => c); setVersionsOpen(false); setNotice({ type: "ok", text: "Versão restaurada como rascunho. Publique para colocar no ar." }); }}
      />

      <ScheduleModal open={scheduleOpen} onClose={() => setScheduleOpen(false)} onConfirm={(at) => doPublish(at)} busy={publishing} />
    </div>
  );
}

function VersionsModal({ open, pageId, onClose, onRestore }: { open: boolean; pageId: string; onClose: () => void; onRestore: (c: PageContent) => void }) {
  const [list, setList] = useState<{ id: string; created_at: string; author: string }[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  useEffect(() => {
    if (!open) return;
    let alive = true;
    listVersions(pageId).then((l) => alive && setList(l));
    return () => {
      alive = false;
      setList(null);
    };
  }, [open, pageId]);
  return (
    <Modal open={open} onClose={onClose} title="Histórico de versões">
      <p className="mb-3 text-sm text-zinc-500">Cada publicação guarda uma versão. Restaurar coloca a versão no editor como rascunho.</p>
      {list === null ? (
        <p className="text-sm text-zinc-500">Carregando…</p>
      ) : list.length === 0 ? (
        <p className="text-sm text-zinc-500">Nenhuma versão publicada ainda.</p>
      ) : (
        <ul className="divide-y divide-zinc-100">
          {list.map((v, i) => (
            <li key={v.id} className="flex items-center justify-between py-2.5 text-sm">
              <div>
                <div className="font-medium">{formatDateTime(v.created_at)} {i === 0 && <span className="adm-badge ml-1 bg-emerald-100 text-emerald-800">atual</span>}</div>
                <div className="text-xs text-zinc-500">por {v.author}</div>
              </div>
              <button
                type="button"
                className="adm-btn-secondary adm-btn-sm"
                disabled={!!busy}
                onClick={async () => {
                  setBusy(v.id);
                  const c = await getVersion(v.id);
                  setBusy(null);
                  if (c) onRestore(c);
                }}
              >
                {busy === v.id ? "…" : "Restaurar"}
              </button>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}

function ScheduleModal({ open, onClose, onConfirm, busy }: { open: boolean; onClose: () => void; onConfirm: (iso: string) => void; busy: boolean }) {
  const [at, setAt] = useState("");
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Agendar publicação"
      footer={
        <>
          <button type="button" className="adm-btn-secondary" onClick={onClose}>Cancelar</button>
          <button type="button" className="adm-btn-primary" disabled={!at || busy || new Date(at).getTime() <= currentTime()} onClick={() => onConfirm(at)}>Agendar</button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <DateTime label="Publicar em" value={at} onChange={setAt} help="A página entra no ar automaticamente nesse horário (horário do seu dispositivo)." />
      </div>
    </Modal>
  );
}
