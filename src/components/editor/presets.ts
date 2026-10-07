import type { Block, BlockMap, BlockType, Section, SectionLayout, SectionStyle } from "@/shared/types";
import { BLOCK_DEFAULTS, DEFAULT_SECTION_STYLE, newSection, uid } from "@/shared/blocks";

function b<T extends BlockType>(type: T, props: Partial<BlockMap[T]> = {}): Block {
  return { id: uid(), type, props: { ...BLOCK_DEFAULTS[type](), ...props } } as Block;
}
function sec(name: string, layout: SectionLayout, style: Partial<SectionStyle>, cols: Block[][]): Section {
  return { ...newSection(layout, cols), name, style: { ...DEFAULT_SECTION_STYLE, ...style } };
}

export const SECTION_PRESETS: { id: string; label: string; description: string; build: () => Section }[] = [
  {
    id: "capa",
    label: "Capa com fundo",
    description: "Título grande, texto e botão sobre imagem",
    build: () =>
      sec("Capa", "1", { bgType: "image", overlay: 45, padding: "lg", align: "center", valign: "center", minHeight: "half" }, [[
        b("heading", { text: "Título da página", level: 1, align: "center" }),
        b("richtext", { html: "<p style=\"text-align: center\">Uma frase curta de apresentação.</p>" }),
        b("button", { label: "Quero participar", href: "#contato", align: "center", size: "lg" }),
      ]]),
  },
  {
    id: "texto-imagem",
    label: "Texto + imagem",
    description: "Duas colunas: texto de um lado, foto do outro",
    build: () =>
      sec("Texto e imagem", "1-1", { padding: "lg", valign: "center" }, [
        [b("heading", { text: "Título" }), b("richtext"), b("button", { variant: "outline" })],
        [b("image", { ratio: "4/3" })],
      ]),
  },
  {
    id: "tres-colunas",
    label: "Três destaques",
    description: "Três colunas com imagem, título e texto",
    build: () =>
      sec("Destaques", "1-1-1", { padding: "lg" }, [0, 1, 2].map(() => [b("image", { ratio: "4/3" }), b("heading", { text: "Destaque", level: 3 }), b("richtext", { html: "<p>Descrição curta.</p>" })])),
  },
  { id: "galeria", label: "Galeria de fotos", description: "Grade de imagens com ampliação", build: () => sec("Galeria", "1", { padding: "lg" }, [[b("heading", { text: "Galeria", align: "center" }), b("gallery")]]) },
  { id: "video", label: "Vídeo", description: "Vídeo do YouTube/Instagram centralizado", build: () => sec("Vídeo", "1", { padding: "lg", align: "center" }, [[b("heading", { text: "Assista", align: "center" }), b("video")]]) },
  { id: "programacao", label: "Programação", description: "Lista automática dos eventos", build: () => sec("Programação", "1", { padding: "lg", bgType: "color", bgColor: "#ffffff" }, [[b("schedule")]]) },
  { id: "info", label: "Data, hora e local", description: "Agenda com mapa", build: () => sec("Quando e onde", "1", { padding: "md" }, [[b("eventinfo")]]) },
  { id: "inscricao", label: "Inscrição no evento", description: "Login, confirmação por e-mail e Google Agenda", build: () => sec("Inscrição", "1", { padding: "lg", anchor: "inscricao" }, [[b("registration")]]) },
  { id: "galeria-exclusiva", label: "Galeria exclusiva", description: "Fotos e vídeos só para quem fez login", build: () => sec("Galeria exclusiva", "1", { padding: "lg", audience: "members" }, [[b("heading", { text: "Galeria exclusiva", align: "center" }), b("gallery"), b("video")]]) },
  { id: "formulario", label: "Formulário de interesse", description: "Coleta contatos de interessados", build: () => sec("Formulário", "1", { padding: "lg", anchor: "contato" }, [[b("form")]]) },
  { id: "faq", label: "Perguntas frequentes", description: "Perguntas e respostas", build: () => sec("Perguntas", "1", { padding: "lg" }, [[b("heading", { text: "Perguntas frequentes" }), b("faq")]]) },
  { id: "noticias", label: "Notícias", description: "Cards com link para matérias externas", build: () => sec("Notícias", "1", { padding: "lg" }, [[b("heading", { text: "Notícias" }), b("news")]]) },
  { id: "links", label: "Links úteis", description: "Lista de links com títulos", build: () => sec("Links", "1", { padding: "lg" }, [[b("heading", { text: "Links úteis" }), b("links")]]) },
  { id: "apoio", label: "Patrocinadores", description: "Logos de apoiadores", build: () => sec("Apoio", "1", { padding: "md", bgType: "color", bgColor: "#ffffff" }, [[b("logos")]]) },
];
