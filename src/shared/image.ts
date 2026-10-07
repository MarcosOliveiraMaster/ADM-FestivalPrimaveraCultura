import type { CSSProperties } from "react";

/**
 * Enquadramento de imagem (posição + zoom) guardado no próprio endereço, após "#fp=".
 * Ex.: https://.../capa.webp#fp=30,65,1.4  →  foco em 30% x 65%, zoom 140%.
 * O trecho após "#" nunca é enviado ao servidor, então a imagem carrega igual.
 */
export interface Framing {
  x: number; // 0–100 (%)
  y: number; // 0–100 (%)
  zoom: number; // 0.5–3
}

export const DEFAULT_FRAMING: Framing = { x: 50, y: 50, zoom: 1 };

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

export function parseImage(url?: string | null): { src: string; frame: Framing } {
  if (!url) return { src: "", frame: DEFAULT_FRAMING };
  const i = url.indexOf("#fp=");
  if (i < 0) return { src: url, frame: DEFAULT_FRAMING };
  const [x, y, z] = url.slice(i + 4).split(",").map(Number);
  return {
    src: url.slice(0, i),
    frame: {
      x: Number.isFinite(x) ? clamp(x, 0, 100) : 50,
      y: Number.isFinite(y) ? clamp(y, 0, 100) : 50,
      zoom: Number.isFinite(z) ? clamp(z, 0.5, 3) : 1,
    },
  };
}

/** Endereço limpo, sem o enquadramento (para metadados, downloads, ampliação). */
export function cleanSrc(url?: string | null) {
  return parseImage(url).src;
}

export function withFraming(url: string, f: Framing) {
  const src = cleanSrc(url);
  if (!src) return "";
  const r = (n: number, d = 1) => Math.round(n * 10 ** d) / 10 ** d;
  if (r(f.x) === 50 && r(f.y) === 50 && r(f.zoom, 2) === 1) return src;
  return `${src}#fp=${r(f.x)},${r(f.y)},${r(f.zoom, 2)}`;
}

export function isFramed(url?: string | null) {
  return !!url && url.includes("#fp=");
}

/** Estilo que aplica o enquadramento em um <img>/<video> com object-fit. */
export function frameStyle(f: Framing): CSSProperties {
  const pos = `${f.x}% ${f.y}%`;
  return {
    objectPosition: pos,
    transformOrigin: pos,
    transform: f.zoom !== 1 ? `scale(${f.zoom})` : undefined,
  };
}
