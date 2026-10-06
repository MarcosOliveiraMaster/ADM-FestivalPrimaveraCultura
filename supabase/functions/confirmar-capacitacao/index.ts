// E-mail de confirmação da inscrição em capacitação (sem login).
// Chamado pelo site logo após a inscrição; só envia uma vez e só para inscrições
// criadas nos últimos 15 minutos (não serve para disparar e-mails arbitrários).
//
// Segredos: RESEND_API_KEY, EMAIL_FROM, SITE_URL
import { createClient } from "npm:@supabase/supabase-js@2";

const TZ = "America/Sao_Paulo";
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
const esc = (s: unknown) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
const utc = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const { registration_id } = await req.json();
    if (typeof registration_id !== "string") return json({ error: "registration_id obrigatório" }, 400);
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: r } = await admin
      .from("training_registrations")
      .select("id, name, email, email_sent_at, created_at, pages(title, slug, starts_at, ends_at, location)")
      .eq("id", registration_id)
      .maybeSingle();
    if (!r) return json({ error: "Inscrição não encontrada" }, 404);
    if (r.email_sent_at) return json({ ok: true, alreadySent: true });
    if (Date.now() - new Date(r.created_at).getTime() > 15 * 60 * 1000) return json({ error: "Inscrição antiga" }, 400);

    const apiKey = Deno.env.get("RESEND_API_KEY");
    if (!apiKey) return json({ error: "RESEND_API_KEY não configurada" }, 503);
    const { data: s } = await admin.from("site_settings").select("festival_name").eq("id", 1).maybeSingle();
    const festival = s?.festival_name ?? "Festival da Primavera";
    const p = (r as unknown as { pages: { title: string; slug: string; starts_at: string | null; ends_at: string | null; location: string | null } }).pages;
    const site = (Deno.env.get("SITE_URL") ?? "https://festivalprimaveracultural.com.br").replace(/\/$/, "");
    const when = p.starts_at
      ? new Intl.DateTimeFormat("pt-BR", { timeZone: TZ, weekday: "long", day: "2-digit", month: "long", hour: "2-digit", minute: "2-digit" }).format(new Date(p.starts_at))
      : "Data a confirmar";
    const end = p.ends_at ?? (p.starts_at ? new Date(new Date(p.starts_at).getTime() + 2 * 3600e3).toISOString() : null);
    const agenda = p.starts_at
      ? "https://calendar.google.com/calendar/render?" + new URLSearchParams({ action: "TEMPLATE", text: `${p.title} – ${festival}`, dates: `${utc(p.starts_at)}/${utc(end!)}`, location: p.location ?? "" })
      : null;
    const btn = (href: string, label: string) =>
      `<a href="${esc(href)}" style="display:inline-block;background:#2f6f4f;color:#fff;padding:12px 22px;border-radius:999px;text-decoration:none;font-weight:bold;margin:4px 6px 4px 0">${label}</a>`;
    const html = `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#1f2a24;line-height:1.6">
        <h1 style="color:#2f6f4f;font-size:24px">Inscrição na capacitação confirmada! ✿</h1>
        <p>Olá, ${esc(r.name)}.</p>
        <p>Recebemos sua inscrição em <strong>${esc(p.title)}</strong> (${esc(festival)}).</p>
        <p><strong>Quando:</strong> ${esc(when)}<br><strong>Onde:</strong> ${esc(p.location ?? "Local a definir")}</p>
        <p>${agenda ? btn(agenda, "Adicionar ao Google Agenda") : ""}${btn(`${site}/capacitacoes/${p.slug}`, "Ver capacitação")}</p>
        <p style="font-size:13px;color:#777">Se você não fez esta inscrição, ignore este e-mail.</p>
      </div>`;
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: Deno.env.get("EMAIL_FROM") ?? `${festival} <onboarding@resend.dev>`, to: [r.email], subject: `Inscrição confirmada: ${p.title}`, html }),
    });
    if (!res.ok) {
      console.error("resend", res.status, await res.text());
      return json({ error: "Falha no envio" }, 502);
    }
    await admin.from("training_registrations").update({ email_sent_at: new Date().toISOString() }).eq("id", r.id);
    return json({ ok: true });
  } catch (err) {
    console.error(err);
    return json({ error: "Erro inesperado" }, 500);
  }
});
