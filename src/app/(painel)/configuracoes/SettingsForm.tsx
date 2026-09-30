"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Eye, EyeOff, Plus, Trash2 } from "lucide-react";
import type { NavItem, SiteSettings } from "@/shared/types";
import { DEFAULT_THEME, FONT_CATALOG, findFont, googleFontsHref, themeCss } from "@/shared/theme";
import { BrandIcon } from "@/shared/render/BrandIcon";
import { MediaField } from "@/components/MediaLibrary";
import { ColorInput, DateTime, Text } from "@/components/editor/fields";
import { updateSettings } from "./actions";

const TABS = [
  ["geral", "Festival"],
  ["identidade", "Identidade visual"],
  ["cores", "Cores e fontes"],
  ["menu", "Menu"],
  ["rodape", "Rodapé e redes"],
  ["privacidade", "Privacidade"],
] as const;


export function SettingsForm({ initial, tab: initialTab, pages, siteUrl }: { initial: SiteSettings; tab: string; pages: { title: string; slug: string; kind: string }[]; siteUrl: string }) {
  const router = useRouter();
  const [s, setS] = useState(initial);
  const [tab, setTab] = useState(initialTab);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, start] = useTransition();
  const [dirty, setDirty] = useState(false);
  const set = (patch: Partial<SiteSettings>) => {
    setS((x) => ({ ...x, ...patch }));
    setDirty(true);
    setMsg(null);
  };
  const brand = (k: keyof SiteSettings["brand"], v: string) => set({ brand: { ...s.brand, [k]: v || undefined } });
  const theme = (k: keyof SiteSettings["theme"], v: string) => set({ theme: { ...s.theme, [k]: v || undefined } });

  function save() {
    start(async () => {
      const r = await updateSettings(s);
      setMsg(r.ok ? { ok: true, text: "Salvo! O site já está atualizado." } : { ok: false, text: r.error });
      if (r.ok) {
        setDirty(false);
        router.refresh();
      }
    });
  }

  const fonts = googleFontsHref(s.theme, FONT_CATALOG.map((f) => f.name));

  return (
    <div className="flex flex-col lg:flex-row">
      <nav className="flex gap-1 overflow-x-auto border-b border-zinc-200 bg-white px-4 py-2 lg:w-56 lg:flex-col lg:border-b-0 lg:border-r lg:px-3 lg:py-6">
        {TABS.map(([k, l]) => (
          <button type="button" key={k} onClick={() => { setTab(k); window.history.replaceState(null, "", `?aba=${k}`); }} className={`whitespace-nowrap rounded-lg px-3 py-2 text-left text-sm ${tab === k ? "bg-brand-50 font-medium text-brand-700" : "text-zinc-600 hover:bg-zinc-100"}`}>
            {l}
          </button>
        ))}
      </nav>
      <div className="min-w-0 flex-1 px-6 py-6 lg:px-8">
        <div className={`adm-card p-6 ${tab === "cores" ? "max-w-5xl" : "max-w-3xl"}`}>
          {tab === "geral" && (
            <div className="flex flex-col gap-4">
              <Text label="Nome do festival" value={s.festival_name} onChange={(v) => set({ festival_name: v })} />
              <Text label="Frase de apresentação" value={s.tagline} onChange={(v) => set({ tagline: v })} placeholder="Ex.: Música, arte e cultura para celebrar a primavera" help="Usada no Google e ao compartilhar o site." />
              <div className="grid gap-4 sm:grid-cols-2">
                <DateTime label="Início do festival" value={s.starts_at} onChange={(v) => set({ starts_at: v || null })} help="Vazio = “Datas em breve”. Ativa a contagem regressiva." />
                <DateTime label="Término" value={s.ends_at} onChange={(v) => set({ ends_at: v || null })} />
              </div>
              <Text label="Local" value={s.location} onChange={(v) => set({ location: v })} placeholder="A definir" />
              <Text label="Horários (texto livre)" value={s.schedule_text} onChange={(v) => set({ schedule_text: v })} multiline placeholder="Ex.: Sexta e sábado, das 16h às 23h" />
            </div>
          )}

          {tab === "identidade" && (
            <div className="flex flex-col gap-5">
              <p className="text-sm text-zinc-500">Enquanto um espaço estiver vazio, o site usa um visual provisório neutro. Envie os arquivos quando a identidade estiver pronta.</p>
              <div className="rounded-xl border border-brand-100 bg-brand-50/50 p-4">
                <MediaField
                  label="Ícone da marca"
                  value={s.brand.icon_url}
                  onChange={(v) => brand("icon_url", v)}
                  help="PNG sem fundo (ou SVG), quadrado, 512×512 ou maior. Aparece ao lado do nome no menu e no rodapé, nos divisores, nos cards de eventos sem capa, na confirmação do formulário e no login do painel. Também vira o ícone da aba se não houver favicon."
                  folder="identidade"
                  aspect="1 / 1"
                  fit="contain"
                />
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                <MediaField label="Logo principal" value={s.brand.logo_url} onChange={(v) => brand("logo_url", v)} help="SVG ou PNG transparente. Aparece no menu." folder="identidade" aspect="3 / 1" fit="contain" />
                <MediaField label="Logo versão clara" value={s.brand.logo_light_url} onChange={(v) => brand("logo_light_url", v)} help="Para fundos escuros e rodapé." folder="identidade" aspect="3 / 1" fit="contain" />
                <MediaField label="Ícone / favicon" value={s.brand.favicon_url} onChange={(v) => brand("favicon_url", v)} help="PNG quadrado 512×512. Vazio = usa o ícone da marca." folder="identidade" aspect="1 / 1" fit="contain" />
                <MediaField label="Imagem de compartilhamento" value={s.brand.og_image_url} onChange={(v) => brand("og_image_url", v)} help="1200×630 — prévia no WhatsApp/Instagram." folder="identidade" aspect="1200 / 630" />
                <MediaField label="Capa da landing (hero)" value={s.brand.hero_cover_url} onChange={(v) => brand("hero_cover_url", v)} help="1920×1080. Usada nas seções com fundo “Imagem” sem arquivo próprio." folder="identidade" aspect="16 / 9" mobile />
                <MediaField label="Capa padrão de evento" value={s.brand.event_cover_url} onChange={(v) => brand("event_cover_url", v)} help="1600×900. Para eventos sem capa própria." folder="identidade" aspect="16 / 10" />
              </div>
            </div>
          )}

          {tab === "cores" && (
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="flex flex-col gap-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Paleta</div>
                <ColorInput label="Cor primária" value={s.theme.primary} onChange={(v) => theme("primary", v)} placeholder={DEFAULT_THEME.primary} />
                <ColorInput label="Cor secundária" value={s.theme.secondary} onChange={(v) => theme("secondary", v)} placeholder={DEFAULT_THEME.secondary} />
                <ColorInput label="Cor de destaque" value={s.theme.accent} onChange={(v) => theme("accent", v)} placeholder={DEFAULT_THEME.accent} />
                <ColorInput label="Fundo" value={s.theme.background} onChange={(v) => theme("background", v)} placeholder={DEFAULT_THEME.background} />
                <ColorInput label="Texto" value={s.theme.text} onChange={(v) => theme("text", v)} placeholder={DEFAULT_THEME.text} />
              </div>
              <div className="flex flex-col gap-6 lg:row-span-2">
                <FontPicker label="Fonte dos títulos" value={s.theme.fontHeading} fallback={DEFAULT_THEME.fontHeading} fileUrl={s.theme.fontHeadingUrl} onChange={(v) => theme("fontHeading", v)} onFile={(v) => theme("fontHeadingUrl", v)} />
                <FontPicker label="Fonte dos textos" value={s.theme.fontBody} fallback={DEFAULT_THEME.fontBody} fileUrl={s.theme.fontBodyUrl} onChange={(v) => theme("fontBody", v)} onFile={(v) => theme("fontBodyUrl", v)} bodyOnly />
              </div>
              <div>
                <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">Prévia</div>
                {fonts && <link rel="stylesheet" href={fonts} />}
                <style dangerouslySetInnerHTML={{ __html: themeCss(s.theme, ".fp-theme-preview") }} />
                <div className="fp-theme-preview sticky top-4 overflow-hidden rounded-xl border border-zinc-200">
                  <div className="fp-page">
                    <div className="fp-on-dark p-6" style={{ background: "linear-gradient(135deg, var(--fp-primary), var(--fp-accent))" }}>
                      <div className="fp-label">Festival</div>
                      <div className="fp-heading flex items-center gap-2 text-3xl"><BrandIcon url={s.brand.icon_url} className="h-9" /> {s.festival_name}</div>
                      <button type="button" className="fp-btn fp-btn-primary mt-4">Quero participar</button>
                    </div>
                    <div className="flex flex-col gap-3 p-6">
                      <div className="fp-heading text-xl">Sobre o festival</div>
                      <p className="text-sm">Texto corrido com a fonte dos textos. <a className="text-[var(--fp-primary)] underline">Um link</a>.</p>
                      <div className="flex gap-2">
                        <span className="fp-btn fp-btn-secondary !px-3 !py-1.5 text-sm">Secundário</span>
                        <span className="fp-btn fp-btn-outline !px-3 !py-1.5 text-sm">Contorno</span>
                      </div>
                      {s.brand.icon_url ? (
                        <div className="fp-divider-icons"><BrandIcon url={s.brand.icon_url} /><BrandIcon url={s.brand.icon_url} /><BrandIcon url={s.brand.icon_url} /></div>
                      ) : (
                        <div className="fp-divider-flower">• • •</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {tab === "menu" && <NavEditor nav={s.nav} onChange={(nav) => set({ nav })} pages={pages} />}

          {tab === "rodape" && (
            <div className="flex flex-col gap-4">
              <Text label="Texto do rodapé" value={s.footer.text} onChange={(v) => set({ footer: { ...s.footer, text: v } })} multiline />
              <div className="grid gap-4 sm:grid-cols-2">
                <Text label="E-mail de contato" value={s.footer.email} onChange={(v) => set({ footer: { ...s.footer, email: v } })} />
                <Text label="Telefone" value={s.footer.phone} onChange={(v) => set({ footer: { ...s.footer, phone: v } })} />
              </div>
              <Text label="Endereço" value={s.footer.address} onChange={(v) => set({ footer: { ...s.footer, address: v } })} />
              <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Redes sociais (links completos)</div>
              <div className="grid gap-4 sm:grid-cols-2">
                {(["instagram", "facebook", "youtube", "tiktok", "whatsapp"] as const).map((k) => (
                  <Text key={k} label={k[0].toUpperCase() + k.slice(1)} value={s.social[k]} onChange={(v) => set({ social: { ...s.social, [k]: v || undefined } })} placeholder={k === "whatsapp" ? "https://wa.me/55…" : `https://${k}.com/…`} />
                ))}
              </div>
            </div>
          )}

          {tab === "privacidade" && (
            <div className="flex flex-col gap-4">
              <Text
                label="Texto da página de privacidade"
                multiline
                value={s.privacy_text}
                onChange={(v) => set({ privacy_text: v })}
                help={`Aparece em ${siteUrl}/privacidade. Vazio = usa um texto padrão sobre LGPD.`}
              />
            </div>
          )}

          <div className="mt-6 flex items-center justify-end gap-3 border-t border-zinc-100 pt-4">
            {msg && <span className={`text-sm ${msg.ok ? "text-brand-600" : "text-red-600"}`}>{msg.text}</span>}
            {dirty && !msg && <span className="text-sm text-amber-700">Alterações não salvas</span>}
            <button type="button" className="adm-btn-primary" onClick={save} disabled={busy}>{busy ? "Salvando…" : "Salvar"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function NavEditor({ nav, onChange, pages }: { nav: NavItem[]; onChange: (n: NavItem[]) => void; pages: { title: string; slug: string; kind: string }[] }) {
  const upd = (i: number, patch: Partial<NavItem>) => onChange(nav.map((n, k) => (k === i ? { ...n, ...patch } : n)));
  const move = (i: number, d: number) => {
    const j = i + d;
    if (j < 0 || j >= nav.length) return;
    const next = [...nav];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-zinc-500">O item <b>Eventos</b> abre automaticamente a lista de páginas de evento publicadas. Links que começam com <code>/#</code> levam a uma seção da página inicial (defina a âncora na seção).</p>
      {nav.map((n, i) => (
        <div key={i} className={`flex flex-wrap items-center gap-2 rounded-lg border p-2 ${n.visible ? "border-zinc-200" : "border-dashed border-zinc-300 opacity-60"}`}>
          <input value={n.label} onChange={(e) => upd(i, { label: e.target.value })} className="adm-input w-40" placeholder="Nome" />
          <input value={n.href} onChange={(e) => upd(i, { href: e.target.value })} className="adm-input min-w-40 flex-1" placeholder="/pagina ou https://" list="nav-pages" disabled={n.auto === "eventos"} />
          {n.auto === "eventos" && <span className="adm-badge bg-brand-50 text-brand-700">automático</span>}
          <button type="button" className="adm-btn-ghost adm-btn-sm" onClick={() => upd(i, { visible: !n.visible })} title={n.visible ? "Ocultar" : "Mostrar"}>{n.visible ? <Eye size={15} /> : <EyeOff size={15} />}</button>
          <button type="button" className="adm-btn-ghost adm-btn-sm" onClick={() => move(i, -1)}><ArrowUp size={15} /></button>
          <button type="button" className="adm-btn-ghost adm-btn-sm" onClick={() => move(i, 1)}><ArrowDown size={15} /></button>
          {n.auto !== "eventos" && <button type="button" className="adm-btn-ghost adm-btn-sm text-red-600" onClick={() => onChange(nav.filter((_, k) => k !== i))}><Trash2 size={15} /></button>}
        </div>
      ))}
      <datalist id="nav-pages">
        {pages.map((p) => <option key={p.slug} value={`/eventos/${p.slug}`}>{p.title}</option>)}
        <option value="/#sobre" />
        <option value="/#programacao" />
        <option value="/#contato" />
      </datalist>
      <button type="button" className="adm-btn-secondary adm-btn-sm self-start" onClick={() => onChange([...nav, { label: "Novo item", href: "/", visible: true }])}><Plus size={14} /> Adicionar item</button>
    </div>
  );
}

function FontPicker({ label, value, fallback, fileUrl, onChange, onFile, bodyOnly }: { label: string; value?: string; fallback: string; fileUrl?: string; onChange: (v: string) => void; onFile: (v: string) => void; bodyOnly?: boolean }) {
  const current = value || fallback;
  const inCatalog = !!findFont(current);
  const [custom, setCustom] = useState(!inCatalog);
  return (
    <div className="flex flex-col gap-2">
      <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{label}</div>
      {fileUrl && <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">Um arquivo de fonte enviado está sendo usado. Remova-o abaixo para voltar a escolher da lista.</p>}
      <div className="grid gap-2">
        {FONT_CATALOG.map((f) => {
          const selected = !custom && current.toLowerCase() === f.name.toLowerCase();
          const warn = bodyOnly && f.use === "títulos";
          return (
            <button
              type="button"
              key={f.name}
              onClick={() => {
                setCustom(false);
                onChange(f.name === fallback ? "" : f.name);
              }}
              className={`rounded-lg border p-3 text-left transition ${selected ? "border-brand-500 bg-brand-50 ring-2 ring-brand-500/20" : "border-zinc-200 hover:border-zinc-400"}`}
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-xl leading-tight" style={{ fontFamily: f.stack ?? `"${f.name}", Arial, sans-serif`, fontWeight: bodyOnly ? 400 : f.headingWeight }}>
                  {bodyOnly ? "Música, arte e cultura na primavera" : "Festival da Primavera"}
                </span>
                {f.name === "Arial" && <span className="adm-badge shrink-0 bg-brand-100 text-brand-700">padrão</span>}
              </div>
              <div className="mt-1 text-xs font-medium text-zinc-700">{f.name} <span className="font-normal text-zinc-500">· indicada para {f.use}</span></div>
              <div className="text-xs text-zinc-500">{f.note}</div>
              {warn && selected && <div className="mt-1 text-xs text-amber-700">Essa fonte foi pensada para títulos; em textos longos pode cansar a leitura.</div>}
            </button>
          );
        })}
        <button type="button" onClick={() => setCustom(true)} className={`rounded-lg border p-3 text-left text-sm ${custom ? "border-brand-500 bg-brand-50" : "border-dashed border-zinc-300 text-zinc-600 hover:border-zinc-400"}`}>
          Outra fonte do Google Fonts…
        </button>
        {custom && (
          <input value={value ?? ""} onChange={(e) => onChange(e.target.value)} placeholder="Nome exato, ex.: Space Mono" className="adm-input" autoFocus />
        )}
      </div>
      <MediaField label="…ou envie o arquivo da fonte" kind="font" value={fileUrl} onChange={onFile} help=".woff2 recomendado. Tem prioridade sobre a escolha acima." folder="fontes" />
    </div>
  );
}
