"use client";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";

export function Field({ label, help, children }: { label: string; help?: string; children: React.ReactNode }) {
  return (
    <label className="adm-label">
      {label}
      {children}
      {help && <span className="adm-help">{help}</span>}
    </label>
  );
}

export function Text({ label, value, onChange, placeholder, help, multiline, type = "text" }: { label: string; value?: string | null; onChange: (v: string) => void; placeholder?: string; help?: string; multiline?: boolean; type?: string }) {
  return (
    <Field label={label} help={help}>
      {multiline ? (
        <textarea value={value ?? ""} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={3} className="adm-input" />
      ) : (
        <input type={type} value={value ?? ""} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="adm-input" />
      )}
    </Field>
  );
}

export function NumberField({ label, value, onChange, min, max }: { label: string; value?: number; onChange: (v: number) => void; min?: number; max?: number }) {
  return (
    <Field label={label}>
      <input type="number" value={value ?? ""} min={min} max={max} onChange={(e) => onChange(Number(e.target.value))} className="adm-input" />
    </Field>
  );
}

export function Select<T extends string | number>({ label, value, onChange, options, help }: { label: string; value: T; onChange: (v: T) => void; options: readonly (readonly [T, string])[]; help?: string }) {
  return (
    <Field label={label} help={help}>
      <select
        value={String(value)}
        onChange={(e) => {
          const raw = e.target.value;
          const opt = options.find(([v]) => String(v) === raw);
          if (opt) onChange(opt[0]);
        }}
        className="adm-input"
      >
        {options.map(([v, l]) => (
          <option key={String(v)} value={String(v)}>{l}</option>
        ))}
      </select>
    </Field>
  );
}

export function Segmented<T extends string>({ label, value, onChange, options }: { label: string; value: T; onChange: (v: T) => void; options: readonly (readonly [T, React.ReactNode])[] }) {
  return (
    <div className="adm-label">
      {label}
      <div className="flex rounded-lg bg-zinc-100 p-0.5">
        {options.map(([v, l]) => (
          <button type="button" key={v} onClick={() => onChange(v)} className={`flex flex-1 items-center justify-center rounded-md px-2 py-1 text-xs ${value === v ? "bg-white font-semibold shadow-sm" : "text-zinc-600"}`}>
            {l}
          </button>
        ))}
      </div>
    </div>
  );
}

export function Toggle({ label, checked, onChange, help }: { label: string; checked?: boolean; onChange: (v: boolean) => void; help?: string }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 text-sm">
      <span className="relative mt-0.5 inline-flex">
        <input type="checkbox" checked={!!checked} onChange={(e) => onChange(e.target.checked)} className="peer sr-only" />
        <span className="h-5 w-9 rounded-full bg-zinc-300 transition peer-checked:bg-brand-500" />
        <span className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition peer-checked:translate-x-4" />
      </span>
      <span className="flex flex-col">
        <span className="font-medium text-zinc-700">{label}</span>
        {help && <span className="adm-help">{help}</span>}
      </span>
    </label>
  );
}

export function ColorInput({ label, value, onChange, placeholder }: { label: string; value?: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <Field label={label}>
      <div className="flex items-center gap-2">
        <input type="color" value={value || placeholder || "#ffffff"} onChange={(e) => onChange(e.target.value)} className="h-9 w-12 cursor-pointer rounded border border-zinc-300 bg-white p-0.5" />
        <input value={value ?? ""} onChange={(e) => onChange(e.target.value)} placeholder={placeholder ?? "padrão"} className="adm-input font-mono text-xs" />
        {value && <button type="button" className="text-xs text-zinc-500 hover:underline" onClick={() => onChange("")}>limpar</button>}
      </div>
    </Field>
  );
}

/** Converte ISO ⇄ valor de <input type="datetime-local"> no fuso do navegador. */
export function toLocalInput(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const off = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - off).toISOString().slice(0, 16);
}
export function fromLocalInput(v: string) {
  return v ? new Date(v).toISOString() : "";
}

export function DateTime({ label, value, onChange, help }: { label: string; value?: string | null; onChange: (iso: string) => void; help?: string }) {
  return (
    <Field label={label} help={help}>
      <input type="datetime-local" value={toLocalInput(value)} onChange={(e) => onChange(fromLocalInput(e.target.value))} className="adm-input" />
    </Field>
  );
}

export function ListEditor<T>({ label, items, onChange, create, render, addLabel = "Adicionar" }: { label: string; items: T[]; onChange: (items: T[]) => void; create: () => T; render: (item: T, set: (v: T) => void, i: number) => React.ReactNode; addLabel?: string }) {
  const move = (i: number, d: number) => {
    const j = i + d;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium text-zinc-700">{label}</span>
      {items.map((it, i) => (
        <div key={i} className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
          <div className="mb-2 flex items-center justify-between text-xs text-zinc-500">
            <span>#{i + 1}</span>
            <span className="flex gap-1">
              <button type="button" onClick={() => move(i, -1)} className="rounded p-1 hover:bg-zinc-200" aria-label="Subir"><ArrowUp size={13} /></button>
              <button type="button" onClick={() => move(i, 1)} className="rounded p-1 hover:bg-zinc-200" aria-label="Descer"><ArrowDown size={13} /></button>
              <button type="button" onClick={() => onChange(items.filter((_, k) => k !== i))} className="rounded p-1 text-red-600 hover:bg-red-50" aria-label="Remover"><Trash2 size={13} /></button>
            </span>
          </div>
          <div className="flex flex-col gap-2">{render(it, (v) => onChange(items.map((x, k) => (k === i ? v : x))), i)}</div>
        </div>
      ))}
      <button type="button" className="adm-btn-secondary adm-btn-sm self-start" onClick={() => onChange([...items, create()])}><Plus size={14} /> {addLabel}</button>
    </div>
  );
}
