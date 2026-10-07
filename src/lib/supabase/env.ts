export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
export const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
export const MEDIA_BUCKET = "media";

/**
 * Domínios do painel (produção):
 *   NEXT_PUBLIC_LOGIN_URL = https://login.festivalprimaveracultural.com.br  (tela de entrada)
 *   NEXT_PUBLIC_ADM_URL   = https://adm.festivalprimaveracultural.com.br    (área administrativa)
 *   NEXT_PUBLIC_COOKIE_DOMAIN = .festivalprimaveracultural.com.br         (sessão vale nos dois subdomínios)
 * Sem essas variáveis (localhost, *.vercel.app) tudo funciona num único endereço.
 */
export const LOGIN_URL = (process.env.NEXT_PUBLIC_LOGIN_URL || "").replace(/\/$/, "");
export const ADM_URL = (process.env.NEXT_PUBLIC_ADM_URL || "").replace(/\/$/, "");
const COOKIE_DOMAIN = process.env.NEXT_PUBLIC_COOKIE_DOMAIN || "";

/** Cookie próprio do painel: não se mistura com a sessão dos participantes no site público. */
export const COOKIE_OPTIONS = COOKIE_DOMAIN
  ? { name: "sb-adm-auth", domain: COOKIE_DOMAIN, path: "/", sameSite: "lax" as const, secure: true }
  : { name: "sb-adm-auth" };
