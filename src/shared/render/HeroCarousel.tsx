"use client";
import { useEffect, useState } from "react";
import { FramedImage } from "./FramedImage";

/** Fundo de seção com várias imagens em sequência (transição suave). */
export function HeroCarousel({ images, interval = 6, controls = true }: { images: string[]; interval?: number; controls?: boolean }) {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const n = images.length;
  useEffect(() => {
    if (n < 2 || paused) return;
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => setI((x) => (x + 1) % n), Math.max(2, interval) * 1000);
    return () => clearInterval(t);
  }, [n, interval, paused]);
  return (
    <>
      <div className="absolute inset-0 -z-20 overflow-hidden" aria-hidden>
        {images.map((url, k) => (
          <div key={url + k} className="fp-carousel-slide" data-active={k === i % n}>
            <FramedImage url={url} loading={k === 0 ? "eager" : "lazy"} className="h-full w-full object-cover" />
          </div>
        ))}
      </div>
      {controls && n > 1 && (
        <div className="fp-carousel-dots">
          {images.map((_, k) => (
            <button key={k} type="button" aria-label={`Imagem ${k + 1}`} aria-current={k === i % n} onClick={() => setI(k)} />
          ))}
          <button type="button" className="fp-carousel-pause" aria-label={paused ? "Continuar" : "Pausar"} onClick={() => setPaused((p) => !p)}>
            {paused ? "▶" : "❚❚"}
          </button>
        </div>
      )}
    </>
  );
}
