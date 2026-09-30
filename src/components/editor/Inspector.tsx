"use client";
import { useState } from "react";
import { AlignCenter, AlignLeft, AlignRight, ArrowDown, ArrowUp, Copy, Images, Trash2 } from "lucide-react";
import type { Block, BlockMap, BlockType, Section, SectionStyle } from "@/shared/types";
import { LAYOUTS, blockLabel } from "@/shared/blocks";
import { videoEmbedUrl } from "@/shared/format";
import { FrameButton, MediaField, MediaPickerModal } from "../MediaLibrary";
import { FramedImage } from "@/shared/render/FramedImage";
import { RichTextEditor } from "./RichTextEditor";
import { ColorInput, DateTime, ListEditor, NumberField, Segmented, Select, Text, Toggle } from "./fields";

const ALIGN_OPTS = [["left", <AlignLeft key="l" size={14} />], ["center", <AlignCenter key="c" size={14} />], ["right", <AlignRight key="r" size={14} />]] as const;

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 border-b border-zinc-200 px-4 py-4 last:border-0">
      <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{title}</div>
      {children}
    </div>
  );
}

function Actions({ onUp, onDown, onDuplicate, onDelete, extra }: { onUp: () => void; onDown: () => void; onDuplicate: () => void; onDelete: () => void; extra?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap gap-1">
      <button type="button" className="adm-btn-secondary adm-btn-sm" onClick={onUp} title="Mover para cima"><ArrowUp size={14} /></button>
      <button type="button" className="adm-btn-secondary adm-btn-sm" onClick={onDown} title="Mover para baixo"><ArrowDown size={14} /></button>
      <button type="button" className="adm-btn-secondary adm-btn-sm" onClick={onDuplicate}><Copy size={14} /> Duplicar</button>
      {extra}
      <button type="button" className="adm-btn-ghost adm-btn-sm ml-auto text-red-600" onClick={onDelete}><Trash2 size={14} /> Excluir</button>
    </div>
  );
}

