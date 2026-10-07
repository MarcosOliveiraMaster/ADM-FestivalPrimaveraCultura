import type { Block, BlockMap, BlockType, PageContent, Section, SectionLayout, SectionStyle } from "./types";

export function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

export const LAYOUTS: { value: SectionLayout; label: string; cols: number }[] = [
  { value: "1", label: "1 coluna", cols: 1 },
  { value: "1-1", label: "2 colunas (50/50)", cols: 2 },
  { value: "1-2", label: "2 colunas (33/66)", cols: 2 },
  { value: "2-1", label: "2 colunas (66/33)", cols: 2 },
  { value: "1-1-1", label: "3 colunas", cols: 3 },
  { value: "1-1-1-1", label: "4 colunas", cols: 4 },
];

export function layoutCols(layout: SectionLayout) {
  return LAYOUTS.find((l) => l.value === layout)?.cols ?? 1;
}

export const DEFAULT_SECTION_STYLE: SectionStyle = {
  bgType: "none",
  overlay: 40,
  width: "contained",
  padding: "md",
  align: "left",
  valign: "top",
  textTone: "auto",
  hideOn: "none",
  minHeight: "auto",
};

export const BLOCK_LIBRARY: { type: BlockType; label: string; description: string; group: "Conteúdo" | "Mídia" | "Evento" | "Estrutura" }[] = [
  { type: "heading", label: "Título", description: "Título grande (H1–H3)", group: "Conteúdo" },
  { type: "richtext", label: "Texto", description: "Texto formatado com negrito, listas, links…", group: "Conteúdo" },
  { type: "button", label: "Botão", description: "Botão com link", group: "Conteúdo" },
  { type: "links", label: "Lista de links", description: "Links com título e descrição", group: "Conteúdo" },
  { type: "faq", label: "Perguntas frequentes (FAQ)", description: "Perguntas e respostas expansíveis", group: "Conteúdo" },
  { type: "news", label: "Notícias", description: "Título, subtítulo e imagem com link para a matéria", group: "Conteúdo" },
  { type: "image", label: "Imagem", description: "Uma imagem com legenda", group: "Mídia" },
  { type: "gallery", label: "Galeria", description: "Grade ou carrossel de fotos", group: "Mídia" },
  { type: "video", label: "Vídeo", description: "YouTube, Vimeo ou Instagram", group: "Mídia" },
  { type: "logos", label: "Logos / patrocinadores", description: "Grade de logos com links", group: "Mídia" },
  { type: "eventinfo", label: "Data, hora e local", description: "Agenda, endereço e mapa", group: "Evento" },
  { type: "registration", label: "Inscrição no evento", description: "Inscrição com login, e-mail de confirmação e Google Agenda", group: "Evento" },
  { type: "training", label: "Inscrição em capacitação", description: "Nome, e-mail e telefone, sem login, com confirmação por e-mail", group: "Evento" },
  { type: "form", label: "Formulário de interesse", description: "Coleta interessados", group: "Evento" },
  { type: "schedule", label: "Programação automática", description: "Lista os eventos publicados", group: "Evento" },
  { type: "countdown", label: "Contagem regressiva", description: "Até uma data", group: "Evento" },
  { type: "spacer", label: "Espaçador", description: "Espaço em branco", group: "Estrutura" },
  { type: "divider", label: "Divisor", description: "Linha decorativa", group: "Estrutura" },
];

export function blockLabel(type: BlockType) {
  return BLOCK_LIBRARY.find((b) => b.type === type)?.label ?? type;
}

