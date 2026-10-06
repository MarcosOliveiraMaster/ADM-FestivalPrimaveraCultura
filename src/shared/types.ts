// Código compartilhado entre o site público e o painel ADM.
// Mantenha as cópias em FestivalPrimaveraCultura/src/shared e ADM-FestivalPrimaveraCultura/src/shared iguais.

export type AppRole = "admin" | "editor";
export type PageKind = "home" | "evento" | "cortejo" | "capacitacao" | "institucional";
/** Áreas com listagem própria no site (mesma dinâmica de "Eventos"). */
export type AreaKind = "evento" | "cortejo" | "capacitacao";
export type PageStatus = "draft" | "published" | "scheduled";
export type SubmissionStatus = "novo" | "contatado" | "confirmado" | "descartado";

export type SectionLayout = "1" | "1-1" | "1-2" | "2-1" | "1-1-1" | "1-1-1-1";

export interface SectionStyle {
  bgType: "none" | "color" | "gradient" | "image" | "video" | "carousel";
  /** Imagens do carrossel (fundo "carousel"), exibidas em sequência. */
  bgImages?: string[];
  /** Segundos por imagem no carrossel (padrão 6). */
  bgInterval?: number;
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
  /** Divisor em forma de onda no topo e/ou na base da seção. */
  wave?: "none" | "top" | "bottom" | "both";
  /** Cor da onda (normalmente a cor de fundo da seção vizinha). Vazio = fundo do site. */
  waveColor?: string;
  /** Onda em movimento lento. */
  waveAnimate?: boolean;
  /** "members" = conteúdo exclusivo: só aparece para quem fez login (ex.: galeria exclusiva). */
  audience?: "all" | "members";
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
export interface VideoProps {
  url: string;
  caption?: string;
  /** Reprodução automática. Os navegadores só permitem autoplay sem som, então o vídeo começa mudo. */
  autoplay?: boolean;
  loop?: boolean;
}
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
export interface FaqProps {
  items: { q: string; a: string }[];
  /** Deixa a primeira pergunta aberta. */
  openFirst?: boolean;
  /** Ao abrir uma pergunta, fecha as outras. */
  single?: boolean;
}
export interface NewsItem { title: string; subtitle?: string; image?: string; url: string; source?: string; date?: string }
/** Inscrição no evento da página (login + confirmação por e-mail + Google Agenda). */
export interface RegistrationProps { title?: string; intro?: string; buttonLabel?: string }
/** Inscrição em capacitação sem login: nome, e-mail e telefone, com confirmação por e-mail. */
export interface TrainingFormProps { title?: string; intro?: string; buttonLabel?: string; successMessage?: string }
/** Notícias: só título, subtítulo e imagem; o clique leva ao link externo da matéria. */
export interface NewsProps { items: NewsItem[]; columns: 2 | 3; featured?: boolean }
export interface LogosProps { title?: string; items: { url: string; name?: string; link?: string }[]; grayscale?: boolean }
export interface SpacerProps { size: "sm" | "md" | "lg" }
export interface DividerProps { style: "line" | "dots" | "flower" | "wave" } // "flower" = ícone da marca

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
  news: NewsProps;
  registration: RegistrationProps;
  training: TrainingFormProps;
  logos: LogosProps;
  spacer: SpacerProps;
  divider: DividerProps;
};
export type BlockType = keyof BlockMap;
export type Block<T extends BlockType = BlockType> = { [K in T]: { id: string; type: K; props: BlockMap[K] } }[T];

// ---------- Configurações ----------
export interface Brand {
  /** Ícone da marca (PNG sem fundo) usado como símbolo em vários pontos do site. */
  icon_url?: string;
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
export interface NavItem { label: string; href: string; visible: boolean; auto?: "eventos" | "cortejos" | "capacitacoes" }
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
  social: { instagram?: string; facebook?: string; youtube?: string; tiktok?: string; whatsapp?: string; oxe?: string };
  privacy_text: string | null;
}

export interface EventSummary {
  id: string;
  kind?: PageKind;
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
  page?: { starts_at: string | null; ends_at: string | null; location: string | null; title: string; color?: string | null };
  /** Visitante logado (área do participante). */
  viewer?: { loggedIn: boolean };
}
