"use client"; // Error boundaries must be Client Components
import { useEffect } from "react";
// Shown when a route can't read the catalog from Supabase (lib/catalog.ts throws).
export default function Error({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="fade-in">
      <section
        className="av-hero"
        style={{ paddingTop: 96, paddingBottom: 96 }}
      >
        <h1 className="flicker" style={{ fontSize: "clamp(36px, 8vw, 96px)" }}>
          EL VAULT NO RESPONDE
        </h1>
        <div className="sub neon-yellow" style={{ color: "var(--yellow)" }}>
          SEÑAL PERDIDA <span className="blink">_</span>
        </div>
        <p
          style={{
            margin: "24px auto 32px",
            maxWidth: 420,
            color: "var(--ink-dim)",
          }}
        >
          No pudimos cargar los juegos. Revisa tu conexión y vuelve a
          intentarlo.
        </p>
        <button type="button" className="btn yellow lg" onClick={() => retry()}>
          REINTENTAR
        </button>
      </section>
    </div>
  );
}
