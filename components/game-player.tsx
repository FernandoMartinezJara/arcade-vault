"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AsteroidesCanvas } from "@/components/asteroides-canvas";
import type {
  AsteroidsEngine,
  AsteroidsPhase,
} from "@/games/asteroides/engine";
import type { Game } from "@/lib/games";
import { saveScore, useUser } from "@/lib/session";
const LEVEL_EVERY = 2500;
export function GamePlayer({ game }: { game: Game }) {
  const user = useUser();
  // Only asteroides has a real engine; the other games keep the mock simulator.
  const isReal = game.id === "asteroides";
  const engineRef = useRef<AsteroidsEngine | null>(null);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [engineLevel, setEngineLevel] = useState(1);
  const [phase, setPhase] = useState<AsteroidsPhase>("ready");
  const [paused, setPaused] = useState(false);
  const [over, setOver] = useState(false);
  // null until the player edits the initials, so the session name shows up after hydration.
  const [typedName, setTypedName] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const name = typedName ?? user?.name ?? "INVITADO";
  const level = isReal ? engineLevel : 1 + Math.floor(score / LEVEL_EVERY);
  // The real game can only pause mid-run, not on the start screen or after game over.
  const canPause = !isReal || phase === "playing" || phase === "dead";
  // P toggles and Esc pauses; hiding the tab pauses and only REANUDAR or P resume.
  useEffect(() => {
    if (!isReal || !canPause) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat || e.target instanceof HTMLInputElement) return;
      if (e.code === "KeyP") {
        e.preventDefault();
        setPaused((p) => !p);
      } else if (e.code === "Escape") {
        e.preventDefault();
        setPaused(true);
      }
    };
    const onVisibility = () => {
      if (document.hidden) setPaused(true);
    };
    window.addEventListener("keydown", onKeyDown);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [isReal, canPause]);
  useEffect(() => {
    if (isReal || over || paused) return;
    const t = setInterval(
      () => setScore((s) => s + Math.floor(10 + Math.random() * 90)),
      220,
    );
    return () => clearInterval(t);
  }, [isReal, over, paused]);
  const restart = () => {
    setScore(0);
    setLives(3);
    setPaused(false);
    setOver(false);
    setSaved(false);
    // Back to the start screen; the engine re-emits score, lives, level and phase.
    engineRef.current?.reset();
  };
  // FIN: the real engine stops and reports "over", which opens the modal.
  const finish = () => {
    if (isReal) engineRef.current?.end();
    else setOver(true);
  };
  const onPhase = (next: AsteroidsPhase) => {
    setPhase(next);
    if (next === "over") setOver(true);
  };
  const onSave = () => {
    saveScore({ game: game.id, score, name });
    setSaved(true);
  };
  return (
    <div className="av-player fade-in">
      <div className="player-hud">
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
          <div className="hud-stat">
            <div className="l">Jugador</div>
            <div className="v" style={{ color: "var(--ink)" }}>
              {name}
            </div>
          </div>
          <div className="hud-stat">
            <div className="l">Puntuación</div>
            <div className="v">{score.toLocaleString("es-ES")}</div>
          </div>
          <div className="hud-stat lives">
            <div className="l">Vidas</div>
            <div className="v" aria-label={`${lives} vidas`}>
              {"♥ ".repeat(lives).trim() || "—"}
            </div>
          </div>
          <div className="hud-stat level">
            <div className="l">Nivel</div>
            <div className="v">{String(level).padStart(2, "0")}</div>
          </div>
        </div>
        <div className="hud-actions">
          <button
            className="btn yellow"
            onClick={() => setPaused((p) => !p)}
            disabled={over || !canPause}
          >
            {paused ? "REANUDAR" : "PAUSA"}
          </button>
          <button className="btn magenta" onClick={finish} disabled={over}>
            FIN
          </button>
          <Link href={`/juegos/${game.id}`} className="btn ghost">
            SALIR
          </Link>
        </div>
      </div>
      <div className="crt">
        <div className="crt-screen">
          {isReal ? (
            <AsteroidesCanvas
              paused={paused}
              engineRef={engineRef}
              onScore={setScore}
              onLives={setLives}
              onLevel={setEngineLevel}
              onPhase={onPhase}
            />
          ) : (
            <div className="game-arena" aria-hidden="true">
              <div className="grid-floor"></div>
              <div className="enemy e1"></div>
              <div className="enemy e2"></div>
              <div className="enemy e3"></div>
              <div className="player-ship"></div>
            </div>
          )}
          {paused && (
            <div
              className="crt-content"
              role="status"
              style={{ background: "rgba(0,0,0,0.6)", zIndex: 5 }}
            >
              <div>
                <div className="pixel neon-yellow" style={{ fontSize: 22 }}>
                  EN PAUSA
                </div>
                <div
                  className="mono"
                  style={{
                    fontSize: 11,
                    color: "var(--ink-dim)",
                    marginTop: 10,
                    letterSpacing: "0.16em",
                  }}
                >
                  PULSA REANUDAR PARA CONTINUAR
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="crt-bottom">
          <span className="led">SEÑAL OK</span>
          <span>{game.title} · CRT-83 · 60 HZ</span>
          <span>CARGA · 1MB</span>
        </div>
      </div>
      {isReal && (
        <p className="controls-legend" aria-label="Controles">
          <span>
            <kbd>←</kbd> <kbd>→</kbd> ROTAR
          </span>
          <span className="sep" aria-hidden="true">
            ·
          </span>
          <span>
            <kbd>↑</kbd> PROPULSAR
          </span>
          <span className="sep" aria-hidden="true">
            ·
          </span>
          <span>
            <kbd>ESPACIO</kbd> DISPARAR
          </span>
          <span className="sep" aria-hidden="true">
            ·
          </span>
          <span>
            <kbd>P</kbd> PAUSA
          </span>
        </p>
      )}
      {over && (
        <div className="modal-bd">
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="game-over-title"
          >
            <h2 id="game-over-title">FIN DEL JUEGO</h2>
            <div className="final-label">PUNTUACIÓN FINAL</div>
            <div className="final">{score.toLocaleString("es-ES")}</div>
            {!saved ? (
              <div className="input-row">
                <input
                  value={name}
                  onChange={(e) =>
                    setTypedName(e.target.value.toUpperCase().slice(0, 10))
                  }
                  placeholder="TUS INICIALES"
                  aria-label="Tus iniciales"
                  autoFocus
                />
                <button className="btn yellow" onClick={onSave}>
                  GUARDAR PUNTUACIÓN
                </button>
              </div>
            ) : (
              <div className="toast-saved" role="status">
                ▸ PUNTUACIÓN GUARDADA_
              </div>
            )}
            <div className="actions">
              <button className="btn" onClick={restart}>
                JUGAR DE NUEVO
              </button>
              <Link href="/juegos" className="btn magenta">
                VOLVER AL VAULT
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
