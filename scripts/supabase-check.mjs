// Checks that the Supabase project is reachable with the env vars in .env.local.
// Run with: npm run supabase:check
const REQUIRED = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
];
const missing = REQUIRED.filter((name) => !process.env[name]);
if (missing.length) {
  console.error(`✗ Supabase — falta la variable ${missing.join(", ")}`);
  process.exit(1);
}
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
let host;
try {
  host = new URL(url).host;
} catch {
  console.error("✗ Supabase — NEXT_PUBLIC_SUPABASE_URL no es una URL válida");
  process.exit(1);
}
try {
  const res = await fetch(new URL("/auth/v1/settings", url), {
    headers: { apikey: key },
  });
  if (!res.ok) {
    console.error(`✗ Supabase — HTTP ${res.status} ${res.statusText}`);
    process.exit(1);
  }
  console.log(`✓ Supabase OK — ${host}`);
} catch (err) {
  console.error(`✗ Supabase — ${err instanceof Error ? err.message : err}`);
  process.exit(1);
}