export function SectionInspector({ section, onChange, onLayout, onMove, onDuplicate, onDelete }: {
  section: Section;
  onChange: (s: Section) => void;
  onLayout: (l: Section["layout"]) => void;
  onMove: (d: -1 | 1) => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const s = section.style;
  const set = (patch: Partial<SectionStyle>) => onChange({ ...section, style: { ...s, ...patch } });
  return (
    <div>
      <Group title="Seção">
        <Text label="Nome (só no painel)" value={section.name} onChange={(v) => onChange({ ...section, name: v })} placeholder="Ex.: Capa, Sobre…" />
        <Actions onUp={() => onMove(-1)} onDown={() => onMove(1)} onDuplicate={onDuplicate} onDelete={onDelete} />
      </Group>
      <Group title="Layout">
        <div className="grid grid-cols-3 gap-2">
          {LAYOUTS.map((l) => (
            <button type="button" key={l.value} onClick={() => onLayout(l.value)} title={l.label} className={`flex h-10 gap-0.5 rounded-md border p-1.5 ${section.layout === l.value ? "border-brand-500 bg-brand-50" : "border-zinc-200 hover:border-zinc-400"}`}>
              {l.value.split("-").map((w, i) => (
                <span key={i} className={`rounded-sm ${section.layout === l.value ? "bg-brand-500" : "bg-zinc-300"}`} style={{ flex: Number(w) }} />
              ))}
            </button>
          ))}
        </div>
        <span className="adm-help">No celular as colunas ficam empilhadas automaticamente.</span>
        <Segmented label="Largura" value={s.width} onChange={(v) => set({ width: v })} options={[["contained", "Contida"], ["full", "Tela cheia"]]} />
        <Segmented label="Espaçamento vertical" value={s.padding} onChange={(v) => set({ padding: v })} options={[["none", "0"], ["sm", "P"], ["md", "M"], ["lg", "G"]]} />
        <Segmented label="Altura mínima" value={s.minHeight ?? "auto"} onChange={(v) => set({ minHeight: v })} options={[["auto", "Auto"], ["half", "Meia tela"], ["screen", "Tela"]]} />
        <Segmented label="Alinhamento do texto" value={s.align} onChange={(v) => set({ align: v })} options={ALIGN_OPTS} />
        <Segmented label="Alinhamento vertical" value={s.valign} onChange={(v) => set({ valign: v })} options={[["top", "Topo"], ["center", "Centro"], ["bottom", "Base"]]} />
      </Group>
      <Group title="Fundo">
        <Select
          label="Tipo de fundo"
          value={s.bgType}
          onChange={(v) => set({ bgType: v })}
          options={[["none", "Padrão do site"], ["color", "Cor"], ["gradient", "Degradê"], ["image", "Imagem"], ["video", "Vídeo"]]}
        />
        {(s.bgType === "color" || s.bgType === "gradient") && <ColorInput label={s.bgType === "gradient" ? "Cor inicial" : "Cor"} value={s.bgColor} onChange={(v) => set({ bgColor: v })} placeholder={s.bgType === "gradient" ? "cor primária" : "#ffffff"} />}
        {s.bgType === "gradient" && <ColorInput label="Cor final" value={s.bgColor2} onChange={(v) => set({ bgColor2: v })} placeholder="cor de destaque" />}
        {s.bgType === "image" && <MediaField label="Imagem de fundo" value={s.bgUrl} onChange={(v) => set({ bgUrl: v })} help="Vazio = usa a capa da landing definida em Configurações. Clique em Ajustar para posicionar e dar zoom." folder="fundos" aspect="16 / 9" mobile />}
        {s.bgType === "video" && <MediaField label="Vídeo de fundo (MP4)" kind="video" value={s.bgUrl} onChange={(v) => set({ bgUrl: v })} folder="fundos" />}
        {(s.bgType === "image" || s.bgType === "video") && (
          <label className="adm-label">
            Escurecer fundo: {s.overlay ?? 40}%
            <input type="range" min={0} max={80} step={5} value={s.overlay ?? 40} onChange={(e) => set({ overlay: Number(e.target.value) })} className="accent-brand-500" />
          </label>
        )}
        <Segmented label="Cor do texto" value={s.textTone} onChange={(v) => set({ textTone: v })} options={[["auto", "Automática"], ["dark", "Escura"], ["light", "Clara"]]} />
      </Group>
      <Group title="Avançado">
        <Text label="Âncora (link interno)" value={s.anchor} onChange={(v) => set({ anchor: v.replace(/[^a-z0-9-]/gi, "").toLowerCase() })} placeholder="ex.: programacao" help={s.anchor ? `Link para esta seção: #${s.anchor}` : "Permite criar links como /#programacao no menu."} />
        <Segmented label="Mostrar em" value={s.hideOn} onChange={(v) => set({ hideOn: v })} options={[["none", "Todos"], ["mobile", "Só computador"], ["desktop", "Só celular"]]} />
      </Group>
    </div>
  );
}

export function BlockInspector({ block, columns, column, onChange, onMove, onMoveColumn, onDuplicate, onDelete }: {
  block: Block;
  columns: number;
  column: number;
  onChange: (b: Block) => void;
  onMove: (d: -1 | 1) => void;
  onMoveColumn: (c: number) => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const setProps = <T extends BlockType>(patch: Partial<BlockMap[T]>) => onChange({ ...block, props: { ...block.props, ...patch } } as Block);
  return (
    <div>
      <Group title={blockLabel(block.type)}>
        <Actions
          onUp={() => onMove(-1)}
          onDown={() => onMove(1)}
          onDuplicate={onDuplicate}
          onDelete={onDelete}
          extra={
            columns > 1 ? (
              <select value={column} onChange={(e) => onMoveColumn(Number(e.target.value))} className="adm-input !w-auto !py-1 text-xs" title="Mover para coluna">
                {Array.from({ length: columns }, (_, i) => (
                  <option key={i} value={i}>Coluna {i + 1}</option>
                ))}
              </select>
            ) : null
          }
        />
      </Group>
      <Group title="Conteúdo">
        <BlockFields block={block} set={setProps} />
      </Group>
    </div>
  );
}

function BlockFields({ block, set }: { block: Block; set: (patch: Record<string, unknown>) => void }) {
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [logosOpen, setLogosOpen] = useState(false);
  switch (block.type) {
    case "heading": {
      const p = block.props;
      return (
        <>
          <Text label="Texto" value={p.text} onChange={(v) => set({ text: v })} multiline />
          <Segmented label="Tamanho" value={String(p.level) as "1" | "2" | "3"} onChange={(v) => set({ level: Number(v) })} options={[["1", "Grande"], ["2", "Médio"], ["3", "Pequeno"]]} />
          <Segmented label="Alinhamento" value={p.align ?? "left"} onChange={(v) => set({ align: v })} options={ALIGN_OPTS} />
          <ColorInput label="Cor" value={p.color} onChange={(v) => set({ color: v })} placeholder="automática" />
        </>
      );
    }
    case "richtext":
      return <RichTextEditor value={block.props.html} onChange={(html) => set({ html })} />;
    case "image": {
      const p = block.props;
      return (
        <>
          <MediaField label="Imagem" value={p.url} onChange={(v) => set({ url: v })} aspect={{ auto: "4 / 3", "1/1": "1 / 1", "4/3": "4 / 3", "16/9": "16 / 9", "3/4": "3 / 4" }[p.ratio ?? "auto"]} help={p.ratio === "auto" || !p.ratio ? "Com proporção “Original”, o ajuste serve para dar zoom; escolha uma proporção para também reposicionar." : undefined} />
          <Text label="Texto alternativo" value={p.alt} onChange={(v) => set({ alt: v })} help="Descreve a imagem para leitores de tela e Google." />
          <Text label="Legenda" value={p.caption} onChange={(v) => set({ caption: v })} />
          <Text label="Link ao clicar (opcional)" value={p.link} onChange={(v) => set({ link: v })} placeholder="https://" />
          <Select label="Proporção" value={p.ratio ?? "auto"} onChange={(v) => set({ ratio: v })} options={[["auto", "Original"], ["1/1", "Quadrada"], ["4/3", "4:3"], ["16/9", "16:9 (paisagem)"], ["3/4", "3:4 (retrato)"]]} />
          <Toggle label="Cantos arredondados" checked={p.rounded} onChange={(v) => set({ rounded: v })} />
        </>
      );
    }
    case "gallery": {
      const p = block.props;
      return (
        <>
          <Segmented label="Exibição" value={p.mode} onChange={(v) => set({ mode: v })} options={[["grid", "Grade"], ["carousel", "Carrossel"]]} />
          {p.mode === "grid" && <Segmented label="Colunas" value={String(p.columns) as "2" | "3" | "4"} onChange={(v) => set({ columns: Number(v) })} options={[["2", "2"], ["3", "3"], ["4", "4"]]} />}
          <button type="button" className="adm-btn-primary adm-btn-sm self-start" onClick={() => setGalleryOpen(true)}><Images size={14} /> Adicionar imagens</button>
          <ListEditor
            label={`Imagens (${p.images.length})`}
            items={p.images}
            onChange={(images) => set({ images })}
            create={() => ({ url: "", alt: "" })}
            addLabel="Adicionar vazia"
            render={(im, setIm) => (
              <div className="flex gap-2">
                {im.url ? <span className="h-12 w-12 shrink-0 overflow-hidden rounded"><FramedImage url={im.url} className="h-full w-full object-cover" /></span> : <div className="h-12 w-12 shrink-0 rounded bg-zinc-200" />}
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <input value={im.alt ?? ""} onChange={(e) => setIm({ ...im, alt: e.target.value })} placeholder="Descrição" className="adm-input" />
                  <FrameButton url={im.url} onChange={(url) => setIm({ ...im, url })} aspect={p.mode === "carousel" ? "16 / 9" : "1 / 1"} />
                </div>
              </div>
            )}
          />
          <MediaPickerModal open={galleryOpen} multiple onClose={() => setGalleryOpen(false)} onSelect={(items) => set({ images: [...p.images, ...items.map((m) => ({ url: m.url, alt: m.alt ?? "" }))] })} />
        </>
      );
    }
    case "video": {
      const ok = videoEmbedUrl(block.props.url);
      return (
        <>
          <Text label="Link do vídeo" value={block.props.url} onChange={(v) => set({ url: v })} placeholder="https://www.youtube.com/watch?v=…" help={block.props.url && !ok ? "⚠ Link não reconhecido. Use YouTube, Vimeo, Instagram ou um .mp4." : "Aceita YouTube, Vimeo, Instagram (post/reel) ou arquivo .mp4."} />
          <Text label="Legenda" value={block.props.caption} onChange={(v) => set({ caption: v })} />
        </>
      );
    }
    case "button": {
      const p = block.props;
      return (
        <>
          <Text label="Texto do botão" value={p.label} onChange={(v) => set({ label: v })} />
          <Text label="Link" value={p.href} onChange={(v) => set({ href: v })} placeholder="https://, /eventos, #contato, https://wa.me/55…" />
          <Toggle label="Abrir em nova aba" checked={p.newTab} onChange={(v) => set({ newTab: v })} />
          <Segmented label="Estilo" value={p.variant} onChange={(v) => set({ variant: v })} options={[["primary", "Principal"], ["secondary", "Secundário"], ["outline", "Contorno"]]} />
          <Segmented label="Tamanho" value={p.size ?? "md"} onChange={(v) => set({ size: v })} options={[["md", "Normal"], ["lg", "Grande"]]} />
          <Segmented label="Posição" value={p.align ?? "left"} onChange={(v) => set({ align: v })} options={ALIGN_OPTS} />
        </>
      );
    }
    case "links":
      return (
        <ListEditor
          label="Links"
          items={block.props.items}
          onChange={(items) => set({ items })}
          create={() => ({ title: "Novo link", url: "https://", description: "" })}
          addLabel="Adicionar link"
          render={(it, setIt) => (
            <>
              <input value={it.title} onChange={(e) => setIt({ ...it, title: e.target.value })} placeholder="Título" className="adm-input" />
              <input value={it.url} onChange={(e) => setIt({ ...it, url: e.target.value })} placeholder="https://" className="adm-input" />
              <input value={it.description ?? ""} onChange={(e) => setIt({ ...it, description: e.target.value })} placeholder="Descrição (opcional)" className="adm-input" />
            </>
          )}
        />
      );
    case "eventinfo": {
      const p = block.props;
      return (
        <>
          <Toggle label="Usar data e local do festival" checked={p.useFestival} onChange={(v) => set({ useFestival: v })} help="Puxa as informações de Configurações." />
          {!p.useFestival && (
            <>
              <p className="adm-help">Deixe vazio para usar a data e o local definidos nas configurações desta página.</p>
              <DateTime label="Início" value={p.startsAt} onChange={(v) => set({ startsAt: v })} />
              <DateTime label="Término" value={p.endsAt} onChange={(v) => set({ endsAt: v })} />
              <Text label="Local" value={p.location} onChange={(v) => set({ location: v })} placeholder="Ex.: Praça Central" />
            </>
          )}
          <Text label="Endereço para o mapa" value={p.address} onChange={(v) => set({ address: v })} placeholder="Rua, número, cidade" />
          <Toggle label="Mostrar mapa" checked={p.showMap} onChange={(v) => set({ showMap: v })} />
          <Toggle label="Botão “Adicionar à agenda”" checked={p.showCalendar} onChange={(v) => set({ showCalendar: v })} />
        </>
      );
    }
    case "form": {
      const p = block.props;
      const f = p.fields;
      const setF = (patch: Partial<typeof f>) => set({ fields: { ...f, ...patch } });
      return (
        <>
          <Text label="Título" value={p.title} onChange={(v) => set({ title: v })} />
          <Text label="Texto de apresentação" value={p.intro} onChange={(v) => set({ intro: v })} multiline />
          <Text label="Texto do botão" value={p.buttonLabel} onChange={(v) => set({ buttonLabel: v })} />
          <Text label="Mensagem de agradecimento" value={p.successMessage} onChange={(v) => set({ successMessage: v })} />
          <div className="flex flex-col gap-2 rounded-lg bg-zinc-50 p-3">
            <span className="text-xs text-zinc-500">Nome, e-mail e aceite da LGPD são sempre pedidos.</span>
            <Toggle label="WhatsApp" checked={f.phone} onChange={(v) => setF({ phone: v })} />
            <Toggle label="Cidade" checked={f.city} onChange={(v) => setF({ city: v })} />
            <Toggle label="Como conheceu" checked={f.heardFrom} onChange={(v) => setF({ heardFrom: v })} />
            <Toggle label="Interesses" checked={f.interests} onChange={(v) => setF({ interests: v })} />
            <Toggle label="Mensagem" checked={f.message} onChange={(v) => setF({ message: v })} />
            <Toggle label="Aceite de novidades" checked={f.newsletter} onChange={(v) => setF({ newsletter: v })} />
          </div>
          {f.interests && (
            <Text
              label="Opções de interesse (uma por linha)"
              multiline
              value={(p.interestOptions ?? []).join("\n")}
              onChange={(v) => set({ interestOptions: v.split("\n").map((x) => x.trimStart()).filter((x, i, a) => x || i === a.length - 1) })}
              help="Vazio = lista os eventos publicados."
            />
          )}
        </>
      );
    }
    case "schedule": {
      const p = block.props;
      return (
        <>
          <Text label="Título" value={p.title} onChange={(v) => set({ title: v })} />
          <NumberField label="Quantidade máxima" value={p.limit} min={1} max={30} onChange={(v) => set({ limit: v })} />
          <Toggle label="Mostrar eventos que já passaram" checked={p.showPast} onChange={(v) => set({ showPast: v })} />
          <p className="adm-help">Mostra automaticamente as páginas de evento publicadas, na ordem definida em “Páginas”.</p>
        </>
      );
    }
    case "countdown": {
      const p = block.props;
      return (
        <>
          <Toggle label="Contar até o início do festival" checked={p.useFestival} onChange={(v) => set({ useFestival: v })} help="Usa a data de Configurações. Fica oculto enquanto a data não for definida." />
          {!p.useFestival && <DateTime label="Data alvo" value={p.target} onChange={(v) => set({ target: v })} />}
          <Text label="Rótulo" value={p.label} onChange={(v) => set({ label: v })} />
        </>
      );
    }
    case "faq":
      return (
        <ListEditor
          label="Perguntas"
          items={block.props.items}
          onChange={(items) => set({ items })}
          create={() => ({ q: "Pergunta?", a: "Resposta." })}
          addLabel="Adicionar pergunta"
          render={(it, setIt) => (
            <>
              <input value={it.q} onChange={(e) => setIt({ ...it, q: e.target.value })} placeholder="Pergunta" className="adm-input font-medium" />
              <textarea value={it.a} onChange={(e) => setIt({ ...it, a: e.target.value })} placeholder="Resposta" rows={3} className="adm-input" />
            </>
          )}
        />
      );
    case "logos": {
      const p = block.props;
      return (
        <>
          <Text label="Título" value={p.title} onChange={(v) => set({ title: v })} />
          <Toggle label="Logos em preto e branco" checked={p.grayscale} onChange={(v) => set({ grayscale: v })} help="Ficam coloridos ao passar o mouse." />
          <button type="button" className="adm-btn-primary adm-btn-sm self-start" onClick={() => setLogosOpen(true)}><Images size={14} /> Adicionar logos</button>
          <ListEditor
            label={`Logos (${p.items.length})`}
            items={p.items}
            onChange={(items) => set({ items })}
            create={() => ({ url: "", name: "", link: "" })}
            addLabel="Adicionar vazio"
            render={(it, setIt) => (
              <div className="flex gap-2">
                {it.url ? <span className="h-12 w-12 shrink-0 overflow-hidden rounded bg-white"><FramedImage url={it.url} className="h-full w-full object-contain" /></span> : <div className="h-12 w-12 shrink-0 rounded bg-zinc-200" />}
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <input value={it.name ?? ""} onChange={(e) => setIt({ ...it, name: e.target.value })} placeholder="Nome" className="adm-input" />
                  <input value={it.link ?? ""} onChange={(e) => setIt({ ...it, link: e.target.value })} placeholder="Site (opcional)" className="adm-input" />
                  <FrameButton url={it.url} onChange={(url) => setIt({ ...it, url })} aspect="3 / 1" fit="contain" />
                </div>
              </div>
            )}
          />
          <MediaPickerModal open={logosOpen} multiple onClose={() => setLogosOpen(false)} onSelect={(items) => set({ items: [...p.items, ...items.map((m) => ({ url: m.url, name: m.alt ?? "", link: "" }))] })} />
        </>
      );
    }
    case "spacer":
      return <Segmented label="Altura" value={block.props.size} onChange={(v) => set({ size: v })} options={[["sm", "Pequeno"], ["md", "Médio"], ["lg", "Grande"]]} />;
    case "divider":
      return <Segmented label="Estilo" value={block.props.style} onChange={(v) => set({ style: v })} options={[["flower", "Ícone da marca"], ["dots", "• Pontos"], ["line", "— Linha"]]} />;
    default:
      return null;
  }
}
