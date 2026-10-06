// Aceita o convite da equipe: confere o token (1 hora), cria a conta já confirmada
// com o e-mail do convite e dá o acesso de equipe. Sem token válido, nada acontece.
// Pública (verify_jwt = false): a autorização é o próprio token.
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

async function sha256(text: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Método inválido" }, 405);
  try {
    const { token, name, password } = await req.json();
    if (typeof token !== "string" || token.length < 20) return json({ error: "Link de convite inválido." }, 400);
    if (typeof name !== "string" || name.trim().length < 3) return json({ error: "Informe seu nome." }, 400);
    if (typeof password !== "string" || password.length < 8) return json({ error: "A senha precisa ter pelo menos 8 caracteres." }, 400);

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: inv } = await admin.from("staff_invites").select("email, role, token_expires_at").eq("token_hash", await sha256(token)).maybeSingle();
    if (!inv) return json({ error: "Link de convite inválido ou já utilizado." }, 400);
    if (!inv.token_expires_at || new Date(inv.token_expires_at) < new Date()) return json({ error: "Este link expirou (vale 1 hora). Peça um novo convite." }, 400);

    const meta = { full_name: name.trim() };
    let userId: string | null = null;
    const created = await admin.auth.admin.createUser({ email: inv.email, password, email_confirm: true, user_metadata: meta });
    if (created.data.user) {
      userId = created.data.user.id;
    } else {
      // Já existe conta com esse e-mail (ex.: participante do site): define a senha e confirma.
      const { data: found } = await admin.rpc("staff_user_id", { p_email: inv.email });
      if (!found) return json({ error: "Não foi possível criar a conta." }, 500);
      userId = found as string;
      const upd = await admin.auth.admin.updateUserById(userId, { password, email_confirm: true, user_metadata: meta });
      if (upd.error) return json({ error: "Não foi possível atualizar a conta." }, 500);
    }

    const { error: pErr } = await admin.from("profiles").upsert({ id: userId, email: inv.email, full_name: meta.full_name, role: inv.role });
    if (pErr) {
      console.error(pErr);
      return json({ error: "Não foi possível liberar o acesso." }, 500);
    }
    await admin.from("staff_invites").delete().eq("email", inv.email);
    return json({ ok: true, email: inv.email });
  } catch (err) {
    console.error(err);
    return json({ error: "Erro inesperado" }, 500);
  }
});
