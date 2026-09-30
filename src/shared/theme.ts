import type { SiteSettings, Theme } from "./types";

export const DEFAULT_THEME: Required<Pick<Theme, "primary" | "secondary" | "accent" | "background" | "text" | "fontHeading" | "fontBody">> = {
  primary: "#2f6f4f",
  secondary: "#e9a23b",
  accent: "#d9577a",
  background: "#fbf8f2",
  text: "#1f2a24",
  fontHeading: "Arial",
  fontBody: "Arial",
};

export interface FontOption {
  name: string;
  /** Pilha CSS completa (fontes de sistema) ou null para usar "Nome" + reserva. */
  stack?: string;
  /** Parâmetro "family=" do Google Fonts; null = fonte do sistema. */
  google: string | null;
  headingWeight: number;
  use: "títulos e textos" | "títulos";
  note: string;
}

/** Fontes selecionadas para o festival (Arial é a padrão). */
export const FONT_CATALOG: FontOption[] = [
  { name: "Arial", stack: 'Arial, "Helvetica Neue", Helvetica, sans-serif', google: null, headingWeight: 700, use: "títulos e textos", note: "Padrão atual. Neutra, universal e carrega na hora (já vem instalada em todo aparelho)." },
  { name: "Bricolage Grotesque", google: "Bricolage+Grotesque:opsz,wght@12..96,400;12..96,600;12..96,800", headingWeight: 800, use: "títulos e textos", note: "Grotesca com traços irregulares, cara de cartaz de evento cultural. Tem personalidade sem perder a leitura." },
  { name: "Instrument Serif", google: "Instrument+Serif:ital@0;1", headingWeight: 400, use: "títulos", note: "Serifa editorial condensada, usada em revistas e museus. Linda em títulos grandes — combine com Arial ou Archivo nos textos." },
  { name: "Syne", google: "Syne:wght@400;600;700;800", headingWeight: 700, use: "títulos", note: "Criada para o centro de arte Synesthésies (Paris). Ousada e artística, ideal para títulos." },
  { name: "Cormorant Garamond", google: "Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400", headingWeight: 600, use: "títulos e textos", note: "Garamond clássica e delicada, conversa com flores e primavera. Use em tamanhos médios e grandes." },
  { name: "Archivo", google: "Archivo:wght@400;600;700;800", headingWeight: 700, use: "títulos e textos", note: "Grotesca robusta, de origem gráfica argentina. Excelente legibilidade para textos, programação e formulários." },
];

export function findFont(name?: string) {
  return FONT_CATALOG.find((f) => f.name.toLowerCase() === (name ?? "").toLowerCase());
}

function fontStack(name: string, fallback: string) {
  const f = findFont(name);
  if (f?.stack) return f.stack;
  return `"${name.replace(/"/g, "")}", ${fallback}`;
}

export const DEFAULT_SETTINGS: SiteSettings = {
  festival_name: "Festival da Primavera",
  tagline: null,
  location: null,
  starts_at: null,
  ends_at: null,
  schedule_text: null,
  brand: {},
  theme: {},
  nav: [
    { label: "Início", href: "/", visible: true },
    { label: "Sobre", href: "/#sobre", visible: true },
    { label: "Eventos", href: "/eventos", visible: true, auto: "eventos" },
    { label: "Contato", href: "/#contato", visible: true },
  ],
  footer: {},
  social: {},
  privacy_text: null,
};

export function resolveTheme(theme: Theme | undefined) {
  return { ...DEFAULT_THEME, ...Object.fromEntries(Object.entries(theme ?? {}).filter(([, v]) => v)) } as typeof DEFAULT_THEME & Theme;
}

/** Variáveis CSS do tema (usadas por todos os blocos). */
export function themeCss(theme: Theme | undefined, scope = ":root") {
  const t = resolveTheme(theme);
  const faces: string[] = [];
  if (t.fontHeadingUrl) faces.push(`@font-face{font-family:"FestivalHeading";src:url("${t.fontHeadingUrl}");font-display:swap}`);
  if (t.fontBodyUrl) faces.push(`@font-face{font-family:"FestivalBody";src:url("${t.fontBodyUrl}");font-display:swap}`);
  const head = t.fontHeadingUrl ? `"FestivalHeading", Arial, sans-serif` : fontStack(t.fontHeading, "Arial, sans-serif");
  const body = t.fontBodyUrl ? `"FestivalBody", Arial, sans-serif` : fontStack(t.fontBody, "Arial, sans-serif");
  const weight = t.fontHeadingUrl ? 700 : findFont(t.fontHeading)?.headingWeight ?? 700;
  return `${faces.join("")}${scope}{--fp-primary:${t.primary};--fp-secondary:${t.secondary};--fp-accent:${t.accent};--fp-bg:${t.background};--fp-text:${t.text};--fp-font-heading:${head};--fp-font-body:${body};--fp-heading-weight:${weight}}`;
}

/** Link do Google Fonts para as fontes escolhidas (fontes do sistema e arquivos enviados não precisam). */
export function googleFontsHref(theme: Theme | undefined, extra: string[] = []) {
  const t = resolveTheme(theme);
  const names = new Set<string>(extra);
  if (!t.fontHeadingUrl && t.fontHeading) names.add(t.fontHeading);
  if (!t.fontBodyUrl && t.fontBody) names.add(t.fontBody);
  const params: string[] = [];
  for (const n of names) {
    const f = findFont(n);
    if (f) {
      if (f.google) params.push(`family=${f.google}`);
    } else if (n.trim()) {
      params.push(`family=${encodeURIComponent(n.trim()).replace(/%20/g, "+")}`);
    }
  }
  if (!params.length) return null;
  return `https://fonts.googleapis.com/css2?${params.join("&")}&display=swap`;
}

export function mergeSettings(row: Partial<SiteSettings> | null | undefined): SiteSettings {
  if (!row) return DEFAULT_SETTINGS;
  return {
    ...DEFAULT_SETTINGS,
    ...Object.fromEntries(Object.entries(row).filter(([, v]) => v !== null && v !== undefined)),
    brand: { ...(row.brand ?? {}) },
    theme: { ...(row.theme ?? {}) },
    nav: Array.isArray(row.nav) && row.nav.length ? row.nav : DEFAULT_SETTINGS.nav,
    footer: { ...(row.footer ?? {}) },
    social: { ...(row.social ?? {}) },
    tagline: row.tagline ?? null,
    location: row.location ?? null,
    starts_at: row.starts_at ?? null,
    ends_at: row.ends_at ?? null,
    schedule_text: row.schedule_text ?? null,
    privacy_text: row.privacy_text ?? null,
  } as SiteSettings;
}
