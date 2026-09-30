/** Ícone da marca (imagem enviada em Configurações → Identidade visual). Sem imagem, não mostra nada. */
export function BrandIcon({ url, className = "h-8", alt = "" }: { url?: string | null; className?: string; alt?: string }) {
  if (!url) return null;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt={alt} aria-hidden={alt ? undefined : true} className={`fp-icon ${className}`} />;
}
