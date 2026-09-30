import { FramedImage } from "./FramedImage";

/** Ícone da marca (imagem enviada em Configurações → Identidade visual). Sem imagem, não mostra nada. */
export function BrandIcon({ url, className = "h-8", alt = "" }: { url?: string | null; className?: string; alt?: string }) {
  if (!url) return null;
  return (
    <span className={`fp-icon inline-flex shrink-0 overflow-hidden ${className}`} aria-hidden={alt ? undefined : true}>
      <FramedImage url={url} alt={alt} className="h-full w-auto object-contain" />
    </span>
  );
}
