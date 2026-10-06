import { createBrowserClient } from "@supabase/ssr";
import { COOKIE_OPTIONS, SUPABASE_KEY, SUPABASE_URL } from "./env";

export function createClient() {
  return createBrowserClient(SUPABASE_URL, SUPABASE_KEY, { cookieOptions: COOKIE_OPTIONS });
}
