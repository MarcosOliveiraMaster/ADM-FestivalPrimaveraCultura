"use client";
import { useState } from "react";
import type { FormCustomField, TrainingFormProps } from "../types";
import { isValidCpf } from "../certificate";
import { formStdFields, type Address } from "../forms";

const UFS = "AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO".split(" ");

/**
 * Formulário de inscrição sem login (eventos, cortejos e capacitações).
 * Nome e e-mail sempre; CPF, telefone e endereço conforme o editor; campos extras criados no editor.
 * Envia para /api/capacitacao do site público.
 */
export function TrainingForm({ props: p, pageId, formId, preview }: { props: TrainingFormProps; pageId?: string; formId?: string; preview?: boolean }) {
  const [state, setState] = useState<"idle" | "sending" | "done">("idle");
  const [error, setError] = useState<string | null>(null);
  const [addr, setAddr] = useState<Address>({});
  const [cepState, setCepState] = useState<"idle" | "loading" | "notfound">("idle");
  const f = formStdFields(p);
  const custom = p.custom ?? [];

  async function lookupCep(raw: string) {
    const cep = raw.replace(/\D/g, "");
    if (cep.length !== 8 || preview) return;
    setCepState("loading");
    try {
      const r = await fetch(`https://viacep.com.br/ws/${cep}/json/`, { signal: AbortSignal.timeout(5000) });
      const j = await r.json();
      if (j.erro) return setCepState("notfound");
      // Preenche só o que estiver vazio; tudo continua editável.
      setAddr((a) => ({ ...a, rua: a.rua || j.logradouro || "", bairro: a.bairro || j.bairro || "", cidade: a.cidade || j.localidade || "", uf: a.uf || j.uf || "" }));
      setCepState("idle");
    } catch {
      setCepState("idle");
    }
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (preview) return;
    const fd = new FormData(e.currentTarget);
    const cpf = String(fd.get("cpf") ?? "").replace(/\D/g, "");
    if (cpf && !isValidCpf(cpf)) {
      setError("CPF inválido. Confira os números.");
      return;
    }
    const answers: Record<string, string | string[]> = {};
    for (const c of custom) {
      if (c.type === "checkbox") {
        const v = fd.getAll(`c_${c.key}`).map(String);
        if (c.required && !v.length) {
          setError(`Marque ao menos uma opção em “${c.label}”.`);
          return;
        }
        if (v.length) answers[c.key] = v;
      } else {
        const v = String(fd.get(`c_${c.key}`) ?? "").trim();
        if (v) answers[c.key] = v;
      }
    }
    setState("sending");
    setError(null);
    try {
      const res = await fetch("/api/capacitacao", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          page_id: pageId,
          form_id: formId,
          name: String(fd.get("name") ?? ""),
          email: String(fd.get("email") ?? ""),
          phone: String(fd.get("phone") ?? ""),
          cpf,
          address: f.address.on ? addr : null,
          answers,
          consent: fd.get("consent") === "on",
          website: String(fd.get("website") ?? ""),
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Não foi possível enviar.");
      setState("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível enviar.");
      setState("idle");
    }
  }

  if (state === "done")
    return (
      <div className="fp-card flex flex-col items-start gap-2 text-left">
        <div className="fp-reg-ok">✓ Inscrição recebida</div>
        <p>{p.successMessage || "Enviamos a confirmação para o seu e-mail."}</p>
      </div>
    );

  const req = (on?: boolean) => (on ? "" : " (opcional)");
  const setA = (k: keyof Address) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setAddr((a) => ({ ...a, [k]: e.target.value }));

  return (
    <form onSubmit={onSubmit} className="fp-card fp-form flex flex-col gap-4 text-left">
      {p.title && <h2 className="fp-heading fp-h3">{p.title}</h2>}
      {p.intro && <p className="opacity-80">{p.intro}</p>}
      <label>Nome completo<input name="name" required minLength={2} autoComplete="name" /></label>
      <div className="grid gap-4 @xl:grid-cols-2 [&_label]:min-w-0">
        <label>E-mail<input name="email" type="email" required autoComplete="email" /></label>
        {f.phone.on && (
          <label>
            Telefone / WhatsApp{req(f.phone.required)}
            <input name="phone" type="tel" required={f.phone.required} autoComplete="tel" placeholder="(82) 9 0000-0000" />
          </label>
        )}
        {f.cpf.on && (
          <label>
            CPF{req(f.cpf.required)}
            <input name="cpf" inputMode="numeric" required={f.cpf.required} autoComplete="off" placeholder="000.000.000-00" maxLength={14} onChange={(e) => (e.currentTarget.value = maskCpfInput(e.currentTarget.value))} />
          </label>
        )}
      </div>

      {f.address.on && (
        <fieldset className="flex min-w-0 flex-col gap-3 [&_label]:min-w-0 [&_input]:w-full [&_select]:w-full">
          <legend className="mb-1 font-semibold">Endereço{req(f.address.required)}</legend>
          <div className="grid gap-3 @xl:grid-cols-[minmax(0,10rem)_minmax(0,1fr)]">
            <label>
              CEP
              <input
                inputMode="numeric"
                required={f.address.required}
                value={addr.cep ?? ""}
                placeholder="00000-000"
                maxLength={9}
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, "").slice(0, 8).replace(/^(\d{5})(\d)/, "$1-$2");
                  setAddr((a) => ({ ...a, cep: v }));
                  if (v.replace(/\D/g, "").length === 8) lookupCep(v);
                }}
              />
              <span className="text-xs opacity-60">{cepState === "loading" ? "Buscando endereço…" : cepState === "notfound" ? "CEP não encontrado — preencha à mão." : "Preenche rua, bairro e cidade automaticamente."}</span>
            </label>
            <label>Rua<input required={f.address.required} value={addr.rua ?? ""} onChange={setA("rua")} autoComplete="address-line1" /></label>
          </div>
          <div className="grid gap-3 @xl:grid-cols-[minmax(0,8rem)_minmax(0,1fr)_minmax(0,1fr)]">
            <label>Número<input required={f.address.required} value={addr.numero ?? ""} onChange={setA("numero")} /></label>
            <label>Complemento<input value={addr.complemento ?? ""} onChange={setA("complemento")} autoComplete="address-line2" /></label>
            <label>Bairro<input required={f.address.required} value={addr.bairro ?? ""} onChange={setA("bairro")} /></label>
          </div>
          <div className="grid gap-3 @xl:grid-cols-[minmax(0,1fr)_minmax(0,8rem)]">
            <label>Cidade<input required={f.address.required} value={addr.cidade ?? ""} onChange={setA("cidade")} autoComplete="address-level2" /></label>
            <label>
              UF
              <select required={f.address.required} value={addr.uf ?? ""} onChange={setA("uf")}>
                <option value="" />
                {UFS.map((u) => (
                  <option key={u}>{u}</option>
                ))}
              </select>
            </label>
          </div>
        </fieldset>
      )}

      {custom.map((c) => (
        <CustomField key={c.key} field={c} />
      ))}

      <input name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
      <label className="fp-check"><input type="checkbox" name="consent" required /> Autorizo o uso dos meus dados para a organização e a emissão do certificado (LGPD).</label>
      {error && <p className="text-sm font-semibold text-red-700" role="alert">{error}</p>}
      <button type="submit" disabled={preview || state === "sending"} className="fp-btn fp-btn-primary self-start">
        {state === "sending" ? "Enviando…" : p.buttonLabel || "Fazer inscrição"}
      </button>
    </form>
  );
}

