// Supabase client without cookies or session, for public data.
// Safe inside "use cache" and generateStaticParams, where cookies() can't be read.
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
export function createPublicClient() {
  // NEXT_PUBLIC_* vars are inlined at build time, so they must be read literally.
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
