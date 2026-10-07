/** Tamanho legível (KB/MB). Fica fora de media.ts ("use client") para poder ser usado em páginas do servidor. */
export function formatBytes(n: number | null) {
  if (!n) return "";
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}
