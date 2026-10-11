import Link from "next/link";

export default function NotFound() {
  return (
    <div className="fade-in">
      <section className="av-hero" style={{ paddingTop: 96, paddingBottom: 96 }}>
        <h1 className="flicker" style={{ fontSize: "clamp(56px, 14vw, 160px)" }}>404</h1>
        <div className="sub neon-magenta" style={{ color: "var(--magenta)" }}>
          NIVEL NO ENCONTRADO <span className="blink">_</span>
        </div>
        <p style={{ margin: "24px auto 32px", maxWidth: 420, color: "var(--ink-dim)" }}>
          Esta pantalla no existe en el Vault. Revisa la dirección o vuelve a la biblioteca para elegir un juego.
        </p>
        <Link href="/juegos" className="btn magenta lg">
          VOLVER AL VAULT
        </Link>
      </section>
    </div>
  );
}
