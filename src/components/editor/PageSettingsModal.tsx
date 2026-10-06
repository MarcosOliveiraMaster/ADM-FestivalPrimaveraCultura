"use client";
import { useState, useTransition } from "react";
import { Modal } from "../Modal";
import { MediaField } from "../MediaLibrary";
import { ColorInput, DateTime, NumberField, Select, Text, Toggle } from "./fields";
import { slugify } from "@/shared/format";
import { updatePageMeta, type PageMeta } from "@/app/(painel)/paginas/actions";
import type { EditorPage } from "./Editor";

export function PageSettingsModal({ open, onClose, page, onSaved }: { open: boolean; onClose: () => void; page: EditorPage; onSaved: (m: PageMeta) => void }) {
  const [m, setM] = useState<PageMeta>(page);
  const [lastOpen, setLastOpen] = useState(false);
  if (open !== lastOpen) {
    setLastOpen(open);
    if (open) setM({ title: page.title, slug: page.slug, kind: page.kind, category: page.category, starts_at: page.starts_at, ends_at: page.ends_at, location: page.location, cover_url: page.cover_url, show_in_nav: page.show_in_nav, seo: page.seo ?? {}, color: page.color, registration_enabled: page.registration_enabled, capacity: page.capacity, certificate_hours: page.certificate_hours });
  }
  const [error, setError] = useState<string | null>(null);
  const [busy, start] = useTransition();
  const set = (patch: Partial<PageMeta>) => setM((x) => ({ ...x, ...patch }));
  const home = page.kind === "home";

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Configurações da página"
      wide
      footer={
        <>
          {error && <span className="mr-auto self-center text-sm text-red-600">{error}</span>}
          <button type="button" className="adm-btn-secondary" onClick={onClose}>Cancelar</button>
          <button
            type="button"
            className="adm-btn-primary"
            disabled={busy}
            onClick={() =>
              start(async () => {
                const r = await updatePageMeta(page.id, m);
                if (!r.ok) return setError(r.error);
                setError(null);
                onSaved({ ...m, slug: r.data ?? m.slug });
                onClose();
              })
            }
          >
            {busy ? "Salvando…" : "Salvar"}
          </button>
        </>
      }
    >
      <div className="grid gap-6 md:grid-cols-2">
        <div className="flex flex-col gap-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Geral</div>
          <Text label="Título" value={m.title} onChange={(v) => set({ title: v })} />
          {!home && (
            <Text
              label="Endereço (URL)"
              value={m.slug}
              onChange={(v) => set({ slug: slugify(v) || v.toLowerCase() })}
              help={`O link será /eventos/${m.slug || "…"}. Mudar o endereço quebra links já compartilhados.`}
            />
          )}
          {!home && <Select label="Tipo" value={m.kind} onChange={(v) => set({ kind: v })} options={[["evento", "Evento"], ["institucional", "Institucional"]]} />}
          {m.kind === "evento" && (
            <>
              <Text label="Categoria" value={m.category} onChange={(v) => set({ category: v })} placeholder="Ex.: Música, Teatro, Oficina" help="Usada no filtro da página de eventos." />
              <Toggle label="Mostrar no menu “Eventos”" checked={m.show_in_nav} onChange={(v) => set({ show_in_nav: v })} />
            </>
          )}
          <ColorInput label="Cor da página" value={m.color ?? ""} onChange={(v) => set({ color: v || null })} />
          <span className="adm-help -mt-3">Troca a cor principal (botões, títulos de destaque, ondas) só nesta página. Vazio = cor do tema.</span>
          {!home && <MediaField label="Imagem de capa" value={m.cover_url} onChange={(v) => set({ cover_url: v })} help="Aparece nos cards da programação. 1600×900 recomendado." folder="capas" aspect="16 / 10" />}
        </div>
        <div className="flex flex-col gap-4">
          {!home && (
            <>
              <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Data e local</div>
              <DateTime label="Início" value={m.starts_at} onChange={(v) => set({ starts_at: v || null })} help="Vazio = “Data em breve”." />
              <DateTime label="Término" value={m.ends_at} onChange={(v) => set({ ends_at: v || null })} />
              <Text label="Local" value={m.location} onChange={(v) => set({ location: v })} placeholder="A definir" />
            </>
          )}
          {m.kind === "evento" && (
            <>
              <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Inscrições e certificado</div>
              <Toggle label="Inscrições abertas" checked={m.registration_enabled} onChange={(v) => set({ registration_enabled: v })} help="Adicione o bloco “Inscrição no evento” na página para mostrar o botão." />
              <NumberField label="Vagas (0 = sem limite)" value={m.capacity ?? 0} onChange={(v) => set({ capacity: v > 0 ? v : null })} min={0} />
              <NumberField label="Carga horária do certificado (horas, 0 = não informar)" value={m.certificate_hours ?? 0} onChange={(v) => set({ certificate_hours: v > 0 ? v : null })} min={0} />
            </>
          )}
          <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Compartilhamento (SEO)</div>
          <Text label="Título no Google / redes" value={m.seo?.title} onChange={(v) => set({ seo: { ...m.seo, title: v } })} placeholder={m.title} />
          <Text label="Descrição" multiline value={m.seo?.description} onChange={(v) => set({ seo: { ...m.seo, description: v } })} help="Até ~160 caracteres." />
          <MediaField label="Imagem de compartilhamento" value={m.seo?.image} onChange={(v) => set({ seo: { ...m.seo, image: v } })} help="1200×630. Vazio = usa a capa." folder="compartilhamento" aspect="1200 / 630" />
        </div>
      </div>
    </Modal>
  );
}
