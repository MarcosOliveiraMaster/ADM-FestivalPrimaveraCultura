import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { ADM_URL, COOKIE_OPTIONS, LOGIN_URL } from "@/lib/supabase/env";

/** Telas de acesso (servidas em login.* quando os domínios estão configurados). */
const AUTH_PAGES = ["/login", "/primeiro-acesso", "/esqueci-senha", "/redefinir-senha", "/auth"];

const host = (u: string) => (u ? new URL(u).host : "");

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    cookieOptions: COOKIE_OPTIONS,
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (toSet) => {
        toSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        toSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  const { data } = await supabase.auth.getClaims();
  const logged = !!data?.claims;
  const { pathname: path, search } = request.nextUrl;
  const isAuthPage = AUTH_PAGES.some((p) => path === p || path.startsWith(p + "/"));
  const reqHost = request.headers.get("host") ?? "";
  const split = !!(LOGIN_URL && ADM_URL);

  const go = (url: string) => {
    const r = NextResponse.redirect(url);
    response.cookies.getAll().forEach((c) => r.cookies.set(c));
    return r;
  };

  if (split && reqHost === host(LOGIN_URL)) {
    // login.festival…: só telas de acesso; o resto vai para adm.festival…
    if (path === "/" || path === "/login") {
      if (logged) return go(`${ADM_URL}${request.nextUrl.searchParams.get("next") ?? "/"}`);
      if (path === "/") {
        const url = request.nextUrl.clone();
        url.pathname = "/login";
        const r = NextResponse.rewrite(url);
        response.cookies.getAll().forEach((c) => r.cookies.set(c));
        return r;
      }
      return response;
    }
    if (isAuthPage) return response;
    return go(`${ADM_URL}${path}${search}`);
  }

  if (split && reqHost === host(ADM_URL) && isAuthPage && !path.startsWith("/auth")) {
    return go(`${LOGIN_URL}${path === "/login" ? "/" : path}${search}`);
  }

  if (!logged && !isAuthPage) {
    const next = path === "/" ? "" : `?next=${encodeURIComponent(path + search)}`;
    if (split) return go(`${LOGIN_URL}/${next}`);
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = next;
    return NextResponse.redirect(url);
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
