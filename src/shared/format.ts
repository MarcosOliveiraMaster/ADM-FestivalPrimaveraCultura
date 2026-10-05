const TZ = "America/Sao_Paulo";

export function formatDate(iso: string | null | undefined, opts: Intl.DateTimeFormatOptions = { day: "2-digit", month: "long", year: "numeric" }) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return new Intl.DateTimeFormat("pt-BR", { timeZone: TZ, ...opts }).format(d);
}

export function formatDateTime(iso: string | null | undefined) {
  return formatDate(iso, { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function formatRange(start: string | null | undefined, end: string | null | undefined) {
  const s = formatDate(start, { weekday: "short", day: "2-digit", month: "long", hour: "2-digit", minute: "2-digit" });
  if (!s) return null;
  const e = end ? formatDate(end, { hour: "2-digit", minute: "2-digit" }) : null;
  return e ? `${s} – ${e}` : s;
}

export function slugify(input: string) {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/** Converte links de YouTube/Vimeo/Instagram em URL de incorporação. */
export function videoEmbedUrl(url: string | undefined): { kind: "iframe" | "file"; src: string } | null {
  if (!url) return null;
  const u = url.trim();
  let m = u.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/|live\/)|youtu\.be\/)([\w-]{6,})/);
  if (m) return { kind: "iframe", src: `https://www.youtube-nocookie.com/embed/${m[1]}` };
  m = u.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (m) return { kind: "iframe", src: `https://player.vimeo.com/video/${m[1]}` };
  m = u.match(/instagram\.com\/(?:p|reel|tv)\/([\w-]+)/);
  if (m) return { kind: "iframe", src: `https://www.instagram.com/p/${m[1]}/embed` };
  if (/\.(mp4|webm)(\?|$)/i.test(u)) return { kind: "file", src: u };
  return null;
}

/** Parâmetros de reprodução automática (sempre sem som) para YouTube e Vimeo. */
export function autoplayEmbedUrl(src: string, loop = true) {
  const yt = src.match(/youtube-nocookie\.com\/embed\/([\w-]+)/);
  if (yt) {
    const p = new URLSearchParams({ autoplay: "1", mute: "1", playsinline: "1", rel: "0" });
    if (loop) {
      p.set("loop", "1");
      p.set("playlist", yt[1]);
    }
    return `${src}?${p}`;
  }
  if (/player\.vimeo\.com/.test(src)) return `${src}?autoplay=1&muted=1${loop ? "&loop=1" : ""}`;
  return src;
}

export function googleCalendarUrl(title: string, start?: string | null, end?: string | null, location?: string | null) {
  if (!start) return null;
  const f = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const e = end ?? new Date(new Date(start).getTime() + 2 * 3600 * 1000).toISOString();
  const p = new URLSearchParams({ action: "TEMPLATE", text: title, dates: `${f(start)}/${f(e)}` });
  if (location) p.set("location", location);
  return `https://calendar.google.com/calendar/render?${p}`;
}

/** Arquivo .ics (Apple, Outlook, Google) com lembrete um dia antes. */
export function icsFile(title: string, start: string, end: string | null | undefined, location: string | null | undefined, uidSeed: string) {
  const f = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const e = end ?? new Date(new Date(start).getTime() + 2 * 3600 * 1000).toISOString();
  const esc = (v: string) => v.replace(/([,;\\])/g, "\\$1").replace(/\n/g, "\\n");
  return [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Festival da Primavera//PT-BR", "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uidSeed}@festival-da-primavera`,
    `DTSTAMP:${f(new Date().toISOString())}`,
    `DTSTART:${f(start)}`,
    `DTEND:${f(e)}`,
    `SUMMARY:${esc(title)}`,
    location ? `LOCATION:${esc(location)}` : "",
    "BEGIN:VALARM", "TRIGGER:-P1D", "ACTION:DISPLAY", `DESCRIPTION:${esc(title)}`, "END:VALARM",
    "END:VEVENT", "END:VCALENDAR",
  ].filter(Boolean).join("\r\n");
}

export function currentTime() {
  return Date.now();
}
