/**
 * Modelo de certificado editável (editor visual do ADM) e preenchimento das variáveis.
 * Posições em % da página; tamanho da fonte em milésimos da largura (40 = 4% da largura),
 * então o certificado fica idêntico em qualquer tamanho de tela e no PDF.
 */

export type CertAlign = "left" | "center" | "right";
/** "heading" e "body" = fontes de títulos e de textos do tema do site; ou o nome de uma fonte do catálogo. */
export type CertFont = string;

export interface CertBlock {
  id: string;
  text: string;
  x: number; // % da largura (borda esquerda da caixa)
  y: number; // % da altura (topo da caixa)
  w: number; // % da largura
  font: CertFont;
  size: number; // milésimos da largura da página
  color: string;
  bold?: boolean;
  italic?: boolean;
  upper?: boolean;
  align: CertAlign;
}

export interface CertTemplate {
  orientation: "landscape" | "portrait";
  background?: string | null; // imagem de fundo (URL)
  bgColor?: string;
  frame?: string | null; // cor da moldura (vazio = sem moldura)
  blocks: CertBlock[];
  qr: { enabled: boolean; x: number; y: number; size: number; label?: string };
}

export const CERT_VARIABLES: { key: string; label: string; sample: string }[] = [
  { key: "nome", label: "Nome do participante", sample: "Maria da Silva Santos" },
  { key: "cpf", label: "CPF", sample: "123.456.789-09" },
  { key: "email", label: "E-mail", sample: "maria@email.com" },
  { key: "telefone", label: "Telefone", sample: "(82) 99999-0000" },
  { key: "evento", label: "Nome do evento", sample: "Capacitação para agentes locais" },
  { key: "data", label: "Data do evento", sample: "15 de novembro de 2026" },
  { key: "local", label: "Local", sample: "Centro Cultural, Maceió" },
  { key: "carga_horaria", label: "Carga horária (horas)", sample: "8" },
  { key: "codigo", label: "Código de validação", sample: "A1B2C3D4E5" },
  { key: "festival", label: "Nome do festival", sample: "Festival Primavera Cultural" },
];

const id = () => Math.random().toString(36).slice(2, 10);

export function newCertBlock(partial: Partial<CertBlock> = {}): CertBlock {
  return { id: id(), text: "Novo texto", x: 20, y: 45, w: 60, font: "body", size: 22, color: "#1f2a24", align: "center", ...partial };
}

/** Modelo padrão (o mesmo visual do certificado original do festival). */
export function defaultCertTemplate(primary = "#2f6f4f"): CertTemplate {
  return {
    orientation: "landscape",
    background: null,
    bgColor: "#fbf8f2",
    frame: primary,
    blocks: [
      { id: "festival", text: "{{festival}}", x: 10, y: 9, w: 80, font: "body", size: 17, color: primary, bold: true, upper: true, align: "center" },
      { id: "titulo", text: "Certificado", x: 10, y: 15, w: 80, font: "heading", size: 72, color: primary, bold: true, align: "center" },
      { id: "intro", text: "Certificamos que", x: 10, y: 33, w: 80, font: "body", size: 22, color: "#1f2a24", align: "center" },
      { id: "nome", text: "{{nome}}", x: 8, y: 39, w: 84, font: "heading", size: 50, color: "#1f2a24", bold: true, align: "center" },
      {
        id: "texto",
        text: "[[portador(a) do CPF {{cpf}}, ]]participou de {{evento}}[[, realizado em {{data}}]][[, {{local}}]][[, com carga horária de {{carga_horaria}} horas]].",
        x: 13,
        y: 52,
        w: 74,
        font: "body",
        size: 21,
        color: "#1f2a24",
        align: "center",
      },
      { id: "assinatura", text: "______________________________\nCoordenação do {{festival}}", x: 30, y: 72, w: 40, font: "body", size: 15, color: "#1f2a24", align: "center" },
      { id: "codigo", text: "Código de validação: {{codigo}}", x: 6, y: 89, w: 50, font: "body", size: 12, color: "#555555", align: "left" },
    ],
    qr: { enabled: true, x: 83, y: 72, size: 11, label: "Valide aqui" },
  };
}

