"use client";
import { useEffect, useState } from "react";
import type { GalleryProps } from "../types";

const COLS = { 2: "grid-cols-2", 3: "grid-cols-2 @2xl:grid-cols-3", 4: "grid-cols-2 @2xl:grid-cols-4" } as const;

export function Gallery({ images, mode, columns }: GalleryProps) {
  const [open, setOpen] = useState<number | null>(null);
  const [slide, setSlide] = useState(0);
  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null);
      if (e.key === "ArrowRight") setOpen((o) => (o === null ? o : (o + 1) % images.length));
      if (e.key === "ArrowLeft") setOpen((o) => (o === null ? o : (o - 1 + images.length) % images.length));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, images.length]);

  return (
    <>
      {mode === "carousel" ? (
        <div className="relative overflow-hidden rounded-2xl">
          <div className="flex transition-transform duration-500" style={{ transform: `translateX(-${slide * 100}%)` }}>
            {images.map((im, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={i} src={im.url} alt={im.alt ?? ""} onClick={() => setOpen(i)} className="aspect-video w-full shrink-0 cursor-zoom-in object-cover" loading="lazy" />
            ))}
          </div>
          {images.length > 1 && (
            <>
              <button type="button" aria-label="Anterior" onClick={() => setSlide((s) => (s - 1 + images.length) % images.length)} className="fp-gal-nav left-3">‹</button>
              <button type="button" aria-label="Próxima" onClick={() => setSlide((s) => (s + 1) % images.length)} className="fp-gal-nav right-3">›</button>
              <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-2">
                {images.map((_, i) => (
                  <button type="button" key={i} aria-label={`Foto ${i + 1}`} onClick={() => setSlide(i)} className={`h-2 w-2 rounded-full ${i === slide ? "bg-white" : "bg-white/50"}`} />
                ))}
              </div>
            </>
          )}
        </div>
      ) : (
        <div className={`grid gap-3 ${COLS[columns] ?? COLS[3]}`}>
          {images.map((im, i) => (
            <button type="button" key={i} onClick={() => setOpen(i)} className="overflow-hidden rounded-xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={im.url} alt={im.alt ?? ""} className="aspect-square w-full cursor-zoom-in object-cover transition duration-500 hover:scale-105" loading="lazy" />
            </button>
          ))}
        </div>
      )}
      {open !== null && (
        <div role="dialog" aria-modal className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4" onClick={() => setOpen(null)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={images[open].url} alt={images[open].alt ?? ""} className="max-h-full max-w-full rounded-lg object-contain" />
          <button type="button" aria-label="Fechar" className="absolute right-4 top-4 text-3xl text-white">×</button>
        </div>
      )}
    </>
  );
}
