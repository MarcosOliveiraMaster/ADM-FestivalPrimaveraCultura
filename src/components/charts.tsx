"use client";
import { useMemo, useState } from "react";

type Row = { date: string; views: number; visitors: number; submissions: number };
const SERIES = { visitors: "Visitantes", views: "Visitas", submissions: "Inscrições" } as const;

function fmtDay(d: string) {
  const [y, m, day] = d.split("-").map(Number);
  return new Date(y, m - 1, day).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

/** Barras diárias de uma métrica por vez (nunca dois eixos). */
export function DailyChart({ rows }: { rows: Row[] }) {
  const [key, setKey] = useState<keyof typeof SERIES>("visitors");
  const [hover, setHover] = useState<number | null>(null);
  const W = 720, H = 220, P = { l: 36, r: 8, t: 12, b: 26 };
  const max = Math.max(1, ...rows.map((r) => r[key]));
  const nice = useMemo(() => {
    const step = Math.pow(10, Math.floor(Math.log10(max)));
    const top = Math.ceil(max / step) * step;
    return top < 4 ? 4 : top;
  }, [max]);
  const bw = (W - P.l - P.r) / Math.max(1, rows.length);
  const y = (v: number) => P.t + (H - P.t - P.b) * (1 - v / nice);
  const ticks = [0, nice / 2, nice];
  const labelEvery = Math.ceil(rows.length / 8);
  const h = hover !== null ? rows[hover] : null;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-1 self-start rounded-lg bg-zinc-100 p-0.5 text-xs">
        {(Object.keys(SERIES) as (keyof typeof SERIES)[]).map((k) => (
          <button type="button" key={k} onClick={() => setKey(k)} className={`rounded-md px-2.5 py-1 ${key === k ? "bg-white font-semibold shadow-sm" : "text-zinc-600"}`}>{SERIES[k]}</button>
        ))}
      </div>
      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={`${SERIES[key]} por dia`} onMouseLeave={() => setHover(null)}>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={P.l} x2={W - P.r} y1={y(t)} y2={y(t)} stroke="#e4e4e7" strokeWidth={1} />
              <text x={P.l - 6} y={y(t) + 3} textAnchor="end" fontSize={10} fill="#71717a">{Math.round(t)}</text>
            </g>
          ))}
          {rows.map((r, i) => {
            const v = r[key];
            const x = P.l + i * bw;
            const top = y(v);
            const hgt = Math.max(0, H - P.b - top);
            return (
              <g key={r.date} onMouseEnter={() => setHover(i)}>
                <rect x={x} y={P.t} width={bw} height={H - P.t - P.b} fill={hover === i ? "#f4f4f5" : "transparent"} />
                {v > 0 && <path d={roundedTop(x + 1, top, Math.max(1, bw - 2), hgt, Math.min(4, (bw - 2) / 2))} fill="#2f6f4f" opacity={hover === null || hover === i ? 1 : 0.55} />}
                {i % labelEvery === 0 && <text x={x + bw / 2} y={H - 8} textAnchor="middle" fontSize={10} fill="#71717a">{fmtDay(r.date)}</text>}
              </g>
            );
          })}
          <line x1={P.l} x2={W - P.r} y1={H - P.b} y2={H - P.b} stroke="#a1a1aa" strokeWidth={1} />
        </svg>
        {h && hover !== null && (
          <div className="pointer-events-none absolute top-0 z-10 -translate-x-1/2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs shadow-lg" style={{ left: `${((P.l + hover * bw + bw / 2) / W) * 100}%` }}>
            <div className="mb-1 font-semibold text-zinc-900">{fmtDay(h.date)}</div>
            <div className="text-zinc-700">Visitantes: <b>{h.visitors}</b></div>
            <div className="text-zinc-700">Visitas: <b>{h.views}</b></div>
            <div className="text-zinc-700">Inscrições: <b>{h.submissions}</b></div>
          </div>
        )}
      </div>
    </div>
  );
}

function roundedTop(x: number, y: number, w: number, h: number, r: number) {
  if (h <= r) return `M${x},${y + h}V${y}H${x + w}V${y + h}Z`;
  return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`;
}

/** Ranking em barras horizontais (valores em texto, barra só como apoio visual). */
export function BarList({ items, empty = "Sem dados no período." }: { items: { label: React.ReactNode; value: number; hint?: string }[]; empty?: string }) {
  if (!items.length) return <p className="py-6 text-center text-sm text-zinc-500">{empty}</p>;
  const max = Math.max(...items.map((i) => i.value), 1);
  return (
    <ul className="flex flex-col gap-1.5">
      {items.map((it, i) => (
        <li key={i} className="group relative flex items-center justify-between gap-3 rounded-md px-2 py-1.5 text-sm" title={it.hint}>
          <span className="absolute inset-y-0 left-0 rounded-md bg-brand-100 transition group-hover:bg-brand-100/80" style={{ width: `${(it.value / max) * 100}%` }} />
          <span className="relative min-w-0 truncate text-zinc-800">{it.label}</span>
          <span className="relative font-semibold tabular-nums text-zinc-900">{it.value.toLocaleString("pt-BR")}</span>
        </li>
      ))}
    </ul>
  );
}
