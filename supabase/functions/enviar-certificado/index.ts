// Envia por e-mail o link do certificado para participantes com presença confirmada.
// Vale para eventos, cortejos e capacitações (todas as inscrições em training_registrations).
// Só a equipe (perfil em profiles). Corpo: { ids: string[] } (até 100; "kind" é aceito e ignorado).
// Inscrições sem presença são ignoradas. Reenviar é permitido (atualiza certificate_sent_at).
//
// Segredos: RESEND_API_KEY (BREVO_API_KEY opcional como reserva), EMAIL_FROM, SITE_URL
import { createClient } from "npm:@supabase/supabase-js@2";
import { hasEmailProvider, sendEmail } from "./email.ts";

const TZ = "America/Sao_Paulo";
const MAX = 100;
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
const esc = (s: unknown) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface Page { title: string; starts_at: string | null; location: string | null; certificate_hours: number | null }
interface Row { id: string; name: string; email: string; attended: boolean; certificate_code: string; pages: Page | null }

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const { ids } = (await req.json()) as { ids: string[] };
    if (!Array.isArray(ids) || !ids.length) return json({ error: "Nenhuma inscrição informada." }, 400);
    if (ids.length > MAX) return json({ error: `Máximo de ${MAX} por envio.` }, 400);

    const url = Deno.env.get("SUPABASE_URL")!;
    const asUser = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } });
    const { data: me } = await asUser.auth.getUser();
    if (!me.user) return json({ error: "Não autenticado" }, 401);
    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: staff } = await admin.from("profiles").select("id").eq("id", me.user.id).maybeSingle();
    if (!staff) return json({ error: "Apenas a equipe pode enviar certificados." }, 403);
    if (!hasEmailProvider()) return json({ error: "Envio de e-mail não configurado (RESEND_API_KEY / BREVO_API_KEY)." }, 503);

    const table = "training_registrations";
    const { data, error } = await admin
      .from(table)
      .select("id, name, email, attended, certificate_code, pages(title, starts_at, location, certificate_hours)")
      .in("id", ids);
    if (error) return json({ error: error.message }, 500);

    const { data: s } = await admin.from("site_settings").select("festival_name").eq("id", 1).maybeSingle();
    const festival = s?.festival_name ?? "Festival da Primavera";
    const site = (Deno.env.get("SITE_URL") ?? "https://festivalprimaveracultural.com.br").replace(/\/$/, "");

    let sent = 0;
    let skipped = 0;
    const failed: string[] = [];
    for (const r of (data ?? []) as unknown as Row[]) {
      if (!r.attended || !r.pages) {
        skipped++;
        continue;
      }
      const p = r.pages;
      const link = `${site}/certificado/${r.certificate_code}`;
      const when = p.starts_at ? new Intl.DateTimeFormat("pt-BR", { timeZone: TZ, day: "2-digit", month: "long", year: "numeric" }).format(new Date(p.starts_at)) : null;
      const first = r.name.trim().split(/\s+/)[0] || r.name;
      const html = `
        <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#1f2a24;line-height:1.6">
          <h1 style="color:#2f6f4f;font-size:24px">Seu certificado está pronto! ✿</h1>
          <p>Olá, ${esc(first)}.</p>
          <p>Obrigado por participar de <strong>${esc(p.title)}</strong>${when ? `, em ${esc(when)}` : ""}${p.location ? ` (${esc(p.location)})` : ""}, no ${esc(festival)}.</p>
          ${p.certificate_hours ? `<p>Carga horária: <strong>${esc(Number(p.certificate_hours))}h</strong></p>` : ""}
          <p><a href="${esc(link)}" style="display:inline-block;background:#2f6f4f;color:#fff;padding:12px 22px;border-radius:999px;text-decoration:none;font-weight:bold">Ver e baixar o certificado</a></p>
          <p style="font-size:14px">Na página do certificado, clique em “Baixar PDF” para guardar uma cópia.<br>Código de validação: <strong>${esc(r.certificate_code)}</strong></p>
          <p style="font-size:13px;color:#777">Qualquer pessoa pode conferir a autenticidade pelo QR code do certificado ou pelo link acima.</p>
        </div>`;
      try {
        await sendEmail({ to: r.email, subject: `Seu certificado: ${p.title}`, html, fromName: festival });
        await admin.from(table).update({ certificate_sent_at: new Date().toISOString() }).eq("id", r.id);
        sent++;
      } catch (e) {
        console.error(e);
        failed.push(r.email);
      }
      await sleep(120); // respeita o limite de envios por segundo dos provedores
    }
    return json({ ok: true, sent, skipped, failed: failed.length, failed_emails: failed });
  } catch (err) {
    console.error(err);
    return json({ error: "Erro inesperado" }, 500);
  }
});
