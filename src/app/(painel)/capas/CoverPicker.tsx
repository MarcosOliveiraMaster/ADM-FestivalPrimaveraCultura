"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Check, Plus, X } from "lucide-react";
import type { Brand } from "@/shared/types";
import { FramedImage } from "@/shared/render/FramedImage";
import { HeroCarousel } from "@/shared/render/HeroCarousel";
import { cleanSrc } from "@/shared/image";
import { applyCoversToHome, saveCovers } from "./actions";

interface Img { id: string; url: string; alt: string | null; width: number | null; height: number | null }
const MAX = 5;

/** Escolha de até 5 imagens de capa que revezam automaticamente, com pré-visualização. */
export function CoverPicker({ images, festival, tagline, brand, homeUsesCover }: { images: Img[]; festival: string; tagline: string | null; brand: Brand; homeUsesCover: boolean }) {
  const router = useRouter();
  const [busy, start] = useTransition();
  const initial = (brand.hero_cover_urls?.length ? brand.hero_cover_urls : brand.hero_cover_url ? [brand.hero_cover_url] : []).slice(0, MAX);
  const [chosen, setChosen] = useState<string[]>(initial);
  const [interval, setIntervalSec] = useState(brand.hero_interval ?? 6);
  const [overlay, setOverlay] = useState(40);
  const [only, setOnly] = useState<"todas" | "horizontais">("horizontais");
  const [msg, setMsg] = useState<string | null>(null);
  const dirty = JSON.stringify(chosen) !== JSON.stringify(initial) || interval !== (brand.hero_interval ?? 6);
  const list = images.filter((i) => only === "todas" || !i.width || !i.height || i.width >= i.height);
  const idx = (url: string) => chosen.findIndex((c) => cleanSrc(c) === cleanSrc(url));
  const toggle = (url: string) => setChosen((c) => (idx(url) >= 0 ? c.filter((x) => cleanSrc(x) !== cleanSrc(url)) : c.length < MAX ? [...c, url] : c));
  const move = (i: number, d: number) => setChosen((c) => { const n = [...c]; const j = i + d; if (j < 0 || j >= n.length) return c; [n[i], n[j]] = [n[j], n[i]]; return n; });
  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, ok: string) =>
    start(async () => {
      const r = await fn();
      setMsg(r.ok ? ok : r.error ?? "Erro");
      router.refresh();
    });

  if (!images.length) return <div className="adm-card p-8 text-center text-sm text-zinc-500">Envie fotos em Mídia para escolher a capa aqui.</div>;
  return (
    <div className="flex flex-col gap-5">
      <div className="adm-card grid gap-5 p-5 lg:grid-cols-[1.4fr_1fr]">
        <div className="relative aspect-video overflow-hidden rounded-xl bg-zinc-900 [isolation:isolate]">
          {chosen.length ? <HeroCarousel images={chosen} interval={interval} /> : <div className="absolute inset-0 -z-20 bg-gradient-to-br from-brand-700 to-amber-500" />}
          <div className="absolute inset-0 -z-10 bg-black" style={{ opacity: overlay / 100 }} />
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 p-4 text-center text-white">
            <span className="text-2xl font-bold drop-shadow md:text-3xl">{festival}</span>
            {tagline && <span className="text-sm opacity-90">{tagline}</span>}
          </div>
        </div>
        <div className="flex flex-col gap-3">
          <div className="text-sm font-semibold">Capa da página inicial — {chosen.length}/{MAX} imagens</div>
          {chosen.length === 0 && <p className="text-sm text-zinc-500">Clique em “Adicionar à capa” nas fotos abaixo (até {MAX}). Elas revezam automaticamente.</p>}
          <ol className="flex flex-col gap-2">
            {chosen.map((url, i) => (
              <li key={url} className="flex items-center gap-2 rounded-lg border border-zinc-200 p-1.5">
                <span className="w-5 text-center text-xs font-semibold text-zinc-500">{i + 1}</span>
                <span className="h-9 w-14 shrink-0 overflow-hidden rounded bg-zinc-100"><FramedImage url={url} className="h-full w-full object-cover" /></span>
                <span className="flex-1" />
                <button type="button" className="adm-btn-ghost adm-btn-sm" onClick={() => move(i, -1)} aria-label="Subir"><ArrowUp size={14} /></button>
                <button type="button" className="adm-btn-ghost adm-btn-sm" onClick={() => move(i, 1)} aria-label="Descer"><ArrowDown size={14} /></button>
                <button type="button" className="adm-btn-ghost adm-btn-sm text-red-600" onClick={() => toggle(url)} aria-label="Tirar da capa"><X size={14} /></button>
              </li>
            ))}
          </ol>
          <label className="adm-label">Segundos por imagem: {interval}s<input type="range" min={3} max={15} value={interval} onChange={(e) => setIntervalSec(Number(e.target.value))} className="accent-brand-500" /></label>
          <label className="adm-label">Escurecer (só na prévia): {overlay}%<input type="range" min={0} max={70} step={5} value={overlay} onChange={(e) => setOverlay(Number(e.target.value))} className="accent-brand-500" /></label>
          <button type="button" className="adm-btn-primary" disabled={busy || !dirty} onClick={() => run(() => saveCovers(chosen, interval), "Capa salva.")}>{busy ? "Salvando…" : "Salvar capa"}</button>
          {!homeUsesCover && (
            <div className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
              A primeira seção da página inicial está com uma foto própria, então a capa escolhida aqui não aparece nela.
              <button type="button" className="adm-btn-secondary adm-btn-sm mt-2" disabled={busy} onClick={() => confirm("A capa da página inicial passará a usar as imagens escolhidas aqui (publicado imediatamente). Continuar?") && run(applyCoversToHome, "Página inicial atualizada para usar esta capa.")}>
                Usar estas imagens na página inicial
              </button>
            </div>
          )}
          {msg && <p className="text-sm text-brand-700">{msg}</p>}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-sm">
        <span className="font-semibold">Fotos da biblioteca</span>
        <select value={only} onChange={(e) => setOnly(e.target.value as typeof only)} className="adm-input !w-auto !py-1">
          <option value="horizontais">só horizontais (recomendado)</option>
          <option value="todas">todas</option>
        </select>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((img) => {
          const pos = idx(img.url);
          return (
            <figure key={img.id} className={`adm-card overflow-hidden ${pos >= 0 ? "ring-2 ring-brand-500" : ""}`}>
              <div className="relative aspect-video overflow-hidden bg-zinc-900">
                <FramedImage url={img.url} alt={img.alt ?? ""} className="h-full w-full object-cover" />
                {pos >= 0 && <span className="absolute left-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-brand-500 text-xs font-bold text-white">{pos + 1}</span>}
              </div>
              <figcaption className="flex items-center justify-between gap-2 p-2.5 text-sm">
                <span className="truncate text-xs text-zinc-500">{img.width ? `${img.width}×${img.height}` : img.alt}</span>
                {pos >= 0 ? (
                  <button type="button" className="adm-btn-secondary adm-btn-sm" onClick={() => toggle(img.url)}><Check size={12} /> Na capa</button>
                ) : (
                  <button type="button" className="adm-btn-primary adm-btn-sm" disabled={chosen.length >= MAX} onClick={() => toggle(img.url)}><Plus size={12} /> Adicionar à capa</button>
                )}
              </figcaption>
            </figure>
          );
        })}
      </div>
    </div>
  );
}