/** Garante um modelo completo (para dados antigos ou incompletos). */
export function normalizeTemplate(t: Partial<CertTemplate> | null | undefined, primary?: string): CertTemplate {
  const base = defaultCertTemplate(primary);
  if (!t || !Array.isArray(t.blocks)) return base;
  return { ...base, ...t, qr: { ...base.qr, ...(t.qr ?? {}) }, blocks: t.blocks.map((b) => ({ ...newCertBlock(), ...b })) };
}

export interface CertPerson {
  name: string;
  cpf?: string | null;
  email?: string | null;
  phone?: string | null;
  code: string;
}
export interface CertEvent {
  title: string;
  starts_at?: string | null;
  ends_at?: string | null;
  location?: string | null;
  hours?: number | string | null;
}

export function formatCpf(cpf?: string | null) {
  const d = (cpf ?? "").replace(/\D/g, "");
  return d.length === 11 ? `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}` : d;
}

/** CPF parcialmente oculto, para listas no painel (LGPD). */
export function maskCpf(cpf?: string | null) {
  const d = (cpf ?? "").replace(/\D/g, "");
  return d.length === 11 ? `***.${d.slice(3, 6)}.${d.slice(6, 9)}-**` : "";
}

/** Confere os dígitos verificadores do CPF. */
export function isValidCpf(cpf: string) {
  const d = cpf.replace(/\D/g, "");
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  const dv = (n: number) => {
    let s = 0;
    for (let i = 0; i < n; i++) s += Number(d[i]) * (n + 1 - i);
    const r = (s * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return dv(9) === Number(d[9]) && dv(10) === Number(d[10]);
}

const TZ = "America/Sao_Paulo";
function longDate(iso: string) {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: TZ, day: "numeric", month: "long", year: "numeric" }).format(new Date(iso));
}
function eventDate(start?: string | null, end?: string | null) {
  if (!start) return "";
  const a = longDate(start);
  if (!end) return a;
  const b = longDate(end);
  return a === b ? a : `${a} a ${b}`;
}

export function certValues(person: CertPerson, event: CertEvent, festival: string): Record<string, string> {
  const hours = event.hours != null && Number(event.hours) > 0 ? String(Number(event.hours)).replace(".", ",") : "";
  return {
    nome: person.name?.trim() ?? "",
    cpf: formatCpf(person.cpf),
    email: person.email ?? "",
    telefone: person.phone ?? "",
    evento: event.title ?? "",
    data: eventDate(event.starts_at, event.ends_at),
    local: event.location ?? "",
    carga_horaria: hours,
    codigo: (person.code ?? "").toUpperCase(),
    festival,
  };
}

export const SAMPLE_VALUES: Record<string, string> = Object.fromEntries(CERT_VARIABLES.map((v) => [v.key, v.sample]));

/**
 * Troca {{variável}} pelo valor. Trechos entre [[ ]] somem quando alguma variável
 * dentro deles está vazia (ex.: "[[, com carga horária de {{carga_horaria}} horas]]").
 */
export function fillText(text: string, values: Record<string, string>) {
  const sub = (s: string) => s.replace(/\{\{\s*([a-z_]+)\s*\}\}/gi, (_, k: string) => values[k.toLowerCase()] ?? "");
  const withOptional = text.replace(/\[\[([\s\S]*?)\]\]/g, (_, inner: string) => {
    const keys = [...inner.matchAll(/\{\{\s*([a-z_]+)\s*\}\}/gi)].map((m) => m[1].toLowerCase());
    return keys.every((k) => (values[k] ?? "").trim()) ? sub(inner) : "";
  });
  return sub(withOptional).replace(/[ \t]{2,}/g, " ");
}

/** Fontes do catálogo usadas pelo modelo (para carregar no Google Fonts). */
export function templateFonts(t: CertTemplate) {
  return [...new Set(t.blocks.map((b) => b.font).filter((f) => f !== "heading" && f !== "body"))];
}

/** Nome de arquivo seguro: "Maria-da-Silva.pdf". */
export function certFileName(name: string) {
  const base = name.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return `${base || "certificado"}.pdf`;
}