export const BLOCK_DEFAULTS: { [K in BlockType]: () => BlockMap[K] } = {
  heading: () => ({ text: "Novo título", level: 2, align: "left" }),
  richtext: () => ({ html: "<p>Escreva aqui o seu texto.</p>" }),
  image: () => ({ url: "", alt: "", ratio: "auto", rounded: true }),
  gallery: () => ({ images: [], mode: "grid", columns: 3 }),
  video: () => ({ url: "" }),
  button: () => ({ label: "Saiba mais", href: "#", variant: "primary", align: "left", size: "md" }),
  links: () => ({ items: [{ title: "Novo link", url: "https://", description: "" }] }),
  eventinfo: () => ({ showMap: true, showCalendar: true }),
  form: () => ({
    title: "Tenho interesse",
    intro: "Deixe seu contato e avisaremos as novidades do festival.",
    successMessage: "Obrigado! Recebemos o seu interesse.",
    fields: { phone: true, city: true, interests: false, heardFrom: true, message: false, newsletter: true },
    interestOptions: [],
    buttonLabel: "Enviar",
  }),
  schedule: () => ({ title: "Programação", limit: 6, showPast: false }),
  countdown: () => ({ useFestival: true, label: "Faltam" }),
  faq: () => ({
    items: [
      { q: "O festival é gratuito?", a: "Escreva aqui a resposta." },
      { q: "Preciso me inscrever?", a: "Escreva aqui a resposta." },
    ],
    openFirst: true,
    single: false,
  }),
  registration: () => ({ title: "Inscreva-se", intro: "Faça login e garanta sua vaga. Você recebe a confirmação por e-mail.", buttonLabel: "Quero me inscrever" }),
  training: () => ({ title: "Formulário de inscrição", intro: "Preencha nome, e-mail e número. Você recebe a confirmação por e-mail.", buttonLabel: "Fazer inscrição", successMessage: "Inscrição recebida! Enviamos a confirmação para o seu e-mail." }),
  news: () => ({ items: [{ title: "Título da notícia", subtitle: "", image: "", url: "https://", source: "" }], columns: 3, featured: true }),
  logos: () => ({ title: "Apoio", items: [], grayscale: false }),
  spacer: () => ({ size: "md" }),
  divider: () => ({ style: "flower" }),
};

export function newBlock<T extends BlockType>(type: T): Block<T> {
  return { id: uid(), type, props: BLOCK_DEFAULTS[type]() } as Block<T>;
}

export function newSection(layout: SectionLayout = "1", blocks: Block[][] = []): Section {
  const cols = layoutCols(layout);
  return {
    id: uid(),
    layout,
    columns: Array.from({ length: cols }, (_, i) => blocks[i] ?? []),
    style: { ...DEFAULT_SECTION_STYLE },
  };
}

/** Ajusta a quantidade de colunas preservando os blocos (excedentes vão para a última coluna). */
export function relayout(section: Section, layout: SectionLayout): Section {
  const cols = layoutCols(layout);
  const columns: Block[][] = Array.from({ length: cols }, (_, i) => [...(section.columns[i] ?? [])]);
  for (let i = cols; i < section.columns.length; i++) columns[cols - 1].push(...section.columns[i]);
  return { ...section, layout, columns };
}

/** Capacitações sempre exibem o formulário de inscrição: se a página não tiver o bloco, ele é acrescentado ao final. */
export function withTrainingForm(content: PageContent): PageContent {
  const has = content.sections.some((s) => s.columns.some((c) => c.some((bl) => bl.type === "training")));
  if (has) return content;
  const section = { ...newSection("1", [[newBlock("training")]]), style: { ...DEFAULT_SECTION_STYLE, padding: "lg" as const, anchor: "inscricao" }, name: "Inscrição" };
  return { ...content, sections: [...content.sections, section] };
}

export function emptyContent(): PageContent {
  return { sections: [] };
}

export function normalizeContent(c: unknown): PageContent {
  const obj = (c ?? {}) as Partial<PageContent>;
  const sections = Array.isArray(obj.sections) ? obj.sections : [];
  return {
    sections: sections.map((s) => ({
      ...s,
      style: { ...DEFAULT_SECTION_STYLE, ...(s.style ?? {}) },
      columns: Array.from({ length: layoutCols(s.layout) }, (_, i) => s.columns?.[i] ?? []),
    })),
  };
}

function sec(layout: SectionLayout, style: Partial<SectionStyle>, cols: Block[][], name?: string): Section {
  return { ...newSection(layout, cols), style: { ...DEFAULT_SECTION_STYLE, ...style }, name };
}
function b<T extends BlockType>(type: T, props: Partial<BlockMap[T]> = {}): Block {
  return { id: uid(), type, props: { ...BLOCK_DEFAULTS[type](), ...props } } as Block;
}

