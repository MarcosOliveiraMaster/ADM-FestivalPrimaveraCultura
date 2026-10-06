import type { Block, PageContent, RenderContext, Section } from "../types";
import { BlockView } from "./BlockView";
import { FramedImage } from "./FramedImage";
import { Wave } from "./Wave";
import { HeroCarousel } from "./HeroCarousel";
import { frameStyle, parseImage } from "../image";

const GRID: Record<Section["layout"], string> = {
  "1": "grid-cols-1",
  "1-1": "grid-cols-1 @2xl:grid-cols-2",
  "1-2": "grid-cols-1 @2xl:grid-cols-[1fr_2fr]",
  "2-1": "grid-cols-1 @2xl:grid-cols-[2fr_1fr]",
  "1-1-1": "grid-cols-1 @2xl:grid-cols-2 @4xl:grid-cols-3",
  "1-1-1-1": "grid-cols-1 @xl:grid-cols-2 @4xl:grid-cols-4",
};
const PAD = { none: "py-0", sm: "py-8", md: "py-14 @2xl:py-20", lg: "py-20 @2xl:py-28" } as const;
const ALIGN = { left: "text-left", center: "text-center", right: "text-right" } as const;
const VALIGN = { top: "items-start", center: "items-center", bottom: "items-end" } as const;
const MINH = { auto: "", half: "min-h-[55vh]", screen: "min-h-[88vh]" } as const;
const HIDE = { none: "", mobile: "hidden @2xl:block", desktop: "@2xl:hidden" } as const;

export function SectionView({ section, ctx, renderBlock }: { section: Section; ctx: RenderContext; renderBlock?: (block: Block, col: number, idx: number) => React.ReactNode }) {
  const s = section.style;
  const dark = s.textTone === "light" || (s.textTone === "auto" && ["image", "video", "gradient", "carousel"].includes(s.bgType));
  const slides = s.bgType === "carousel" ? (s.bgImages ?? []).filter(Boolean) : [];
  const bg: React.CSSProperties = {};
  if (s.bgType === "color" && s.bgColor) bg.background = s.bgColor;
  if (s.bgType === "gradient") bg.background = `linear-gradient(135deg, ${s.bgColor || "var(--fp-primary)"}, ${s.bgColor2 || "var(--fp-accent)"})`;
  const hero = ctx.settings.brand.hero_cover_url;
  const imgUrl = s.bgType === "image" ? s.bgUrl || hero : undefined;
  return (
    <section
      id={s.anchor || undefined}
      data-section={section.id}
      className={`relative isolate flex overflow-hidden ${VALIGN[s.valign] ?? ""} ${MINH[s.minHeight ?? "auto"]} ${HIDE[s.hideOn]} ${dark ? "fp-on-dark" : ""}`}
      style={bg}
    >
      {imgUrl && (
        <div className="absolute inset-0 -z-20 overflow-hidden">
          <FramedImage url={imgUrl} loading="eager" className="h-full w-full object-cover" />
        </div>
      )}
      {s.bgType === "image" && !imgUrl && <div className="absolute inset-0 -z-20" style={{ background: "linear-gradient(135deg, var(--fp-primary), var(--fp-accent))" }} />}
      {s.bgType === "video" && s.bgUrl && (
        <div className="absolute inset-0 -z-20 overflow-hidden">
          <video src={parseImage(s.bgUrl).src} autoPlay muted loop playsInline className="h-full w-full object-cover" style={frameStyle(parseImage(s.bgUrl).frame)} />
        </div>
      )}
      {s.bgType === "carousel" &&
        (slides.length ? (
          <HeroCarousel images={slides} interval={s.bgInterval} controls={ctx.mode === "public"} />
        ) : (
          <div className="absolute inset-0 -z-20" style={{ background: "linear-gradient(135deg, var(--fp-primary), var(--fp-accent))" }} />
        ))}
      {(s.bgType === "image" || s.bgType === "video" || s.bgType === "carousel") && (
        <div className="absolute inset-0 -z-10 bg-black" style={{ opacity: (s.overlay ?? 40) / 100 }} />
      )}
      {(s.wave === "top" || s.wave === "both") && <Wave color={s.waveColor} animate={s.waveAnimate} flip className="fp-wave-top" />}
      {(s.wave === "bottom" || s.wave === "both") && <Wave color={s.waveColor} animate={s.waveAnimate} className="fp-wave-bottom" />}
      {s.audience === "members" && ctx.mode === "preview" && <span className="fp-members-badge">🔒 Só para participantes logados</span>}
      <div className={`w-full ${PAD[s.padding]} ${s.width === "full" ? "px-4 @2xl:px-8" : "mx-auto max-w-6xl px-5 @2xl:px-8"} ${ALIGN[s.align]}`}>
        {s.audience === "members" && ctx.mode === "public" && !ctx.viewer?.loggedIn ? (
          <div className="fp-card fp-members mx-auto max-w-xl text-center">
            <div className="text-3xl" aria-hidden>🔒</div>
            <h2 className="fp-heading fp-h3">Conteúdo exclusivo</h2>
            <p className="opacity-80">Entre com sua conta para ver este conteúdo.</p>
            <a href="/entrar" data-track="exclusivo:login" className="fp-btn fp-btn-primary self-center">Entrar ou criar conta</a>
          </div>
        ) : (
        <div className={`grid gap-8 @2xl:gap-12 ${GRID[section.layout]} ${VALIGN[s.valign]}`}>
          {section.columns.map((col, ci) => (
            <div key={ci} className="flex min-w-0 flex-col gap-5">
              {col.map((block, bi) => (renderBlock ? renderBlock(block, ci, bi) : <BlockView key={block.id} block={block} ctx={ctx} />))}
            </div>
          ))}
        </div>
        )}
      </div>
    </section>
  );
}

/** Cor própria da página: substitui a cor principal do tema só nesta página. */
function pageColor(color?: string | null): React.CSSProperties | undefined {
  if (!color || !/^#[0-9a-f]{6}$/i.test(color)) return undefined;
  return { "--fp-primary": color } as React.CSSProperties;
}

export function PageRenderer({ content, ctx }: { content: PageContent; ctx: RenderContext }) {
  return (
    <div className="@container fp-page" style={pageColor(ctx.page?.color)}>
      {content.sections.map((s) => (
        <SectionView key={s.id} section={s} ctx={ctx} />
      ))}
    </div>
  );
}
