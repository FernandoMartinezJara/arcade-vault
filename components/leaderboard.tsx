import type { ScoreRow } from "@/lib/games";
const TOP_CLASS = [" top1", " top2", " top3"];
// `null` scores means the read failed; an empty array means nobody has played yet.
export function Leaderboard({ scores }: { scores: ScoreRow[] | null }) {
  return (
    <div className="leaderboard">
      <h3>MEJORES PUNTUACIONES</h3>
      {scores === null ? (
        <div className="lb-state error" role="status">
          <div className="lb-state-title">SIN CONEXIÓN CON EL VAULT</div>
          <p>Las puntuaciones volverán cuando se recupere la conexión.</p>
        </div>
      ) : scores.length === 0 ? (
        <div className="lb-state">
          <div className="lb-state-title">
            AÚN NO HAY PUNTUACIONES · SÉ EL PRIMERO
          </div>
        </div>
      ) : (
        scores.map((r, i) => (
          <div key={r.name} className={"lb-row" + (TOP_CLASS[i] ?? "")}>
            <div className="rk">#{String(r.rank).padStart(2, "0")}</div>
            <div className="pl">
              {r.name}
              <div
                style={{
                  fontSize: 10,
                  color: "var(--ink-faint)",
                  letterSpacing: "0.1em",
                }}
              >
                {r.date}
              </div>
            </div>
            <div className="sc">{r.score.toLocaleString("es-ES")}</div>
          </div>
        ))
      )}
    </div>
  );
}
export function LeaderboardSkeleton({ rows = 10 }: { rows?: number }) {
  return (
    <div
      className="leaderboard"
      aria-busy="true"
      aria-label="Cargando puntuaciones"
    >
      <h3>MEJORES PUNTUACIONES</h3>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="lb-row lb-skel" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      ))}
    </div>
  );
}
