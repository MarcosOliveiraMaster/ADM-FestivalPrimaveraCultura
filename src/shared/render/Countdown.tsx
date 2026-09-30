"use client";
import { useEffect, useState } from "react";
import { BrandIcon } from "./BrandIcon";

function diff(target: number) {
  const ms = Math.max(0, target - Date.now());
  return { d: Math.floor(ms / 86400000), h: Math.floor(ms / 3600000) % 24, m: Math.floor(ms / 60000) % 60, s: Math.floor(ms / 1000) % 60, done: ms === 0 };
}

export function Countdown({ target, label, iconUrl }: { target: string; label?: string; iconUrl?: string }) {
  const t = new Date(target).getTime();
  const [v, setV] = useState<ReturnType<typeof diff> | null>(null);
  useEffect(() => {
    const tick = () => setV(diff(t));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [t]);
  if (Number.isNaN(t)) return null;
  if (v?.done)
    return (
      <div className="fp-label flex items-center justify-center gap-2 text-center">
        <BrandIcon url={iconUrl} className="h-6" /> É hoje!
      </div>
    );
  const units = [["dias", v?.d], ["horas", v?.h], ["min", v?.m], ["seg", v?.s]] as const;
  return (
    <div className="flex flex-col items-center gap-3">
      {label && <div className="fp-label">{label}</div>}
      <div className="flex gap-3">
        {units.map(([u, n]) => (
          <div key={u} className="fp-count">
            <span className="fp-heading text-3xl tabular-nums @2xl:text-4xl">{n === undefined ? "--" : String(n).padStart(2, "0")}</span>
            <span className="text-xs uppercase tracking-wider opacity-75">{u}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