function CustomField({ field: c }: { field: FormCustomField }) {
  const name = `c_${c.key}`;
  const label = `${c.label}${c.required ? "" : " (opcional)"}`;
  if (c.type === "checkbox")
    return (
      <fieldset className="flex flex-col gap-1">
        <legend className="mb-1">{label}</legend>
        <div className="flex flex-wrap gap-x-5 gap-y-1">
          {(c.options ?? []).map((o) => (
            <label key={o} className="fp-check"><input type="checkbox" name={name} value={o} /> {o}</label>
          ))}
        </div>
      </fieldset>
    );
  if (c.type === "select")
    return (
      <label>
        {label}
        <select name={name} required={c.required} defaultValue="">
          <option value="" disabled>Escolha…</option>
          {(c.options ?? []).map((o) => (
            <option key={o}>{o}</option>
          ))}
        </select>
      </label>
    );
  if (c.type === "textarea") return <label>{label}<textarea name={name} required={c.required} rows={3} maxLength={2000} /></label>;
  return (
    <label>
      {label}
      <input name={name} type={c.type === "number" ? "number" : c.type === "date" ? "date" : "text"} required={c.required} maxLength={c.type === "text" ? 300 : undefined} />
    </label>
  );
}

function maskCpfInput(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  return d.replace(/^(\d{3})(\d)/, "$1.$2").replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3").replace(/\.(\d{3})(\d{1,2})$/, ".$1-$2");
}
