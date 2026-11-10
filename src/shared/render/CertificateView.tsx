"use client";
import type { CSSProperties, PointerEvent as ReactPointerEvent, Ref } from "react";
import type { Theme } from "../types";
import { findFont, themeCss } from "../theme";
import { fillText, type CertBlock, type CertTemplate } from "../certificate";

/** Pilha CSS da fonte de um bloco: fontes do tema ("heading"/"body") ou do catálogo. */
export function certFontFamily(font: string) {
  if (font === "heading") return "var(--fp-font-heading)";
  if (font === "body") return "var(--fp-font-body)";
  const f = findFont(font);
  return f?.stack ?? `"${font.replace(/"/g, "")}", Arial, sans-serif`;
}

export function certBlockStyle(b: CertBlock): CSSProperties {
  return {
    position: "absolute",
    left: `${b.x}%`,
    top: `${b.y}%`,
    width: `${b.w}%`,
    fontFamily: certFontFamily(b.font),
    fontSize: `calc(${b.size} * 0.1cqw)`,
    lineHeight: 1.25,
    color: b.color,
    fontWeight: b.bold ? 700 : 400,
    fontStyle: b.italic ? "italic" : "normal",
    textTransform: b.upper ? "uppercase" : "none",
    letterSpacing: b.upper ? "0.08em" : undefined,
    textAlign: b.align,
    whiteSpace: "pre-wrap",
    overflowWrap: "break-word",
  };
}

/**
 * Desenha o certificado a partir do modelo. Usado no site (página do certificado),
 * no editor do ADM (com `edit`) e na geração do PDF.
 */
export function CertificateView({
  template: t,
  values,
  qr,
  theme,
  rootRef,
  edit,
}: {
  template: CertTemplate;
  values: Record<string, string>;
  /** Imagem (data URL) do QR code de validação. */
  qr?: string | null;
  theme?: Theme;
  rootRef?: Ref<HTMLDivElement>;
  edit?: {
    selected: string | null;
    onPointerDown: (e: ReactPointerEvent, id: string) => void;
  };
}) {
  const landscape = t.orientation !== "portrait";
  return (
    <div
      ref={rootRef}
      className="fp-certv"
      style={{
        position: "relative",
        width: "100%",
        aspectRatio: landscape ? "297 / 210" : "210 / 297",
        containerType: "inline-size",
        overflow: "hidden",
        backgroundColor: t.bgColor || "#ffffff",
        backgroundImage: t.background ? `url("${t.background}")` : undefined,
        backgroundSize: "cover",
        backgroundPosition: "center",
        color: "#1f2a24",
        userSelect: edit ? "none" : undefined,
      }}
    >
      {theme && <style>{themeCss(theme, ".fp-certv")}</style>}
      {t.frame && (
        <>
          <div aria-hidden style={{ position: "absolute", inset: "2.2%", border: `0.45cqw solid ${t.frame}`, borderRadius: "0.6cqw", pointerEvents: "none" }} />
          <div aria-hidden style={{ position: "absolute", inset: "3.4%", border: `0.12cqw solid ${t.frame}`, borderRadius: "0.4cqw", pointerEvents: "none", opacity: 0.6 }} />
        </>
      )}
      {t.blocks.map((b) => (
        <div
          key={b.id}
          style={{
            ...certBlockStyle(b),
            ...(edit
              ? {
                  cursor: "move",
                  outline: edit.selected === b.id ? "2px solid #2f6f4f" : "1px dashed rgba(47,111,79,.35)",
                  outlineOffset: 2,
                  background: edit.selected === b.id ? "rgba(47,111,79,.06)" : undefined,
                }
              : {}),
          }}
          onPointerDown={edit ? (e) => edit.onPointerDown(e, b.id) : undefined}
        >
          {fillText(b.text, values) || (edit ? <span style={{ opacity: 0.4 }}>(vazio)</span> : null)}
        </div>
      ))}
      {t.qr.enabled && (
        <div
          style={{
            position: "absolute",
            left: `${t.qr.x}%`,
            top: `${t.qr.y}%`,
            width: `${t.qr.size}%`,
            textAlign: "center",
            fontFamily: "var(--fp-font-body, Arial, sans-serif)",
            fontSize: "1.1cqw",
            color: "#555",
            cursor: edit ? "move" : undefined,
            outline: edit ? (edit.selected === "qr" ? "2px solid #2f6f4f" : "1px dashed rgba(47,111,79,.35)") : undefined,
            outlineOffset: 2,
          }}
          onPointerDown={edit ? (e) => edit.onPointerDown(e, "qr") : undefined}
        >
          {qr ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qr} alt="QR code de validação" draggable={false} style={{ display: "block", width: "100%", height: "auto", background: "#fff", padding: "4%" }} />
          ) : (
            <div style={{ width: "100%", aspectRatio: "1", background: "repeating-conic-gradient(#1f2a24 0 25%, #fff 0 50%) 0 0 / 20% 20%" }} />
          )}
          {t.qr.label && <div style={{ marginTop: "4%" }}>{t.qr.label}</div>}
        </div>
      )}
    </div>
  );
}
