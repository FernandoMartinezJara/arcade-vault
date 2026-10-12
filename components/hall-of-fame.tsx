import Link from "next/link";
import { HallYouRow } from "@/components/hall-you-row";
import type { Game, ScoreRow } from "@/lib/games";
const TOP_CLASS = [" top1", " top2", " top3"];
// Top N shown in the Salón (the detail page shows 10).
export const HALL_ROWS = 12;
function PodiumSlot({
  row,
  place,
}: {
  row: ScoreRow | undefined;
  place: 1 | 2 | 3;
}) {
  const tone = place === 1 ? "gold" : place === 2 ? "silver" : "bronze";
  return (
    <div className={"podium-slot " + tone}>
      {place === 1 && (
        <div
          className="pixel"
          style={{ fontSize: 9, color: "var(--gold)", letterSpacing: "0.18em" }}
        >
          CAMPEÓN
        </div>
      )}
      <div
        className="rank-num"
        style={place === 1 ? { fontSize: 36, marginTop: 4 } : undefined}
      >
        {String(place).padStart(2, "0")}
      </div>
      <div className="name">{row?.name ?? "—"}</div>
      <div className="score" style={place === 1 ? { fontSize: 20 } : undefined}>
        {row ? row.score.toLocaleString("es-ES") : "—"}
      </div>
      <div className="date">{row?.date ?? "—"}</div>
    </div>
  );
}
// Tabs, podium and top 12 for one game. `rows === null` means the scores read failed.
export function HallOfFame({
  games,
  game,
  rows,
}: {
  games: Game[];
  game: Game;
  rows: ScoreRow[] | null;
}) {
  return (
    <>
      <nav className="hall-tabs" aria-label="Juego">
        {games.map((g) => (
          <Link
            key={g.id}
            href={`/salon?juego=${g.id}`}
            className={"chip" + (g.id === game.id ? " active" : "")}
            aria-current={g.id === game.id ? "page" : undefined}
            scroll={false}
          >
            {g.title}
          </Link>
        ))}
      </nav>
      <div className="podium">
        <PodiumSlot row={rows?.[1]} place={2} />
        <PodiumSlot row={rows?.[0]} place={1} />
        <PodiumSlot row={rows?.[2]} place={3} />
      </div>
      <div className="hall-table">
        <div className="th">
          <div>RANGO</div>
          <div>JUGADOR</div>
          <div>PUNTUACIÓN</div>
          <div>FECHA</div>
        </div>
        {rows === null ? (
          <div className="lb-state error" role="status">
            <div className="lb-state-title">SIN CONEXIÓN CON EL VAULT</div>
            <p>Las puntuaciones volverán cuando se recupere la conexión.</p>
          </div>
        ) : rows.length === 0 ? (
          <div className="lb-state">
            <div className="lb-state-title">
              AÚN NO HAY PUNTUACIONES · SÉ EL PRIMERO
            </div>
          </div>
        ) : (
          rows.map((r, i) => (
            <div
              key={r.name}
              className={"tr" + (TOP_CLASS[i] ?? "")}
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <div className="rk">#{String(r.rank).padStart(2, "0")}</div>
              <div className="pl">{r.name}</div>
              <div className="sc">{r.score.toLocaleString("es-ES")}</div>
              <div className="dt">{r.date}</div>
            </div>
          ))
        )}
        <HallYouRow
          gameId={game.id}
          gameTitle={game.title}
          delay={(rows?.length ?? 0) * 50 + 50}
        />
      </div>
    </>
  );
}
export function HallOfFameSkeleton() {
  return (
    <div aria-busy="true" aria-label="Cargando el Salón de la Fama">
      <div className="hall-tabs" aria-hidden="true" style={{ minHeight: 34 }} />
      <div className="podium" aria-hidden="true">
        {(["silver", "gold", "bronze"] as const).map((tone) => (
          <div
            key={tone}
            className={"podium-slot lb-skel " + tone}
            style={{ display: "grid", gap: 10 }}
          >
            <span />
            <span />
            <span />
          </div>
        ))}
      </div>
      <div className="hall-table" aria-hidden="true">
        <div className="th">
          <div>RANGO</div>
          <div>JUGADOR</div>
          <div>PUNTUACIÓN</div>
          <div>FECHA</div>
        </div>
        {Array.from({ length: HALL_ROWS }, (_, i) => (
          <div key={i} className="tr lb-skel">
            <span />
            <span />
            <span />
            <span />
          </div>
        ))}
      </div>
    </div>
  );
}
