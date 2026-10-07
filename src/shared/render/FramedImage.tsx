import type { CSSProperties } from "react";
import { frameStyle, parseImage } from "../image";

/**
 * <img> que respeita o enquadramento salvo no endereço (posição + zoom).
 * O elemento pai deve ter overflow-hidden quando houver zoom.
 */
export function FramedImage({ url, alt = "", className = "", style, loading = "lazy", onClick }: {
  url?: string | null;
  alt?: string;
  className?: string;
  style?: CSSProperties;
  loading?: "lazy" | "eager";
  onClick?: () => void;
}) {
  const { src, frame } = parseImage(url);
  if (!src) return null;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} loading={loading} onClick={onClick} className={className} style={{ ...frameStyle(frame), ...style }} />;
}
