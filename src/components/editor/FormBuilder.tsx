"use client";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import type { FormCustomField, FormStdField, TrainingFormProps } from "@/shared/types";
import { FORM_FIELD_TYPES, fieldKey, formStdFields } from "@/shared/forms";
import { Text, Toggle } from "./fields";

/**
 * Configuração do formulário de inscrição: campos padrão (liga/desliga e obrigatório)
 * e campos extras criados à vontade. As respostas aparecem em Inscrições e viram variáveis do certificado.
 */
export function FormBuilder({ props: p, onChange }: { props: TrainingFormProps; onChange: (patch: Partial<TrainingFormProps>) => void }) {
  const std = formStdFields(p);
  const custom = p.custom ?? [];
  const setStd = (k: keyof typeof std, v: Partial<FormStdField>) => onChange({ fields: { ...std, [k]: { ...std[k], ...v } } });
  const setCustom = (list: FormCustomField[]) => onChange({ custom: list });
  const update = (i: number, patch: Partial<FormCustomField>) => setCustom(custom.map((c, j) => (j === i ? { ...c, ...patch } : c)));
  const move = (i: number, d: number) => {
    const j = i + d;
    if (j < 0 || j >= custom.length) return;
    const list = [...custom];
    [list[i], list[j]] = [list[j], list[i]];
    setCustom(list);
  };

  const row = (k: keyof typeof std, label: string) => (
    <div className="flex items-center justify-between gap-2">
      <Toggle label={label} checked={std[k].on} onChange={(on) => setStd(k, { on })} />
      {std[k].on && (
        <label className="flex items-center gap-1.5 text-xs text-zinc-600">
          <input type="checkbox" className="accent-brand-500" checked={!!std[k].required} onChange={(e) => setStd(k, { required: e.target.checked })} /> obrigatório
        </label>
      )}
    </div>
  );

  return (
    <>
      <Text label="Título" value={p.title} onChange={(v) => onChange({ title: v })} />
      <Text label="Texto" multiline value={p.intro} onChange={(v) => onChange({ intro: v })} />
      <Text label="Texto do botão" value={p.buttonLabel} onChange={(v) => onChange({ buttonLabel: v })} />
      <Text label="Mensagem após enviar" multiline value={p.successMessage} onChange={(v) => onChange({ successMessage: v })} />

      <div className="flex flex-col gap-2 rounded-lg bg-zinc-50 p-3">
        <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Campos padrão</span>
        <span className="text-xs text-zinc-500">Nome completo e e-mail são sempre pedidos (o e-mail recebe a confirmação e o certificado).</span>
        {row("cpf", "CPF")}
        {row("phone", "Telefone / WhatsApp")}
        {row("address", "Endereço (CEP preenche o resto)")}
      </div>

      <div className="flex flex-col gap-2 rounded-lg bg-zinc-50 p-3">
        <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Campos extras ({custom.length})</span>
        {custom.map((c, i) => (
          <div key={c.key} className="flex flex-col gap-2 rounded-lg border border-zinc-200 bg-white p-2.5">
            <input
              value={c.label}
              onChange={(e) => update(i, { label: e.target.value })}
              // Ao terminar de digitar a pergunta pela 1ª vez, a chave (variável do certificado) segue o texto e depois fica fixa.
              onBlur={() => !c.keyLocked && c.label.trim() && update(i, { key: fieldKey(c.label, custom.filter((_, j) => j !== i).map((x) => x.key)), keyLocked: true })}
              placeholder="Pergunta"
              className="adm-input"
            />
            <div className="flex flex-wrap items-center gap-2">
              <select value={c.type} onChange={(e) => update(i, { type: e.target.value as FormCustomField["type"] })} className="adm-input !w-auto !py-1 text-xs">
                {FORM_FIELD_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
              <label className="flex items-center gap-1.5 text-xs text-zinc-600">
                <input type="checkbox" className="accent-brand-500" checked={!!c.required} onChange={(e) => update(i, { required: e.target.checked })} /> obrigatório
              </label>
              <span className="ml-auto flex gap-1">
                <button type="button" className="adm-btn-ghost adm-btn-sm" onClick={() => move(i, -1)} title="Subir"><ArrowUp size={13} /></button>
                <button type="button" className="adm-btn-ghost adm-btn-sm" onClick={() => move(i, 1)} title="Descer"><ArrowDown size={13} /></button>
                <button type="button" className="adm-btn-ghost adm-btn-sm text-red-600" onClick={() => confirm(`Excluir o campo “${c.label}”? As respostas já recebidas continuam guardadas.`) && setCustom(custom.filter((_, j) => j !== i))} title="Excluir">
                  <Trash2 size={13} />
                </button>
              </span>
            </div>
            {(c.type === "select" || c.type === "checkbox") && (
              <textarea
                rows={3}
                value={(c.options ?? []).join("\n")}
                onChange={(e) => update(i, { options: e.target.value.split("\n").map((o) => o.trim()).filter(Boolean) })}
                placeholder={"Opções, uma por linha"}
                className="adm-input text-xs"
              />
            )}
            <span className="text-[11px] text-zinc-400">No certificado: <code>{`{{${c.key}}}`}</code></span>
          </div>
        ))}
        <button
          type="button"
          className="adm-btn-secondary adm-btn-sm self-start"
          onClick={() => {
            const label = "Nova pergunta";
            setCustom([...custom, { key: fieldKey(label, custom.map((c) => c.key)), label, type: "text", required: false }]);
          }}
        >
          <Plus size={14} /> Adicionar campo
        </button>
      </div>
      <span className="adm-help">Inscrições sempre abertas, sem limite de vagas. As respostas aparecem em Inscrições (painel). O mesmo e-mail pode se inscrever em páginas diferentes; repetir na mesma página atualiza a inscrição.</span>
    </>
  );
}