/** Modelos prontos de página. */
export const PAGE_TEMPLATES: { id: string; label: string; description: string; build: (title: string) => PageContent }[] = [
  { id: "blank", label: "Em branco", description: "Comece do zero", build: () => ({ sections: [] }) },
  {
    id: "show",
    label: "Show",
    description: "Capa, sobre o artista, vídeo, data/local e formulário",
    build: (title) => ({
      sections: [
        sec("1", { bgType: "gradient", padding: "lg", align: "center", valign: "center", minHeight: "half", textTone: "light" }, [[
          b("heading", { text: title, level: 1, align: "center" }),
          b("richtext", { html: "<p style=\"text-align: center\">Uma noite de música no Festival da Primavera.</p>" }),
          b("button", { label: "Quero participar", href: "#participar", align: "center", size: "lg" }),
        ]], "Capa"),
        sec("1-1", { padding: "lg" }, [
          [b("heading", { text: "Sobre o show" }), b("richtext", { html: "<p>Conte aqui sobre o artista e o espetáculo.</p>" })],
          [b("video", { url: "" })],
        ], "Sobre"),
        sec("1", { padding: "md", bgType: "color", bgColor: "#ffffff" }, [[b("eventinfo")]], "Quando e onde"),
        sec("1", { padding: "lg", anchor: "participar" }, [[b("form")]], "Formulário"),
      ],
    }),
  },
  {
    id: "oficina",
    label: "Oficina",
    description: "Título, descrição, o que levar, links e inscrição",
    build: (title) => ({
      sections: [
        sec("1", { padding: "lg", bgType: "color", bgColor: "#f3efe4" }, [[
          b("heading", { text: title, level: 1 }),
          b("richtext", { html: "<p>Descreva a oficina, quem ministra e para quem é.</p>" }),
        ]], "Capa"),
        sec("2-1", { padding: "lg" }, [
          [b("heading", { text: "O que você vai aprender", level: 3 }), b("richtext", { html: "<ul><li>Tópico 1</li><li>Tópico 2</li></ul>" })],
          [b("eventinfo", { showMap: false }), b("links", { items: [{ title: "Material de apoio", url: "https://", description: "" }] })],
        ], "Detalhes"),
        sec("1", { padding: "lg" }, [[b("form", { title: "Inscreva-se" })]], "Inscrição"),
      ],
    }),
  },
  {
    id: "capacitacao",
    label: "Capacitação",
    description: "Apresentação, conteúdo, data/local e formulário de inscrição (sem login)",
    build: (title) => ({
      sections: [
        sec("1", { padding: "lg", bgType: "gradient", textTone: "light", minHeight: "half", valign: "center" }, [[
          b("heading", { text: title, level: 1 }),
          b("richtext", { html: "<p>Para quem é, quem ministra e o que se aprende.</p>" }),
          b("button", { label: "Quero me inscrever", href: "#inscricao", size: "lg" }),
        ]], "Capa"),
        sec("2-1", { padding: "lg" }, [
          [b("heading", { text: "Conteúdo", level: 3 }), b("richtext", { html: "<ul><li>Módulo 1</li><li>Módulo 2</li></ul>" })],
          [b("eventinfo", { showMap: false })],
        ], "Detalhes"),
        sec("1", { padding: "lg", anchor: "inscricao" }, [[b("training")]], "Inscrição"),
      ],
    }),
  },
  {
    id: "exposicao",
    label: "Exposição",
    description: "Capa com imagem, texto curatorial e galeria",
    build: (title) => ({
      sections: [
        sec("1", { padding: "lg", bgType: "gradient", textTone: "light", minHeight: "half", valign: "center" }, [[b("heading", { text: title, level: 1 })]], "Capa"),
        sec("1", { padding: "lg" }, [[b("richtext", { html: "<p>Texto curatorial da exposição.</p>" })]], "Texto"),
        sec("1", { padding: "md" }, [[b("gallery", { images: [], mode: "grid", columns: 3 })]], "Galeria"),
        sec("1", { padding: "md" }, [[b("eventinfo")]], "Visitação"),
      ],
    }),
  },
];

/** Conteúdo inicial da página "Início". */
export function defaultHomeContent(): PageContent {
  return {
    sections: [
      sec("1", { bgType: "gradient", padding: "lg", align: "center", valign: "center", minHeight: "screen", textTone: "light" }, [[
        b("heading", { text: "Festival da Primavera", level: 1, align: "center" }),
        b("richtext", { html: "<p style=\"text-align: center\">Música, arte e cultura para celebrar a estação das flores.</p>" }),
        b("countdown", { useFestival: true, label: "Faltam" }),
        b("button", { label: "Quero participar", href: "#contato", align: "center", size: "lg" }),
      ]], "Capa (hero)"),
      sec("1-1", { padding: "lg", anchor: "sobre", valign: "center" }, [
        [b("heading", { text: "Sobre o festival" }), b("richtext", { html: "<p>O Festival da Primavera reúne artistas, oficinas e apresentações em uma celebração aberta a todos. Em breve divulgaremos local, datas e horários.</p>" })],
        [b("image", { url: "", alt: "Foto do festival", ratio: "4/3" })],
      ], "Sobre"),
      sec("1", { padding: "lg", bgType: "color", bgColor: "#ffffff", anchor: "programacao" }, [[b("schedule", { title: "Programação" })]], "Programação"),
      sec("1", { padding: "md" }, [[b("eventinfo", { useFestival: true })]], "Quando e onde"),
      sec("1", { padding: "lg", anchor: "contato" }, [[b("form")]], "Formulário"),
    ],
  };
}
