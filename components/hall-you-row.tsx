"use client";
import { useEffect, useState } from "react";
import { getPlayerBestAction } from "@/app/salon/actions";
import { useUser } from "@/lib/session";
type PlayerBest = Awaited<ReturnType<typeof getPlayerBestAction>>;
// Only rendered client-side: the session name lives in localStorage, so the server never knows it.
export function HallYouRow({
  gameId,
  gameTitle,
  delay,
}: {
  gameId: string;
  gameTitle: string;
  delay: number;
}) {
  const user = useUser();
  const name = user?.name ?? null;
  const key = `${gameId}:${name}`;
  // Keyed by game and name so a stale answer never shows under another tab or session.
  const [result, setResult] = useState<{
    key: string;
    best: PlayerBest;
  } | null>(null);
  useEffect(() => {
    if (!name) return;
    let cancelled = false;
    getPlayerBestAction(gameId, name).then((best) => {
      if (!cancelled) setResult({ key: `${gameId}:${name}`, best });
    });
    return () => {
      cancelled = true;
    };
  }, [gameId, name]);
  const best = name && result?.key === key ? result.best : null;
  if (!name || !best) return null;
  return (
    <>
      <div className="tr you-label">▸ TU MEJOR MARCA EN {gameTitle}</div>
      <div className="tr you" style={{ animationDelay: `${delay}ms` }}>
        <div className="rk" style={{ color: "var(--yellow)" }}>
          #{String(best.rank).padStart(2, "0")}
        </div>
        <div className="pl" style={{ color: "var(--yellow)" }}>
          {name}
        </div>
        <div
          className="sc"
          style={{
            color: "var(--yellow)",
            textShadow: "0 0 6px rgba(245,255,0,0.5)",
          }}
        >
          {best.score.toLocaleString("es-ES")}
        </div>
        <div className="dt">—</div>
      </div>
    </>
  );
}
