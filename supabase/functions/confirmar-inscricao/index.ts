// E-mail de confirmação de inscrição (Resend), com link do Google Agenda e arquivo .ics.
//
// O site público chama esta função logo após a inscrição, com o token do participante.
// Ela só envia para a própria inscrição de quem chamou (RLS) e só uma vez (email_sent_at).
//
// Segredos (Supabase → Edge Functions → Secrets):
//   RESEND_API_KEY   chave da conta Resend (BREVO_API_KEY opcional como reserva)
//   EMAIL_FROM       remetente, ex.: "Festival da Primavera <contato@seudominio.com.br>"
//                    (sem domínio verificado no Resend use "onboarding@resend.dev", só envia para o dono da conta)
//   SITE_URL         endereço do site público, ex.: https://festival.vercel.app (para os links do e-mail)
import { createClient } from "npm:@supabase/supabase-js@2";
import { hasEmailProvider, sendEmail } from "./email.ts";

const TZ = "America/Sao_Paulo";
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
}

function esc(s: unknown) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

const utc = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

function quando(start: string | null, end: string | null) {
  if (!start) return "Data a confirmar";
  const d = new Intl.DateTimeFormat("pt-BR", { timeZone: TZ, weekday: "long", day: "2-digit", month: "long", hour: "2-digit", minute: "2-digit" }).format(new Date(start));
  const e = end ? new Intl.DateTimeFormat("pt-BR", { timeZone: TZ, hour: "2-digit", minute: "2-digit" }).format(new Date(end)) : null;
  return e ? `${d} – ${e}` : d;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const { registration_id } = await req.json();
    if (typeof registration_id !== "string") return json({ error: "registration_id obrigatório" }, 400);

    const url = Deno.env.get("SUPABASE_URL")!;
    const asUser = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    });
    const { data: r } = await asUser
      .from("registrations")
      .select("id, full_name, email, email_sent_at, page_id, pages(title, slug, starts_at, ends_at, location)")
      .eq("id", registration_id)
      .maybeSingle();
    if (!r) return json({ error: "Inscrição não encontrada" }, 404);
    if (r.email_sent_at) return json({ ok: true, alreadySent: true });

    if (!hasEmailProvider()) return json({ error: "Envio de e-mail não configurado" }, 503);

    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: settings } = await admin.from("site_settings").select("festival_name").eq("id", 1).maybeSingle();
    const festival = settings?.festival_name ?? "Festival da Primavera";
    const p = (r as unknown as { pages: { title: string; slug: string; starts_at: string | null; ends_at: string | null; location: string | null } }).pages;
    const site = (Deno.env.get("SITE_URL") ?? "").replace(/\/$/, "");

    const end = p.ends_at ?? (p.starts_at ? new Date(new Date(p.starts_at).getTime() + 2 * 3600e3).toISOString() : null);
    const agenda = p.starts_at
      ? "https://calendar.google.com/calendar/render?" +
        new URLSearchParams({ action: "TEMPLATE", text: `${p.title} – ${festival}`, dates: `${utc(p.starts_at)}/${utc(end!)}`, location: p.location ?? "", details: `Inscrição confirmada no ${festival}.` })
      : null;

    const icsEsc = (v: string) => v.replace(/([,;\\])/g, "\\$1").replace(/\n/g, "\\n");
    const ics = p.starts_at
      ? [
          "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Festival da Primavera//PT-BR", "METHOD:PUBLISH", "BEGIN:VEVENT",
          `UID:${r.page_id}@festival-da-primavera`, `DTSTAMP:${utc(new Date().toISOString())}`,
          `DTSTART:${utc(p.starts_at)}`, `DTEND:${utc(end!)}`,
          `SUMMARY:${icsEsc(`${p.title} – ${festival}`)}`, p.location ? `LOCATION:${icsEsc(p.location)}` : "",
          "BEGIN:VALARM", "TRIGGER:-P1D", "ACTION:DISPLAY", `DESCRIPTION:${icsEsc(p.title)}`, "END:VALARM",
          "END:VEVENT", "END:VCALENDAR",
        ].filter(Boolean).join("\r\n")
      : null;

    const btn = (href: string, label: string) =>
      `<a href="${esc(href)}" style="display:inline-block;background:#2f6f4f;color:#fff;padding:12px 22px;border-radius:999px;text-decoration:none;font-weight:bold;margin:4px 6px 4px 0">${label}</a>`;
    const html = `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#1f2a24;line-height:1.6">
        <h1 style="color:#2f6f4f;font-size:24px">Inscrição confirmada! ✿</h1>
        <p>Olá, ${esc(r.full_name)}.</p>
        <p>Sua inscrição em <strong>${esc(p.title)}</strong> do ${esc(festival)} foi confirmada.</p>
        <p><strong>Quando:</strong> ${esc(quando(p.starts_at, p.ends_at))}<br><strong>Onde:</strong> ${esc(p.location ?? "Local a definir")}</p>
        <p>${agenda ? btn(agenda, "Adicionar ao Google Agenda") : ""}${site ? btn(`${site}/eventos/${p.slug}`, "Ver evento") : ""}</p>
        <p style="font-size:14px;color:#555">Depois do evento, com a presença confirmada pela organização, seu certificado fica disponível em ${site ? `<a href="${esc(site)}/minha-conta">Minha conta</a>` : "Minha conta"}.</p>
      </div>`;

    try {
      await sendEmail({
        to: r.email,
        subject: `Inscrição confirmada: ${p.title}`,
        html,
        fromName: festival,
        attachments: ics ? [{ filename: "evento.ics", content: btoa(String.fromCharCode(...new TextEncoder().encode(ics))) }] : undefined,
      });
    } catch (e) {
      console.error(e);
      return json({ error: "Falha no envio do e-mail" }, 502);
    }
    await admin.from("registrations").update({ email_sent_at: new Date().toISOString() }).eq("id", r.id);
    return json({ ok: true });
  } catch (e) {
    console.error(e);
    return json({ error: "Erro inesperado" }, 500);
  }
});
