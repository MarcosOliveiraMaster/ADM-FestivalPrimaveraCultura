import type { AreaKind, PageKind } from "./types";

/** Áreas do site com listagem e páginas próprias (Eventos, Cortejos, Capacitações). */
export const AREAS: Record<AreaKind, { path: string; label: string; singular: string; nav: "eventos" | "cortejos" | "capacitacoes"; empty: string }> = {
  evento: { path: "eventos", label: "Eventos", singular: "Evento", nav: "eventos", empty: "A programação será divulgada em breve." },
  cortejo: { path: "cortejos", label: "Cortejos", singular: "Cortejo", nav: "cortejos", empty: "Os cortejos serão divulgados em breve." },
  capacitacao: { path: "capacitacoes", label: "Capacitações", singular: "Capacitação", nav: "capacitacoes", empty: "As capacitações serão divulgadas em breve." },
};

export const AREA_KINDS = Object.keys(AREAS) as AreaKind[];

export function isArea(kind: PageKind | undefined | null): kind is AreaKind {
  return !!kind && kind in AREAS;
}

export function areaByNav(nav: string) {
  return AREA_KINDS.find((k) => AREAS[k].nav === nav);
}

/** Endereço público de uma página. Institucionais continuam em /eventos/… (links antigos). */
export function pagePath(p: { kind?: PageKind | null; slug: string }) {
  if (p.kind === "home") return "/";
  return `/${isArea(p.kind) ? AREAS[p.kind].path : "eventos"}/${p.slug}`;
}
