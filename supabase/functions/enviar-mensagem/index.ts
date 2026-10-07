// Envio de mensagens em massa (comunicados) para um grupo de cadastrados.
// Só administradores. Cada pessoa recebe um e-mail individual (ninguém vê o endereço dos outros).
//
// Públicos (audience):
//   { type: "capacitacao", page_id }   inscritos de uma capacitação
//   { type: "capacitacoes" }           inscritos de todas as capacitações
//   { type: "evento", page_id }        inscritos de um evento
//   { type: "eventos" }                inscritos de todos os eventos
//   { type: "leads", only_newsletter } leads do formulário principal (Inscritos)
// Com { test: true } envia só para o e-mail de quem está enviando.
//
// Segredos: RESEND_API_KEY (BREVO_API_KEY opcional), EMAIL_FROM
import { createClient } from "npm:@supabase/supabase-js@2";
import { hasEmailProvider, sendEmail } from "./email.ts";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
const esc = (s: unknown) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const MAX_RECIPIENTS = 2000;

type Audience =
  | { type: "capacitacao" | "evento"; page_id: string }
  | { type: "capacitacoes" | "eventos" }
  | { type: "leads"; only_newsletter?: boolean };

interface Person { email: string; name: string }

/** Texto simples -> HTML (linha em branco separa parágrafos; links viram clicáveis). */
function toHtml(text: string) {
  return text.trim().split(/\n\s*\n/).filter(Boolean).map((p) =>
    `<p style="margin:0 0 14px">${esc(p).replace(/\n/g, "<br>").replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" style="color:#2f6f4f">$1</a>')}</p>`
  ).join("");
}

function render(body: string, festival: string, person: Person) {
  const first = person.name.trim().split(/\s+/)[0] || "";
  const text = body.replace(/\{\{\s*nome\s*\}\}/gi, first);
  return `
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#1f2a24;line-height:1.6">
      ${toHtml(text)}
      <hr style="border:none;border-top:1px solid #ddd;margin:24px 0 12px">
      <p style="font-size:12px;color:#777">Você recebeu esta mensagem porque se cadastrou no ${esc(festival)}.</p>
    </div>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const { subject, message, audience, audience_label, test } = (await req.json()) as { subject: string; message: string; audience: Audience; audience_label?: string; test?: boolean };
    if (!subject?.trim() || !message?.trim()) return json({ error: "Assunto e mensagem são obrigatórios." }, 400);
    if (!audience?.type) return json({ error: "Escolha o público." }, 400);

    const url = Deno.env.get("SUPABASE_URL")!;
    const asUser = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } });
    const { data: me } = await asUser.auth.getUser();
    if (!me.user) return json({ error: "Não autenticado" }, 401);
    const { data: prof } = await asUser.from("profiles").select("role, full_name, email").eq("id", me.user.id).maybeSingle();
    if (prof?.role !== "admin") return json({ error: "Apenas administradores podem enviar mensagens." }, 403);
    if (!hasEmailProvider()) return json({ error: "Envio de e-mail não configurado (RESEND_API_KEY)." }, 503);

    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: s } = await admin.from("site_settings").select("festival_name").eq("id", 1).maybeSingle();
    const festival = s?.festival_name ?? "Festival Primavera Cultural";

    if (test) {
      const person = { email: prof.email ?? me.user.email!, name: prof.full_name ?? "" };
      try {
        await sendEmail({ to: person.email, subject: `[TESTE] ${subject}`, html: render(message, festival, person), fromName: festival });
      } catch (e) {
        console.error(e);
        return json({ error: "Falha no envio do teste. Confira a chave do Resend e o domínio verificado." }, 502);
      }
      return json({ ok: true, test: true, to: person.email });
    }

    // Monta a lista de destinatários.
    let rows: { email: string | null; name: string | null }[] = [];
    if (audience.type === "capacitacao" || audience.type === "capacitacoes") {
      let q = admin.from("training_registrations").select("email, name");
      if (audience.type === "capacitacao") q = q.eq("page_id", audience.page_id);
      rows = (await q).data ?? [];
    } else if (audience.type === "evento" || audience.type === "eventos") {
      let q = admin.from("registrations").select("email, name:full_name");
      if (audience.type === "evento") q = q.eq("page_id", audience.page_id);
      rows = (await q).data ?? [];
    } else if (audience.type === "leads") {
      let q = admin.from("form_submissions").select("email, name");
      if (audience.only_newsletter) q = q.eq("newsletter", true);
      rows = (await q).data ?? [];
    } else return json({ error: "Público inválido." }, 400);

    const seen = new Map<string, Person>();
    for (const r of rows) {
      const e = (r.email ?? "").trim().toLowerCase();
      if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) && !seen.has(e)) seen.set(e, { email: e, name: r.name ?? "" });
    }
    const people = [...seen.values()];
    if (!people.length) return json({ error: "Nenhum destinatário nesse público." }, 400);
    if (people.length > MAX_RECIPIENTS) return json({ error: `Público grande demais (${people.length}). Limite: ${MAX_RECIPIENTS} por envio.` }, 400);

    const { data: camp } = await admin.from("email_campaigns").insert({
      subject, body: message, audience, audience_label: audience_label ?? null, recipients: people.length, created_by: me.user.id,
    }).select("id").single();

    const from = Deno.env.get("EMAIL_FROM") ?? `${festival} <onboarding@resend.dev>`;
    const resendKey = Deno.env.get("RESEND_API_KEY");
    let sent = 0, failed = 0;
    const errors: string[] = [];

    // Lotes de 100 pela API de lote do Resend; se o lote falhar, tenta um a um (Resend e depois Brevo).
    for (let i = 0; i < people.length; i += 100) {
      const chunk = people.slice(i, i + 100);
      let done = false;
      if (resendKey) {
        const r = await fetch("https://api.resend.com/emails/batch", {
          method: "POST",
          headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
          body: JSON.stringify(chunk.map((p) => ({ from, to: [p.email], subject, html: render(message, festival, p) }))),
        });
        if (r.ok) { sent += chunk.length; done = true; }
        else errors.push(`resend lote ${r.status}: ${(await r.text()).slice(0, 300)}`);
      }
      if (!done) {
        for (const p of chunk) {
          try { await sendEmail({ to: p.email, subject, html: render(message, festival, p), fromName: festival }); sent++; }
          catch (e) { failed++; if (errors.length < 5) errors.push(String(e).slice(0, 300)); }
          await sleep(250);
        }
      }
      await sleep(600); // respeita o limite de requisições por segundo
    }

    const status = failed === 0 ? "sent" : sent === 0 ? "failed" : "partial";
    if (camp) await admin.from("email_campaigns").update({ sent, failed, status, error: errors.join(" | ") || null, finished_at: new Date().toISOString() }).eq("id", camp.id);
    if (errors.length) console.error(errors);
    return json({ ok: sent > 0, sent, failed, recipients: people.length, error: sent === 0 ? "Nenhum e-mail foi enviado. Veja o histórico para o motivo." : undefined });
  } catch (e) {
    console.error(e);
    return json({ error: "Erro inesperado" }, 500);
  }
});
