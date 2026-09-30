// Código compartilhado entre o site público e o painel ADM.
// Mantenha as cópias em FestivalPrimaveraCultura/src/shared e ADM-FestivalPrimaveraCultura/src/shared iguais.

export type AppRole = "admin" | "editor";
export type PageKind = "home" | "evento" | "institucional";
export type PageStatus = "draft" | "published" | "scheduled";
export type SubmissionStatus = "novo" | "contatado" | "confirmado" | "descartado";

export type SectionLayout = "1" | "1-1" | "1-2" | "2-1" | "1-1-1" | "1-1-1-1";

export interface SectionStyle {
  bgType: "none" | "color" | "gradient" | "image" | "video";
  bgColor?: string;
  bgColor2?: string;
  bgUrl?: string;
  overlay?: number; // 0–80 (%)
  width: "contained" | "full";
  padding: "none" | "sm" | "md" | "lg";
  align: "left" | "center" | "right";
  valign: "top" | "center" | "bottom";
  textTone: "auto" | "light" | "dark";
  anchor?: string;
  hideOn: "none" | "mobile" | "desktop";
  minHeight?: "auto" | "half" | "screen";
}

export interface Section {
  id: string;
  name?: string;
  layout: SectionLayout;
  columns: Block[][];
  style: SectionStyle;
}

export interface PageContent {
  sections: Section[];
}

// ---------- Blocos ----------
export interface HeadingProps { text: string; level: 1 | 2 | 3; align?: "left" | "center" | "right"; color?: string }
export interface RichTextProps { html: string }
export interface ImageProps { url: string; alt?: string; caption?: string; link?: string; ratio?: "auto" | "1/1" | "4/3" | "16/9" | "3/4"; rounded?: boolean }
export interface GalleryProps { images: { url: string; alt?: string }[]; mode: "grid" | "carousel"; columns: 2 | 3 | 4 }
export interface VideoProps { url: string; caption?: string }
export interface ButtonProps { label: string; href: string; variant: "primary" | "secondary" | "outline"; newTab?: boolean; align?: "left" | "center" | "right"; size?: "md" | "lg" }
export interface LinksProps { items: { title: string; url: string; description?: string }[] }
export interface EventInfoProps { startsAt?: string; endsAt?: string; location?: string; address?: string; showMap?: boolean; showCalendar?: boolean; useFestival?: boolean }
export interface FormProps {
  title?: string;
  intro?: string;
  successMessage?: string;
  fields: { phone: boolean; city: boolean; interests: boolean; heardFrom: boolean; message: boolean; newsletter: boolean };
  interestOptions?: string[];
  buttonLabel?: string;
}
export interface ScheduleProps { title?: string; limit?: number; showPast?: boolean }
export interface CountdownProps { target?: string; useFestival?: boolean; label?: string }
export interface FaqProps { items: { q: string; a: string }[] }
export interface LogosProps { title?: string; items: { url: string; name?: string; link?: string }[]; grayscale?: boolean }
export interface SpacerProps { size: "sm" | "md" | "lg" }
export interface DividerProps { style: "line" | "dots" | "flower" }

export type BlockMap = {
  heading: HeadingProps;
  richtext: RichTextProps;
  image: ImageProps;
  gallery: GalleryProps;
  video: VideoProps;
  button: ButtonProps;
  links: LinksProps;
  eventinfo: EventInfoProps;
  form: FormProps;
  schedule: ScheduleProps;
  countdown: CountdownProps;
  faq: FaqProps;
  logos: LogosProps;
  spacer: SpacerProps;
  divider: DividerProps;
};
export type BlockType = keyof BlockMap;
export type Block<T extends BlockType = BlockType> = { [K in T]: { id: string; type: K; props: BlockMap[K] } }[T];

// ---------- Configurações ----------
export interface Brand {
  logo_url?: string;
  logo_light_url?: string;
  favicon_url?: string;
  og_image_url?: string;
  hero_cover_url?: string;
  event_cover_url?: string;
}
export interface Theme {
  primary?: string;
  secondary?: string;
  accent?: string;
  background?: string;
  text?: string;
  fontHeading?: string; // nome no Google Fonts
  fontBody?: string;
  fontHeadingUrl?: string; // arquivo enviado (.woff2)
  fontBodyUrl?: string;
}
export interface NavItem { label: string; href: string; visible: boolean; auto?: "eventos" }
export interface SiteSettings {
  festival_name: string;
  tagline: string | null;
  location: string | null;
  starts_at: string | null;
  ends_at: string | null;
  schedule_text: string | null;
  brand: Brand;
  theme: Theme;
  nav: NavItem[];
  footer: { text?: string; address?: string; email?: string; phone?: string };
  social: { instagram?: string; facebook?: string; youtube?: string; tiktok?: string; whatsapp?: string };
  privacy_text: string | null;
}

export interface EventSummary {
  id: string;
  slug: string;
  title: string;
  category: string | null;
  starts_at: string | null;
  ends_at: string | null;
  location: string | null;
  cover_url: string | null;
}

export interface RenderContext {
  mode: "public" | "preview";
  /** Momento da renderização (ms), para filtrar eventos passados. */
  now?: number;
  pageId?: string;
  settings: SiteSettings;
  events: EventSummary[];
  page?: { starts_at: string | null; ends_at: string | null; location: string | null; title: string };
}
