"use client";
import { useEffect, useRef, type RefObject } from "react";
import {
  createAsteroidsEngine,
  type AsteroidsCallbacks,
  type AsteroidsEngine,
} from "@/games/asteroides/engine";
export interface AsteroidesCanvasProps extends AsteroidsCallbacks {
  paused: boolean;
  engineRef: RefObject<AsteroidsEngine | null>; // for end() and reset() from GamePlayer
}
export function AsteroidesCanvas({
  paused,
  engineRef,
  ...callbacks
}: AsteroidesCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // The engine is created once; it always calls the latest callbacks through this ref.
  const callbacksRef = useRef(callbacks);
  useEffect(() => {
    callbacksRef.current = callbacks;
  });
  useEffect(() => {
    const canvas = canvasRef.current;
    const screen = canvas?.parentElement;
    if (!canvas || !screen) return;
    const engine = createAsteroidsEngine(canvas, {
      onScore: (v) => callbacksRef.current.onScore(v),
      onLives: (v) => callbacksRef.current.onLives(v),
      onLevel: (v) => callbacksRef.current.onLevel(v),
      onPhase: (v) => callbacksRef.current.onPhase(v),
    });
    engineRef.current = engine;
    const fit = () =>
      engine.resize(
        screen.clientWidth,
        screen.clientHeight,
        window.devicePixelRatio || 1,
      );
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(screen);
    return () => {
      observer.disconnect();
      engine.destroy();
      engineRef.current = null;
    };
  }, [engineRef]);
  useEffect(() => {
    engineRef.current?.setPaused(paused);
  }, [paused, engineRef]);
  return (
    <canvas ref={canvasRef} className="game-canvas" aria-label="Asteroides" />
  );
}
