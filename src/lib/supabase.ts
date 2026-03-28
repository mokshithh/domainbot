import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createServerClient as createSSRServerClient } from "@supabase/ssr";
import type { cookies as CookiesType } from "next/headers";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables."
  );
}

/** Browser / public client (anon key) — for direct client-side use */
export const supabase = createSupabaseClient(supabaseUrl, supabaseAnonKey);

/** Server-side admin client (service role key — never expose to browser) */
export function getServiceSupabase() {
  if (!supabaseServiceKey) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY environment variable.");
  }
  return createSupabaseClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });
}

/**
 * SSR-aware server client (anon key + cookies).
 * Use in Server Components and API Route Handlers to read the auth session.
 * Pass the cookie store from `await cookies()` (next/headers).
 */
export function createServerClient(
  cookieStore: Awaited<ReturnType<typeof CookiesType>>
) {
  return createSSRServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // setAll called from a Server Component where cookies are read-only — fine
        }
      },
    },
  });
}

/**
 * Get the authenticated user from a server context.
 * Returns null if not authenticated.
 */
export async function getAuthUser(
  cookieStore: Awaited<ReturnType<typeof CookiesType>>
) {
  const client = createServerClient(cookieStore);
  const {
    data: { user },
  } = await client.auth.getUser();
  return user;
}
