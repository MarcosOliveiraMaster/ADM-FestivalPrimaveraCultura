"use client";
import { useState } from "react";
import { Check, Copy } from "lucide-react";

const PRESETS = [
  ["instagram", "bio"],
  ["instagram", "stories"],
  ["whatsapp", "grupo"],
  ["facebook", "post"],
  ["cartaz", "qrcode"],
] as const;

export function UtmBuilder({ siteUrl }: { siteUrl: string }) {
  const [path, setPath] = useState("/");
  const [source, setSource] = useState("instagram");
  const [medium, setMedium] = useState("bio");
  const [campaign, setCampaign] = useState("festival");
  const [copied, setCopied] = useState(false);
  const u = new URL(path || "/", siteUrl);
  if (source) u.searchParams.set("utm_source", source);
  if (medium) u.searchParams.set("utm_medium", medium);
  if (campaign) u.searchParams.set("utm_campaign", campaign);
  const link = u.toString();
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-1">
        {PRESETS.map(([s, m]) => (
          <button type="button" key={s + m} className="rounded-full border border-zinc-200 px-2.5 py-1 text-xs hover:border-brand-500" onClick={() => { setSource(s); setMedium(m); }}>
            {s} · {m}
          </button>
        ))}
      </div>
      <div className="grid gap-2 sm:grid-cols-4">
        <label className="adm-label">Página<input value={path} onChange={(e) => setPath(e.target.value)} className="adm-input" placeholder="/eventos/show" /></label>
        <label className="adm-label">Origem<input value={source} onChange={(e) => setSource(e.target.value.toLowerCase())} className="adm-input" /></label>
        <label className="adm-label">Meio<input value={medium} onChange={(e) => setMedium(e.target.value.toLowerCase())} className="adm-input" /></label>
        <label className="adm-label">Campanha<input value={campaign} onChange={(e) => setCampaign(e.target.value.toLowerCase())} className="adm-input" /></label>
      </div>
      <div className="flex gap-2">
        <input readOnly value={link} className="adm-input font-mono text-xs" onFocus={(e) => e.target.select()} />
        <button type="button" className="adm-btn-secondary" onClick={() => navigator.clipboard.writeText(link).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); })}>
          {copied ? <Check size={16} /> : <Copy size={16} />} Copiar
        </button>
      </div>
      <p className="adm-help">Use um link diferente em cada lugar (bio, stories, cartaz com QR code…) para saber de onde vêm as visitas e inscrições.</p>
    </div>
  );
}
