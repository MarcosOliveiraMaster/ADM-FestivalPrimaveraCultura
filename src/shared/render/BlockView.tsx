import type { Block, RenderContext } from "../types";
import { formatDate, formatRange, googleCalendarUrl, videoEmbedUrl } from "../format";
import { cleanHtml } from "./sanitize";
import { Countdown } from "./Countdown";
import { Gallery } from "./Gallery";
import { InterestForm } from "./InterestForm";

const TXT_ALIGN = { left: "text-left", center: "text-center", right: "text-right" } as const;
const JUSTIFY = { left: "justify-start", center: "justify-center", right: "justify-end" } as const;
const RATIO = { auto: "", "1/1": "aspect-square", "4/3": "aspect-[4/3]", "16/9": "aspect-video", "3/4": "aspect-[3/4]" } as const;

function Placeholder({ ctx, label }: { ctx: RenderContext; label: string }) {
  if (ctx.mode !== "preview") return null;
  return <div className="fp-placeholder">{label}</div>;
}

export function BlockView({ block, ctx }: { block: Block; ctx: RenderContext }) {
  switch (block.type) {
    case "heading": {
      const p = block.props;
      const Tag = (`h${p.level}` as "h1" | "h2" | "h3");
      return (
        <Tag className={`fp-heading fp-h${p.level} ${TXT_ALIGN[p.align ?? "left"]}`} style={p.color ? { color: p.color } : undefined}>
          {p.text}
        </Tag>
      );
    }
    case "richtext":
      return <div className="fp-prose" dangerouslySetInnerHTML={{ __html: cleanHtml(block.props.html) }} />;
    case "image": {
      const p = block.props;
      if (!p.url) return <Placeholder ctx={ctx} label="Imagem — escolha um arquivo" />;
      // eslint-disable-next-line @next/next/no-img-element
      const img = <img src={p.url} alt={p.alt ?? ""} loading="lazy" className={`w-full object-cover ${RATIO[p.ratio ?? "auto"]} ${p.rounded ? "rounded-2xl" : ""}`} />;
      return (
        <figure className="flex flex-col gap-2">
          {p.link ? <a href={p.link} data-track={`imagem:${p.alt || p.link}`}>{img}</a> : img}
          {p.caption && <figcaption className="text-sm opacity-70">{p.caption}</figcaption>}
        </figure>
      );
    }
    case "gallery":
      if (!block.props.images.length) return <Placeholder ctx={ctx} label="Galeria — adicione imagens" />;
      return <Gallery {...block.props} />;
    case "video": {
      const v = videoEmbedUrl(block.props.url);
      if (!v) return <Placeholder ctx={ctx} label="Vídeo — cole um link do YouTube, Vimeo ou Instagram" />;
      return (
        <figure className="flex flex-col gap-2">
          {v.kind === "iframe" ? (
            <iframe src={v.src} className="aspect-video w-full rounded-2xl bg-black" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen loading="lazy" title={block.props.caption || "Vídeo"} />
          ) : (
            <video src={v.src} controls className="aspect-video w-full rounded-2xl bg-black" />
          )}
          {block.props.caption && <figcaption className="text-sm opacity-70">{block.props.caption}</figcaption>}
        </figure>
      );
    }
    case "button": {
      const p = block.props;
      return (
        <div className={`flex ${JUSTIFY[p.align ?? "left"]}`}>
          <a href={p.href || "#"} target={p.newTab ? "_blank" : undefined} rel={p.newTab ? "noopener noreferrer" : undefined} data-track={`botao:${p.label}`} className={`fp-btn fp-btn-${p.variant} ${p.size === "lg" ? "fp-btn-lg" : ""}`}>
            {p.label}
          </a>
        </div>
      );
    }
    case "links":
      return (
        <ul className="flex flex-col gap-3 text-left">
          {block.props.items.map((it, i) => (
            <li key={i}>
              <a href={it.url} target="_blank" rel="noopener noreferrer" data-track={`link:${it.title}`} className="fp-link-card">
                <span className="font-semibold">{it.title}</span>
                {it.description && <span className="text-sm opacity-75">{it.description}</span>}
                <span aria-hidden className="fp-link-arrow">→</span>
              </a>
            </li>
          ))}
        </ul>
      );
    case "eventinfo": {
      const p = block.props;
      const s = ctx.settings;
      const start = p.useFestival ? s.starts_at : p.startsAt || ctx.page?.starts_at || null;
      const end = p.useFestival ? s.ends_at : p.endsAt || ctx.page?.ends_at || null;
      const location = p.useFestival ? s.location : p.location || ctx.page?.location || null;
      const address = p.address || location;
      const when = formatRange(start, end);
      const cal = p.showCalendar ? googleCalendarUrl(ctx.page?.title || s.festival_name, start, end, address) : null;
      return (
        <div className="fp-card grid gap-6 text-left @2xl:grid-cols-2">
          <div className="flex flex-col gap-4">
            <div>
              <div className="fp-label">Quando</div>
              <div className="text-lg font-semibold">{when ?? "Datas e horários em breve"}</div>
              {p.useFestival && s.schedule_text && <div className="mt-1 text-sm opacity-75">{s.schedule_text}</div>}
            </div>
            <div>
              <div className="fp-label">Onde</div>
              <div className="text-lg font-semibold">{location ?? "Local a definir"}</div>
              {p.address && p.address !== location && <div className="text-sm opacity-75">{p.address}</div>}
            </div>
            {cal && (
              <a href={cal} target="_blank" rel="noopener noreferrer" data-track="agenda:google" className="fp-btn fp-btn-outline self-start">
                Adicionar à agenda
              </a>
            )}
          </div>
          {p.showMap && address ? (
            <iframe title="Mapa" className="h-64 w-full rounded-xl border-0" loading="lazy" src={`https://www.google.com/maps?q=${encodeURIComponent(address)}&output=embed`} />
          ) : p.showMap ? (
            <div className="fp-placeholder h-64">O mapa aparece quando o local for definido</div>
          ) : null}
        </div>
      );
    }
    case "form":
      return <InterestForm props={block.props} pageId={ctx.pageId} preview={ctx.mode === "preview"} events={ctx.events} />;
    case "schedule": {
      const p = block.props;
      const now = ctx.now ?? 0;
      const list = ctx.events
        .filter((e) => p.showPast || !e.starts_at || new Date(e.ends_at ?? e.starts_at).getTime() >= now)
        .slice(0, p.limit || 6);
      return (
        <div className="flex flex-col gap-6">
          {p.title && <h2 className="fp-heading fp-h2">{p.title}</h2>}
          {list.length === 0 ? (
            <p className="opacity-70">A programação será divulgada em breve.</p>
          ) : (
            <div className="grid gap-5 text-left @xl:grid-cols-2 @4xl:grid-cols-3">
              {list.map((e) => (
                <EventCard key={e.id} e={e} fallback={ctx.settings.brand.event_cover_url} />
              ))}
            </div>
          )}
        </div>
      );
    }
    case "countdown": {
      const p = block.props;
      const target = p.useFestival ? ctx.settings.starts_at : p.target;
      if (!target) return ctx.mode === "preview" ? <Placeholder ctx={ctx} label="Contagem regressiva — aparece quando a data for definida" /> : null;
      return <Countdown target={target} label={p.label} />;
    }
    case "faq":
      return (
        <div className="flex flex-col gap-3 text-left">
          {block.props.items.map((it, i) => (
            <details key={i} className="fp-faq">
              <summary>{it.q}</summary>
              <p>{it.a}</p>
            </details>
          ))}
        </div>
      );
    case "logos": {
      const p = block.props;
      if (!p.items.length) return <Placeholder ctx={ctx} label="Logos — adicione imagens" />;
      return (
        <div className="flex flex-col gap-6">
          {p.title && <div className="fp-label text-center">{p.title}</div>}
          <div className="flex flex-wrap items-center justify-center gap-8">
            {p.items.map((l, i) => {
              // eslint-disable-next-line @next/next/no-img-element
              const img = <img src={l.url} alt={l.name ?? ""} className={`h-14 w-auto object-contain ${p.grayscale ? "grayscale transition hover:grayscale-0" : ""}`} loading="lazy" />;
              return l.link ? (
                <a key={i} href={l.link} target="_blank" rel="noopener noreferrer" data-track={`logo:${l.name ?? l.link}`}>{img}</a>
              ) : (
                <span key={i}>{img}</span>
              );
            })}
          </div>
        </div>
      );
    }
    case "spacer":
      return <div aria-hidden className={{ sm: "h-4", md: "h-10", lg: "h-20" }[block.props.size]} />;
    case "divider":
      return block.props.style === "flower" ? (
        <div aria-hidden className="fp-divider-flower">✿ ✿ ✿</div>
      ) : block.props.style === "dots" ? (
        <div aria-hidden className="fp-divider-flower tracking-[0.6em]">• • •</div>
      ) : (
        <hr className="border-current opacity-20" />
      );
    default:
      return null;
  }
}

export function EventCard({ e, fallback }: { e: RenderContext["events"][number]; fallback?: string }) {
  const cover = e.cover_url || fallback;
  return (
    <a href={`/eventos/${e.slug}`} data-track={`evento:${e.slug}`} className="fp-event-card group">
      <div className="aspect-[16/10] overflow-hidden">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cover} alt="" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" loading="lazy" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-4xl text-white/80" style={{ background: "linear-gradient(135deg, var(--fp-primary), var(--fp-accent))" }}>✿</div>
        )}
      </div>
      <div className="flex flex-col gap-1 p-5">
        {e.category && <span className="fp-label">{e.category}</span>}
        <span className="fp-heading text-xl">{e.title}</span>
        <span className="text-sm opacity-75">{formatDate(e.starts_at, { day: "2-digit", month: "long", hour: "2-digit", minute: "2-digit" }) ?? "Data em breve"}{e.location ? ` · ${e.location}` : ""}</span>
      </div>
    </a>
  );
}
