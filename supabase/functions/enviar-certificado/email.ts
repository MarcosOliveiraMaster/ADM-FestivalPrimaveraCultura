// Envio de e-mail compartilhado pelas Edge Functions.
// Tenta o Resend; se falhar (ex.: limite diário do plano grátis) e houver BREVO_API_KEY,
// usa o Brevo como reserva. Copiado como ./email.ts em cada função (ver README).
//
// Segredos: RESEND_API_KEY, EMAIL_FROM ("Nome <email@dominio>"), BREVO_API_KEY (opcional)

export interface Mail {
  to: string;
  subject: string;
  html: string;
  attachments?: { filename: string; content: string }[]; // content em base64
  fromName?: string;
}

function parseFrom(fallbackName: string) {
  const raw = Deno.env.get("EMAIL_FROM") ?? `${fallbackName} <onboarding@resend.dev>`;
  const m = raw.match(/^\s*(.*?)\s*<([^>]+)>\s*$/);
  return { raw, name: m ? m[1] : fallbackName, email: m ? m[2] : raw.trim() };
}

export function hasEmailProvider() {
  return !!(Deno.env.get("RESEND_API_KEY") || Deno.env.get("BREVO_API_KEY"));
}

/** Devolve o provedor usado ("resend" | "brevo") ou lança erro se nenhum conseguiu enviar. */
export async function sendEmail(mail: Mail): Promise<"resend" | "brevo"> {
  const from = parseFrom(mail.fromName ?? "Festival Primavera Cultural");
  const errors: string[] = [];

  const resendKey = Deno.env.get("RESEND_API_KEY");
  if (resendKey) {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: from.raw, to: [mail.to], subject: mail.subject, html: mail.html, attachments: mail.attachments }),
    });
    if (r.ok) return "resend";
    errors.push(`resend ${r.status}: ${await r.text()}`);
  }

  const brevoKey = Deno.env.get("BREVO_API_KEY");
  if (brevoKey) {
    const r = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { "api-key": brevoKey, "Content-Type": "application/json", accept: "application/json" },
      body: JSON.stringify({
        sender: { name: from.name, email: from.email },
        to: [{ email: mail.to }],
        subject: mail.subject,
        htmlContent: mail.html,
        attachment: mail.attachments?.map((a) => ({ name: a.filename, content: a.content })),
      }),
    });
    if (r.ok) return "brevo";
    errors.push(`brevo ${r.status}: ${await r.text()}`);
  }

  throw new Error(errors.length ? errors.join(" | ") : "Nenhum provedor de e-mail configurado (RESEND_API_KEY / BREVO_API_KEY).");
}
