import type { SiteSettings, Theme } from "./types";

export const DEFAULT_THEME: Required<Pick<Theme, "primary" | "secondary" | "accent" | "background" | "text" | "fontHeading" | "fontBody">> = {
  primary: "#2f6f4f",
  secondary: "#e9a23b",
  accent: "#d9577a",
  background: "#fbf8f2",
  text: "#1f2a24",
  fontHeading: "Fraunces",
  fontBody: "Inter",
};

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
  const head = t.fontHeadingUrl ? `"FestivalHeading"` : `"${t.fontHeading}"`;
  const body = t.fontBodyUrl ? `"FestivalBody"` : `"${t.fontBody}"`;
  return `${faces.join("")}${scope}{--fp-primary:${t.primary};--fp-secondary:${t.secondary};--fp-accent:${t.accent};--fp-bg:${t.background};--fp-text:${t.text};--fp-font-heading:${head},Georgia,serif;--fp-font-body:${body},system-ui,sans-serif}`;
}

export function googleFontsHref(theme: Theme | undefined) {
  const t = resolveTheme(theme);
  const fams = new Set<string>();
  if (!t.fontHeadingUrl && t.fontHeading) fams.add(t.fontHeading);
  if (!t.fontBodyUrl && t.fontBody) fams.add(t.fontBody);
  if (!fams.size) return null;
  const q = [...fams].map((f) => `family=${encodeURIComponent(f).replace(/%20/g, "+")}:wght@400;600;700`).join("&");
  return `https://fonts.googleapis.com/css2?${q}&display=swap`;
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
