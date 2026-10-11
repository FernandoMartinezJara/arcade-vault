// Supabase client for client components ("use client").
import { createBrowserClient } from "@supabase/ssr";
export function createClient() {
  // NEXT_PUBLIC_* vars are inlined at build time, so they must be read literally.
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
