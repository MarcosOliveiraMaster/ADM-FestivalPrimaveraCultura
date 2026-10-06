// Gera o link único de convite da equipe (válido por 1 hora) e envia por e-mail.
// Só administradores podem chamar. Devolve o link para ser copiado no painel
// também (útil se o e-mail ainda não estiver configurado).
//
// Segredos: RESEND_API_KEY, EMAIL_FROM, LOGIN_URL (ex.: https://login.festivalprimaveracultural.com.br)
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
const esc = (s: unknown) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

async function sha256(text: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const { email } = await req.json();
    if (typeof email !== "string") return json({ error: "E-mail obrigatório" }, 400);
    const url = Deno.env.get("SUPABASE_URL")!;
    const asUser = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } });
    const { data: me } = await asUser.auth.getUser();
    if (!me.user) return json({ error: "Não autenticado" }, 401);
    const { data: prof } = await asUser.from("profiles").select("role, full_name").eq("id", me.user.id).maybeSingle();
    if (prof?.role !== "admin") return json({ error: "Apenas administradores podem convidar." }, 403);

    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const e = email.trim().toLowerCase();
    const { data: invite } = await admin.from("staff_invites").select("email, role").eq("email", e).maybeSingle();
    if (!invite) return json({ error: "Convite não encontrado." }, 404);

    const bytes = crypto.getRandomValues(new Uint8Array(32));
    const token = btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    const expires = new Date(Date.now() + 60 * 60 * 1000);
    const { error } = await admin.from("staff_invites").update({ token_hash: await sha256(token), token_expires_at: expires.toISOString() }).eq("email", e);
    if (error) return json({ error: "Não foi possível gerar o convite." }, 500);

    const login = (Deno.env.get("LOGIN_URL") ?? "https://login.festivalprimaveracultural.com.br").replace(/\/$/, "");
    const link = `${login}/primeiro-acesso?token=${token}`;

    let emailSent = false;
    const apiKey = Deno.env.get("RESEND_API_KEY");
    if (apiKey) {
      const { data: s } = await admin.from("site_settings").select("festival_name").eq("id", 1).maybeSingle();
      const festival = s?.festival_name ?? "Festival da Primavera";
      const papel = invite.role === "admin" ? "administrador(a)" : "editor(a)";
      const html = `
        <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#1f2a24;line-height:1.6">
          <h1 style="color:#2f6f4f;font-size:22px">Você foi convidado(a) para a equipe do ${esc(festival)}</h1>
          <p>${esc(prof.full_name || "A coordenação")} convidou você para acessar o painel administrativo como <strong>${papel}</strong>.</p>
          <p><a href="${esc(link)}" style="display:inline-block;background:#2f6f4f;color:#fff;padding:12px 22px;border-radius:999px;text-decoration:none;font-weight:bold">Criar minha conta</a></p>
          <p style="font-size:14px;color:#555">O link é pessoal e vale por <strong>1 hora</strong>. Se expirar, peça um novo convite.</p>
        </div>`;
      const r = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from: Deno.env.get("EMAIL_FROM") ?? `${festival} <onboarding@resend.dev>`, to: [e], subject: `Convite: painel do ${festival}`, html }),
      });
      emailSent = r.ok;
      if (!r.ok) console.error("resend", r.status, await r.text());
    }
    return json({ ok: true, link, expiresAt: expires.toISOString(), emailSent });
  } catch (err) {
    console.error(err);
    return json({ error: "Erro inesperado" }, 500);
  }
});
