"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlignCenter, AlignLeft, AlignRight, Copy, Download, Plus, RotateCcw, Save, Trash2 } from "lucide-react";
import type { Theme } from "@/shared/types";
import { FONT_CATALOG, googleFontsHref, resolveTheme } from "@/shared/theme";
import {
  CERT_VARIABLES,
  SAMPLE_VALUES,
  certValues,
  defaultCertTemplate,
  newCertBlock,
  normalizeTemplate,
  templateFonts,
  type CertBlock,
  type CertEvent,
  type CertTemplate,
} from "@/shared/certificate";
import { CertificateView } from "@/shared/render/CertificateView";
import { certificatePdf, downloadBlob, qrDataUrl } from "@/shared/certificatePdf";
import { ColorInput, NumberField, Segmented, Select, Toggle } from "@/components/editor/fields";
import { MediaField } from "@/components/MediaLibrary";
import { saveCertificateTemplate } from "@/app/(painel)/participantes/actions";

const clamp = (n: number, a: number, b: number) => Math.min(b, Math.max(a, n));
const round = (n: number) => Math.round(n * 10) / 10;

/** Editor visual do modelo de certificado: fundo, textos arrastáveis com variáveis e QR code. */
export function CertificateEditor({
  target,
  title,
  subtitle,
  back,
  initial,
  festivalTemplate,
  hasOwn,
  theme,
  festival,
  event,
  siteUrl,
}: {
  target: string;
  title: string;
  subtitle: string;
  back: { href: string; label: string };
  initial: unknown;
  festivalTemplate: unknown;
  hasOwn: boolean;
  theme: Theme;
  festival: string;
  event: CertEvent;
  siteUrl: string;
}) {
  const router = useRouter();
  const primary = resolveTheme(theme).primary;
  const [t, setT] = useState<CertTemplate>(() => normalizeTemplate(initial as CertTemplate | null, primary));
  const [sel, setSel] = useState<string | null>(t.blocks[0]?.id ?? null);
  const [dirty, setDirty] = useState(false);
  const [busy, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [preview, setPreview] = useState<"exemplo" | "variaveis">("exemplo");
  const [qr, setQr] = useState<string | null>(null);
  const canvas = useRef<HTMLDivElement>(null);
  const pdfNode = useRef<HTMLDivElement>(null);
  const textArea = useRef<HTMLTextAreaElement>(null);
  const drag = useRef<{ id: string; dx: number; dy: number } | null>(null);

  useEffect(() => {
    qrDataUrl(`${siteUrl}/certificado/EXEMPLO`).then(setQr, () => setQr(null));
  }, [siteUrl]);

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (dirty) e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  function update(patch: Partial<CertTemplate>) {
    setT((x) => ({ ...x, ...patch }));
    setDirty(true);
  }
  function updateBlock(id: string, patch: Partial<CertBlock>) {
    setT((x) => ({ ...x, blocks: x.blocks.map((b) => (b.id === id ? { ...b, ...patch } : b)) }));
    setDirty(true);
  }

  // Arrastar textos e o QR code sobre o certificado.
  function onPointerDown(e: React.PointerEvent, id: string) {
    e.preventDefault();
    setSel(id);
    const rect = canvas.current!.getBoundingClientRect();
    const pos = id === "qr" ? t.qr : t.blocks.find((b) => b.id === id)!;
    drag.current = { id, dx: ((e.clientX - rect.left) / rect.width) * 100 - pos.x, dy: ((e.clientY - rect.top) / rect.height) * 100 - pos.y };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }
  function onPointerMove(e: React.PointerEvent) {
    const d = drag.current;
    if (!d || !canvas.current) return;
    const rect = canvas.current.getBoundingClientRect();
    const x = round(clamp(((e.clientX - rect.left) / rect.width) * 100 - d.dx, -5, 100));
    const y = round(clamp(((e.clientY - rect.top) / rect.height) * 100 - d.dy, -5, 100));
    if (d.id === "qr") update({ qr: { ...t.qr, x, y } });
    else updateBlock(d.id, { x, y });
  }
  const onPointerUp = () => (drag.current = null);

  const block = t.blocks.find((b) => b.id === sel) ?? null;
  const values =
    preview === "exemplo"
      ? { ...SAMPLE_VALUES, festival, evento: event.title === "Nome do evento" ? SAMPLE_VALUES.evento : event.title, ...pick(certValues({ name: "", code: "" }, event, festival), ["data", "local", "carga_horaria"]) }
      : Object.fromEntries(CERT_VARIABLES.map((v) => [v.key, `{{${v.key}}}`]));

  function insertVar(key: string) {
    if (!block) return;
    const el = textArea.current;
    const tag = `{{${key}}}`;
    if (!el) return updateBlock(block.id, { text: block.text + tag });
    const a = el.selectionStart ?? block.text.length;
    const b = el.selectionEnd ?? a;
    updateBlock(block.id, { text: block.text.slice(0, a) + tag + block.text.slice(b) });
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(a + tag.length, a + tag.length);
    });
  }

  function save(template: CertTemplate | null, label: string) {
    start(async () => {
      const r = await saveCertificateTemplate(target, template);
      setMsg(r.ok ? { ok: true, text: label } : { ok: false, text: r.error });
      if (r.ok) {
        setDirty(false);
        router.refresh();
      }
    });
  }

  async function testPdf() {
    if (!pdfNode.current) return;
    setMsg(null);
    try {
      downloadBlob(await certificatePdf(pdfNode.current, t.orientation), "certificado-exemplo.pdf");
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Erro ao gerar o PDF." });
    }
  }

  const fonts = googleFontsHref(theme, [...templateFonts(t), ...FONT_CATALOG.map((f) => f.name)]);
  const fontOptions: (readonly [string, string])[] = [["heading", "Títulos do site"], ["body", "Textos do site"], ...FONT_CATALOG.map((f) => [f.name, f.name] as const)];

  return (
    <div className="flex min-h-screen flex-col">
      {fonts && <link rel="stylesheet" href={fonts} crossOrigin="anonymous" />}
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-zinc-200 bg-white px-6 py-4 lg:px-8">
        <div>
          <a href={back.href} className="text-sm text-zinc-500 hover:underline">← {back.label}</a>
          <h1 className="text-xl font-semibold">{title}</h1>
          <p className="text-sm text-zinc-500">{subtitle}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {msg && <span className={`text-sm ${msg.ok ? "text-brand-700" : "text-red-600"}`}>{msg.text}</span>}
          <button type="button" className="adm-btn-ghost" onClick={testPdf}><Download size={16} /> PDF de teste</button>
          <button
            type="button"
            className="adm-btn-ghost"
            onClick={() => {
              if (!confirm("Voltar ao modelo inicial do festival? As mudanças não salvas serão perdidas.")) return;
              setT(defaultCertTemplate(primary));
              setSel("nome");
              setDirty(true);
            }}
          >
            <RotateCcw size={16} /> Modelo inicial
          </button>
          {target !== "padrao" && hasOwn && (
            <button type="button" className="adm-btn-secondary" disabled={busy} onClick={() => confirm("Esta página volta a usar o modelo padrão do festival. Continuar?") && (setT(normalizeTemplate(festivalTemplate as CertTemplate | null, primary)), save(null, "Agora usa o modelo padrão do festival."))}>
              Usar o padrão do festival
            </button>
          )}
          <button type="button" className="adm-btn-primary" disabled={busy} onClick={() => save(t, "Modelo salvo.")}>
            <Save size={16} /> {busy ? "Salvando…" : dirty ? "Salvar modelo" : "Salvo"}
          </button>
        </div>
      </div>

      <div className="grid flex-1 gap-6 p-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:p-8">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-zinc-500">
            <span>Arraste os textos e o QR code para posicionar. Clique para editar.</span>
            <div className="w-64">
              <Segmented label="" value={preview} onChange={setPreview} options={[["exemplo", "Dados de exemplo"], ["variaveis", "Ver variáveis"]]} />
            </div>
          </div>
          <div ref={canvas} className="overflow-hidden rounded-lg shadow-lg ring-1 ring-zinc-200" onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}>
            <CertificateView template={t} values={values} qr={qr} theme={theme} edit={{ selected: sel, onPointerDown }} />
          </div>
          <p className="text-xs text-zinc-500">
            Dica: trechos entre <code>[[ ]]</code> somem quando alguma variável dentro deles está vazia — ex.: <code>[[, com carga horária de {"{{carga_horaria}}"} horas]]</code>.
            O QR code leva à página pública de validação do certificado.
          </p>
          {/* Cópia sem marcações de edição, usada para o PDF de teste. */}
          <div style={{ position: "fixed", left: -20000, top: 0, width: t.orientation === "portrait" ? 794 : 1123 }} aria-hidden>
            <CertificateView rootRef={pdfNode} template={t} values={values} qr={qr} theme={theme} />
          </div>
        </div>

        <aside className="flex flex-col gap-5 text-sm">
          <section className="adm-card flex flex-col gap-3 p-4">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Página</h2>
            <Segmented label="Orientação (A4)" value={t.orientation} onChange={(v) => update({ orientation: v })} options={[["landscape", "Paisagem"], ["portrait", "Retrato"]]} />
            <MediaField label="Imagem de fundo" value={t.background ?? ""} onChange={(v) => update({ background: v || null })} folder="certificados" aspect={t.orientation === "portrait" ? "210 / 297" : "297 / 210"} help="A4: 3508×2480 px (paisagem) ou 2480×3508 px (retrato). Vazio = cor de fundo." />
            <ColorInput label="Cor de fundo" value={t.bgColor ?? ""} onChange={(v) => update({ bgColor: v || "#ffffff" })} />
            <Toggle label="Moldura" checked={!!t.frame} onChange={(v) => update({ frame: v ? primary : null })} />
            {t.frame && <ColorInput label="Cor da moldura" value={t.frame} onChange={(v) => update({ frame: v || primary })} />}
          </section>

          <section className="adm-card flex flex-col gap-3 p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Textos</h2>
              <button
                type="button"
                className="adm-btn-secondary adm-btn-sm"
                onClick={() => {
                  const b = newCertBlock({ color: "#1f2a24" });
                  update({ blocks: [...t.blocks, b] });
                  setSel(b.id);
                }}
              >
                <Plus size={14} /> Adicionar texto
              </button>
            </div>
            <div className="flex flex-wrap gap-1">
              {t.blocks.map((b, i) => (
                <button key={b.id} type="button" onClick={() => setSel(b.id)} className={`max-w-full truncate rounded-md border px-2 py-1 text-xs ${sel === b.id ? "border-brand-500 bg-brand-50 text-brand-700" : "border-zinc-200 hover:border-zinc-400"}`}>
                  {b.text.replace(/\s+/g, " ").slice(0, 22) || `Texto ${i + 1}`}
                </button>
              ))}
              <button type="button" onClick={() => setSel("qr")} className={`rounded-md border px-2 py-1 text-xs ${sel === "qr" ? "border-brand-500 bg-brand-50 text-brand-700" : "border-zinc-200 hover:border-zinc-400"}`}>QR code</button>
            </div>
          </section>

          {block && (
            <section className="adm-card flex flex-col gap-3 p-4">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Texto selecionado</h2>
              <label className="adm-label">
                Conteúdo
                <textarea ref={textArea} rows={4} value={block.text} onChange={(e) => updateBlock(block.id, { text: e.target.value })} className="adm-input font-mono text-xs" />
              </label>
              <div>
                <div className="mb-1 text-xs text-zinc-500">Inserir variável (puxada automaticamente do cadastro):</div>
                <div className="flex flex-wrap gap-1">
                  {CERT_VARIABLES.map((v) => (
                    <button key={v.key} type="button" title={v.label} onClick={() => insertVar(v.key)} className="rounded-full bg-zinc-100 px-2 py-0.5 font-mono text-[11px] text-zinc-700 hover:bg-brand-50 hover:text-brand-700">
                      {`{{${v.key}}}`}
                    </button>
                  ))}
                </div>
              </div>
              <Select label="Fonte" value={block.font} onChange={(v) => updateBlock(block.id, { font: v })} options={fontOptions} />
              <div className="grid grid-cols-2 gap-3">
                <NumberField label="Tamanho" value={block.size} min={6} max={200} onChange={(v) => updateBlock(block.id, { size: clamp(v || 6, 6, 200) })} />
                <NumberField label="Largura (%)" value={block.w} min={5} max={100} onChange={(v) => updateBlock(block.id, { w: clamp(v || 5, 5, 100) })} />
              </div>
              <ColorInput label="Cor" value={block.color} onChange={(v) => updateBlock(block.id, { color: v || "#1f2a24" })} />
              <Segmented label="Alinhamento" value={block.align} onChange={(v) => updateBlock(block.id, { align: v })} options={[["left", <AlignLeft key="l" size={14} />], ["center", <AlignCenter key="c" size={14} />], ["right", <AlignRight key="r" size={14} />]]} />
              <div className="flex flex-wrap gap-2">
                {([["bold", "Negrito", "font-bold"], ["italic", "Itálico", "italic"], ["upper", "MAIÚSCULAS", "uppercase"]] as const).map(([k, l, c]) => (
                  <button key={k} type="button" onClick={() => updateBlock(block.id, { [k]: !block[k] })} className={`rounded-md border px-2.5 py-1 text-xs ${c} ${block[k] ? "border-brand-500 bg-brand-50 text-brand-700" : "border-zinc-200"}`}>
                    {l}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <NumberField label="Posição X (%)" value={block.x} onChange={(v) => updateBlock(block.id, { x: round(v) })} />
                <NumberField label="Posição Y (%)" value={block.y} onChange={(v) => updateBlock(block.id, { y: round(v) })} />
              </div>
              <div className="flex justify-between gap-2 pt-1">
                <button
                  type="button"
                  className="adm-btn-ghost adm-btn-sm"
                  onClick={() => {
                    const b = { ...block, id: newCertBlock().id, y: clamp(block.y + 6, 0, 95) };
                    update({ blocks: [...t.blocks, b] });
                    setSel(b.id);
                  }}
                >
                  <Copy size={14} /> Duplicar
                </button>
                <button
                  type="button"
                  className="adm-btn-ghost adm-btn-sm text-red-600"
                  onClick={() => {
                    update({ blocks: t.blocks.filter((b) => b.id !== block.id) });
                    setSel(null);
                  }}
                >
                  <Trash2 size={14} /> Excluir texto
                </button>
              </div>
            </section>
          )}

          {sel === "qr" && (
            <section className="adm-card flex flex-col gap-3 p-4">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">QR code de validação</h2>
              <Toggle label="Mostrar QR code" checked={t.qr.enabled} onChange={(v) => update({ qr: { ...t.qr, enabled: v } })} help="Leva à página pública que confirma o certificado." />
              <NumberField label="Tamanho (% da largura)" value={t.qr.size} min={5} max={30} onChange={(v) => update({ qr: { ...t.qr, size: clamp(v || 5, 5, 30) } })} />
              <label className="adm-label">
                Legenda
                <input value={t.qr.label ?? ""} onChange={(e) => update({ qr: { ...t.qr, label: e.target.value } })} className="adm-input" placeholder="Valide aqui" />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <NumberField label="Posição X (%)" value={t.qr.x} onChange={(v) => update({ qr: { ...t.qr, x: round(v) } })} />
                <NumberField label="Posição Y (%)" value={t.qr.y} onChange={(v) => update({ qr: { ...t.qr, y: round(v) } })} />
              </div>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}

function pick(o: Record<string, string>, keys: string[]) {
  return Object.fromEntries(keys.filter((k) => o[k]).map((k) => [k, o[k]]));
}
