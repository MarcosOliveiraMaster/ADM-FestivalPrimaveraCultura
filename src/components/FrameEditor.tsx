"use client";
import { useRef, useState } from "react";
import { Crosshair, Minus, Move, Plus, RotateCcw } from "lucide-react";
import { DEFAULT_FRAMING, frameStyle, parseImage, withFraming, type Framing } from "@/shared/image";
import { Modal } from "./Modal";

export type Fit = "cover" | "contain";

const CHECKER = {
  backgroundColor: "#fff",
  backgroundImage: "linear-gradient(45deg,#e4e4e7 25%,transparent 25%),linear-gradient(-45deg,#e4e4e7 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#e4e4e7 75%),linear-gradient(-45deg,transparent 75%,#e4e4e7 75%)",
  backgroundSize: "16px 16px",
  backgroundPosition: "0 0,0 8px,8px -8px,-8px 0",
};

function Stage({ src, frame, onMove, aspect, fit, label }: { src: string; frame: Framing; onMove: (f: Framing) => void; aspect: string; fit: Fit; label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; f: Framing } | null>(null);
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <span className="text-xs font-medium text-zinc-500">{label}</span>
      <div
        ref={ref}
        className="relative cursor-grab touch-none overflow-hidden rounded-lg ring-1 ring-zinc-300 select-none active:cursor-grabbing"
        style={{ aspectRatio: aspect, ...CHECKER }}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          drag.current = { x: e.clientX, y: e.clientY, f: frame };
        }}
        onPointerMove={(e) => {
          const d = drag.current;
          const box = ref.current?.getBoundingClientRect();
          if (!d || !box) return;
          // Arrastar a imagem para a direita mostra mais do lado esquerdo (posição diminui)
          const k = 100 / Math.max(frame.zoom, 0.5);
          const x = Math.min(100, Math.max(0, d.f.x - ((e.clientX - d.x) / box.width) * k));
          const y = Math.min(100, Math.max(0, d.f.y - ((e.clientY - d.y) / box.height) * k));
          onMove({ ...d.f, x, y });
        }}
        onPointerUp={() => (drag.current = null)}
        onPointerCancel={() => (drag.current = null)}
        onWheel={(e) => onMove({ ...frame, zoom: Math.min(3, Math.max(0.5, frame.zoom - e.deltaY * 0.0015)) })}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt="" draggable={false} className={`pointer-events-none h-full w-full ${fit === "cover" ? "object-cover" : "object-contain"}`} style={frameStyle(frame)} />
        <div className="pointer-events-none absolute inset-0 grid grid-cols-3 grid-rows-3">
          {Array.from({ length: 9 }, (_, i) => (
            <span key={i} className="border border-white/40" />
          ))}
        </div>
      </div>
    </div>
  );
}

export function FrameModal({ open, url, onClose, onSave, aspect = "16 / 9", fit = "cover", mobile }: { open: boolean; url: string; onClose: () => void; onSave: (url: string) => void; aspect?: string; fit?: Fit; mobile?: boolean }) {
  const { src, frame: initial } = parseImage(url);
  const [frame, setFrame] = useState<Framing>(initial);
  const [last, setLast] = useState<string | null>(null);
  if (open && url !== last) {
    setLast(url);
    setFrame(initial);
  }
  if (!open || !src) return null;
  const zoomPct = Math.round(frame.zoom * 100);
  const setZoom = (z: number) => setFrame((f) => ({ ...f, zoom: Math.min(3, Math.max(0.5, z)) }));
  return (
    <Modal
      open
      onClose={onClose}
      title="Ajustar enquadramento"
      wide
      footer={
        <>
          <button type="button" className="adm-btn-ghost mr-auto" onClick={() => setFrame(DEFAULT_FRAMING)}><RotateCcw size={15} /> Restaurar</button>
          <button type="button" className="adm-btn-secondary" onClick={onClose}>Cancelar</button>
          <button type="button" className="adm-btn-primary" onClick={() => { onSave(withFraming(src, frame)); onClose(); }}>Aplicar</button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <p className="flex items-center gap-2 text-sm text-zinc-500"><Move size={15} /> Arraste a imagem para posicionar. Use o controle (ou a rodinha do mouse) para aproximar ou afastar.</p>
        <div className={mobile ? "grid gap-4 sm:grid-cols-[1fr_160px]" : ""}>
          <Stage src={src} frame={frame} onMove={setFrame} aspect={aspect} fit={fit} label={mobile ? "Computador" : "Prévia"} />
          {mobile && <Stage src={src} frame={frame} onMove={setFrame} aspect="9 / 16" fit={fit} label="Celular" />}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm font-medium text-zinc-700">Zoom</span>
          <button type="button" className="adm-btn-secondary adm-btn-sm" onClick={() => setZoom(frame.zoom - 0.1)} aria-label="Diminuir zoom"><Minus size={14} /></button>
          <input type="range" min={50} max={300} step={5} value={zoomPct} onChange={(e) => setZoom(Number(e.target.value) / 100)} className="min-w-40 flex-1 accent-brand-500" />
          <button type="button" className="adm-btn-secondary adm-btn-sm" onClick={() => setZoom(frame.zoom + 0.1)} aria-label="Aumentar zoom"><Plus size={14} /></button>
          <span className="w-12 text-right text-sm tabular-nums text-zinc-700">{zoomPct}%</span>
          <button type="button" className="adm-btn-ghost adm-btn-sm" onClick={() => setFrame((f) => ({ ...f, x: 50, y: 50 }))}><Crosshair size={14} /> Centralizar</button>
        </div>
        {frame.zoom < 1 && <p className="text-xs text-amber-700">Com zoom abaixo de 100%, aparecem bordas ao redor da imagem (a cor de fundo da seção).</p>}
      </div>
    </Modal>
  );
}
