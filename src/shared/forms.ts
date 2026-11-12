import type { FormCustomField, FormStdField, PageContent, TrainingFormProps } from "./types";

/** Endereço da inscrição (preenchido pelo CEP e editável). */
export interface Address {
  cep?: string;
  rua?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
}

export const FORM_FIELD_TYPES: { value: FormCustomField["type"]; label: string }[] = [
  { value: "text", label: "Texto curto" },
  { value: "textarea", label: "Texto longo" },
  { value: "number", label: "Número" },
  { value: "date", label: "Data" },
  { value: "select", label: "Escolha única (lista)" },
  { value: "checkbox", label: "Múltipla escolha (caixinhas)" },
];

/** Chaves reservadas (variáveis fixas do certificado e campos padrão). */
export const RESERVED_KEYS = ["nome", "cpf", "email", "telefone", "evento", "data", "local", "carga_horaria", "codigo", "festival", "endereco", "cidade", "uf", "cep"];

/** Campos padrão do formulário (formulários antigos: telefone obrigatório, CPF opcional). */
export function formStdFields(p: TrainingFormProps): { cpf: FormStdField; phone: FormStdField; address: FormStdField } {
  return {
    cpf: { on: true, required: false, ...(p.fields?.cpf ?? {}) },
    phone: { on: true, required: true, ...(p.fields?.phone ?? {}) },
    address: { on: false, required: false, ...(p.fields?.address ?? {}) },
  };
}

/** Gera uma chave a partir do rótulo: "Instituição de ensino" → "instituicao_de_ensino". */
export function fieldKey(label: string, taken: string[] = []) {
  const base =
    label
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 40) || "campo";
  let key = RESERVED_KEYS.includes(base) ? `${base}_extra` : base;
  let n = 2;
  while (taken.includes(key)) key = `${base}_${n++}`;
  return key;
}

export function formatAddress(a?: Address | null) {
  if (!a) return "";
  const street = [a.rua, a.numero].filter(Boolean).join(", ");
  const line = [street, a.complemento, a.bairro].filter(Boolean).join(" - ");
  const city = [a.cidade, a.uf].filter(Boolean).join("/");
  return [line, city, a.cep ? `CEP ${a.cep}` : ""].filter(Boolean).join(" · ");
}

export function answerText(v: unknown) {
  if (Array.isArray(v)) return v.join(", ");
  return v == null ? "" : String(v);
}

/** Formulários de inscrição (blocos) de uma página, com id e campos extras. */
export function pageForms(content: PageContent | null | undefined): { id: string; title: string; props: TrainingFormProps }[] {
  const out: { id: string; title: string; props: TrainingFormProps }[] = [];
  for (const s of content?.sections ?? [])
    for (const c of s.columns)
      for (const b of c)
        if (b.type === "training" || b.type === "registration") {
          const props = b.props as TrainingFormProps;
          out.push({ id: b.id, title: props.title || "Formulário de inscrição", props });
        }
  return out;
}

/** Id fixo do formulário acrescentado automaticamente às capacitações sem formulário. */
export const AUTO_FORM_ID = "auto-inscricao";
