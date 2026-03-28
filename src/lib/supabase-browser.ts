"use client";

import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser Supabase client — stores session in cookies (accessible to SSR).
 * Use this in client components for auth operations.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
