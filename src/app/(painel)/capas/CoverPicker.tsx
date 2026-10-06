"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import type { Brand } from "@/shared/types";
import { FramedImage } from "@/shared/render/FramedImage";
import { cleanSrc } from "@/shared/image";
import { updateSettings } from "../configuracoes/actions";

interface Img { id: string; url: string; alt: string | null; width: number | null; height: number | null }

/** Mostra cada foto como a capa (hero) ficaria, com título por cima, e permite escolher. */
export function CoverPicker({ images, current, festival, tagline, brand }: { images: Img[]; current: string; festival: string; tagline: string | null; brand: Brand }) {
  const router = useRouter();
  const [busy, start] = useTransition();
  const [overlay, setOverlay] = useState(40);
  const [only, setOnly] = useState<"todas" | "horizontais">("horizontais");
  const list = images.filter((i) => only === "todas" || !i.width || !i.height || i.width >= i.height);
  const choose = (url: string) =>
    start(async () => {
      await updateSettings({ brand: { ...brand, hero_cover_url: url } });
      router.refresh();
    });

  if (!images.length) return <div className="adm-card p-8 text-center text-sm text-zinc-500">Envie fotos em Mídia para compará-las aqui.</div>;
  return (
    <div className="flex flex-col gap-4">
      <div className="adm-card flex flex-wrap items-center gap-4 p-4 text-sm">
        <label className="flex items-center gap-2">Escurecer: {overlay}%<input type="range" min={0} max={70} step={5} value={overlay} onChange={(e) => setOverlay(Number(e.target.value))} className="accent-brand-500" /></label>
        <label className="flex items-center gap-2">
          Mostrar
          <select value={only} onChange={(e) => setOnly(e.target.value as typeof only)} className="adm-input !w-auto !py-1">
            <option value="horizontais">só horizontais (recomendado)</option>
            <option value="todas">todas</option>
          </select>
        </label>
        <span className="adm-help">A capa escolhida vale para seções com fundo “Imagem” sem foto própria. Seções com foto definida no editor continuam com a delas.</span>
      </div>
      <div className="grid gap-5 md:grid-cols-2">
        {list.map((img, n) => {
          const active = cleanSrc(current) === cleanSrc(img.url);
          return (
            <figure key={img.id} className={`adm-card overflow-hidden ${active ? "ring-2 ring-brand-500" : ""}`}>
              <div className="relative aspect-video overflow-hidden bg-zinc-900">
                <FramedImage url={img.url} alt={img.alt ?? ""} className="h-full w-full object-cover" />
                <div className="absolute inset-0 bg-black" style={{ opacity: overlay / 100 }} />
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 p-4 text-center text-white">
                  <span className="text-2xl font-bold drop-shadow md:text-3xl">{festival}</span>
                  {tagline && <span className="text-sm opacity-90">{tagline}</span>}
                </div>
                <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2 py-0.5 text-xs font-semibold text-zinc-800">Opção {n + 1}</span>
              </div>
              <figcaption className="flex items-center justify-between gap-2 p-3 text-sm">
                <span className="truncate text-zinc-500">{img.alt || img.url.split("/").pop()}{img.width ? ` · ${img.width}×${img.height}` : ""}</span>
                {active ? (
                  <span className="adm-badge bg-brand-50 text-brand-700"><Check size={12} /> Capa atual</span>
                ) : (
                  <button type="button" className="adm-btn-primary adm-btn-sm" disabled={busy} onClick={() => choose(img.url)}>Usar como capa</button>
                )}
              </figcaption>
            </figure>
          );
        })}
      </div>
    </div>
  );
}
