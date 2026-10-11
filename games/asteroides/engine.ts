// Asteroides engine: game state, loop, input and collisions ported from
// references/started-games/02-asteroids/game.js, without globals.
// HUD, pause and game over live in React; the engine reports changes through callbacks.
import {
  COLORS,
  H,
  POINTS,
  POWERUP_DROP_CHANCE,
  POWERUP_DURATION,
  RESPAWN_DELAY,
  START_ASTEROIDS,
  START_LIVES,
  W,
} from "./constants";
import {
  Asteroid,
  Bullet,
  Particle,
  PowerUp,
  Ship,
  dist,
  rand,
} from "./entities";
export type AsteroidsPhase = "ready" | "playing" | "dead" | "over";
export interface AsteroidsCallbacks {
  onScore(score: number): void;
  onLives(lives: number): void;
  onLevel(level: number): void;
  onPhase(phase: AsteroidsPhase): void; // "over" opens the modal
}
export interface AsteroidsEngine {
  setPaused(paused: boolean): void; // freezes update; the last frame stays on screen
  end(): void; // FIN: moves to "over" with the current score
  reset(): void; // JUGAR DE NUEVO: initial state and "ready" phase
  resize(cssWidth: number, cssHeight: number, dpr: number): void;
  destroy(): void; // cancels the rAF and removes the listeners
}
// Keys whose default action (page scroll, button activation) is blocked while playing.
const GAME_KEYS = new Set([
  "ArrowLeft",
  "ArrowRight",
  "ArrowUp",
  "ArrowDown",
  "Space",
]);
const MAX_DPR = 2;
function isTypingTarget(target: EventTarget | null) {
  return (
    target instanceof HTMLElement &&
    (target.tagName === "INPUT" ||
      target.tagName === "TEXTAREA" ||
      target.isContentEditable)
  );
}
export function createAsteroidsEngine(
  canvas: HTMLCanvasElement,
  callbacks: AsteroidsCallbacks,
): AsteroidsEngine {
  const ctx = canvas.getContext("2d")!;
  // next/font exposes the generated family name through this variable.
  const rootStyle = getComputedStyle(document.documentElement);
  const pixelFont =
    rootStyle.getPropertyValue("--font-press-start-2p").trim() || "monospace";
  const monoFont =
    rootStyle.getPropertyValue("--font-jetbrains-mono").trim() || "monospace";
  // ── Input ──────────────────────────────────────────────────────────────────
  const keys: Record<string, boolean> = {};
  const justPressed: Record<string, boolean> = {};
  const pressed = (code: string) => {
    const val = justPressed[code];
    justPressed[code] = false;
    return !!val;
  };
  const clearInput = () => {
    for (const k in keys) keys[k] = false;
    for (const k in justPressed) justPressed[k] = false;
  };
  // ── State ──────────────────────────────────────────────────────────────────
  let ship = new Ship();
  let bullets: Bullet[] = [];
  let asteroids: Asteroid[] = [];
  let particles: Particle[] = [];
  let powerUps: PowerUp[] = [];
  let score = 0;
  let lives = START_LIVES;
  let level = 1;
  let phase: AsteroidsPhase = "ready";
  let deadTimer = 0;
  let powerUpSpawned = false;
  let killsSinceSpawn = 0;
  let paused = false;
  let rafId = 0;
  let lastTime: number | null = null;
  // Callbacks fire only when the value changes, never per frame.
  const emitted: {
    score?: number;
    lives?: number;
    level?: number;
    phase?: AsteroidsPhase;
  } = {};
  function emit() {
    if (emitted.score !== score) callbacks.onScore((emitted.score = score));
    if (emitted.lives !== lives) callbacks.onLives((emitted.lives = lives));
    if (emitted.level !== level) callbacks.onLevel((emitted.level = level));
    if (emitted.phase !== phase) callbacks.onPhase((emitted.phase = phase));
  }
  function spawnAsteroids(count: number) {
    const SAFE_DIST = 130;
    for (let i = 0; i < count; i++) {
      let x: number;
      let y: number;
      do {
        x = rand(0, W);
        y = rand(0, H);
      } while (Math.hypot(x - W / 2, y - H / 2) < SAFE_DIST);
      asteroids.push(new Asteroid(x, y, 3));
    }
  }
  function initGame() {
    ship = new Ship();
    bullets = [];
    asteroids = [];
    particles = [];
    powerUps = [];
    powerUpSpawned = false;
    killsSinceSpawn = 0;
    score = 0;
    lives = START_LIVES;
    level = 1;
    phase = "ready";
    spawnAsteroids(START_ASTEROIDS);
  }
  function nextLevel() {
    level++;
    bullets = [];
    particles = [];
    powerUps = [];
    powerUpSpawned = false;
    killsSinceSpawn = 0;
    ship.reset();
    spawnAsteroids(3 + level);
  }
  function explode(x: number, y: number, count = 8) {
    for (let i = 0; i < count; i++) particles.push(new Particle(x, y));
  }
  function killShip() {
    explode(ship.x, ship.y, 14);
    ship.dead = true;
    lives--;
    if (lives <= 0) {
      phase = "over";
    } else {
      phase = "dead";
      deadTimer = RESPAWN_DELAY;
    }
  }
  function startGame() {
    phase = "playing";
    clearInput();
    // A focused button (PAUSA, FIN) would also react to Space.
    if (document.activeElement instanceof HTMLElement)
      document.activeElement.blur();
  }
  // ── Update ─────────────────────────────────────────────────────────────────
  function update(dt: number) {
    if (phase === "ready") {
      if (pressed("Space")) startGame();
      return;
    }
    if (phase === "over") return;
    if (phase === "dead") {
      deadTimer -= dt;
      particles.forEach((p) => p.update(dt));
      particles = particles.filter((p) => !p.dead);
      asteroids.forEach((a) => a.update(dt));
      if (deadTimer <= 0) {
        phase = "playing";
        ship.reset();
      }
      return;
    }
    if (pressed("Space")) bullets.push(...ship.tryShoot());
    ship.update(dt, {
      left: !!keys.ArrowLeft,
      right: !!keys.ArrowRight,
      thrust: !!keys.ArrowUp,
    });
    bullets.forEach((b) => b.update(dt));
    asteroids.forEach((a) => a.update(dt));
    particles.forEach((p) => p.update(dt));
    powerUps.forEach((p) => p.update(dt));
    bullets = bullets.filter((b) => !b.dead);
    particles = particles.filter((p) => !p.dead);
    powerUps = powerUps.filter((p) => !p.dead);
    for (const p of powerUps) {
      if (!p.dead && dist(ship, p) < ship.radius + p.radius) {
        p.dead = true;
        ship.tripleShot = POWERUP_DURATION;
      }
    }
    // Bullet vs asteroid.
    const newAsteroids: Asteroid[] = [];
    for (const b of bullets) {
      for (const a of asteroids) {
        if (!a.dead && !b.dead && dist(b, a) < a.radius) {
          b.dead = true;
          a.dead = true;
          score += POINTS[a.size];
          explode(a.x, a.y, a.size * 5);
          newAsteroids.push(...a.split());
          if (!powerUpSpawned) {
            killsSinceSpawn++;
            const guaranteed = killsSinceSpawn >= 5;
            if (guaranteed || Math.random() < POWERUP_DROP_CHANCE) {
              powerUps.push(new PowerUp(a.x, a.y));
              powerUpSpawned = true;
            }
          }
        }
      }
    }
    asteroids = asteroids.filter((a) => !a.dead).concat(newAsteroids);
    bullets = bullets.filter((b) => !b.dead);
    // Ship vs asteroid.
    if (ship.invincible <= 0) {
      for (const a of asteroids) {
        if (dist(ship, a) < ship.radius + a.radius * 0.82) {
          killShip();
          break;
        }
      }
    }
    if (phase === "playing" && asteroids.length === 0) nextLevel();
  }
  // ── Draw ───────────────────────────────────────────────────────────────────
  function drawReady() {
    ctx.save();
    ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
    ctx.fillRect(0, 0, W, H);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.shadowColor = COLORS.ship;
    ctx.shadowBlur = 12;
    ctx.fillStyle = COLORS.ship;
    ctx.font = `22px ${pixelFont}`;
    ctx.fillText("PULSA ESPACIO", W / 2, H / 2 - 30);
    ctx.fillText("PARA EMPEZAR", W / 2, H / 2 + 6);
    ctx.shadowBlur = 0;
    ctx.fillStyle = COLORS.textDim;
    ctx.font = `14px ${monoFont}`;
    ctx.fillText(
      "← → ROTAR   ·   ↑ PROPULSAR   ·   ESPACIO DISPARAR",
      W / 2,
      H / 2 + 62,
    );
    ctx.restore();
  }
  function drawTripleShot() {
    if (ship.tripleShot <= 0 || phase === "ready") return;
    ctx.save();
    ctx.shadowColor = COLORS.powerUp;
    ctx.shadowBlur = 8;
    ctx.fillStyle = COLORS.powerUp;
    ctx.font = `15px ${monoFont}`;
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.fillText(`3x  ${ship.tripleShot.toFixed(1)}s`, 14, 26);
    ctx.restore();
  }
  function draw() {
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, W, H);
    particles.forEach((p) => p.draw(ctx));
    asteroids.forEach((a) => a.draw(ctx));
    powerUps.forEach((p) => p.draw(ctx));
    bullets.forEach((b) => b.draw(ctx));
    ship.draw(ctx);
    drawTripleShot();
    if (phase === "ready") drawReady();
  }
  // ── Loop ───────────────────────────────────────────────────────────────────
  function loop(ts: number) {
    const dt = lastTime === null ? 0 : Math.min((ts - lastTime) / 1000, 0.05);
    lastTime = ts;
    // Paused or over: keep the last frame on screen.
    if (!paused && phase !== "over") {
      update(dt);
      draw();
    }
    emit();
    rafId = requestAnimationFrame(loop);
  }
  // ── Listeners ──────────────────────────────────────────────────────────────
  function onKeyDown(e: KeyboardEvent) {
    if (phase === "over" || isTypingTarget(e.target)) return;
    if (GAME_KEYS.has(e.code)) e.preventDefault();
    if (!keys[e.code]) justPressed[e.code] = true;
    keys[e.code] = true;
  }
  function onKeyUp(e: KeyboardEvent) {
    keys[e.code] = false;
    if (phase === "over" || isTypingTarget(e.target)) return;
    if (GAME_KEYS.has(e.code)) e.preventDefault();
  }
  // Releasing a key outside the window never fires keyup.
  function onBlur() {
    clearInput();
  }
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  window.addEventListener("blur", onBlur);
  initGame();
  emit();
  rafId = requestAnimationFrame(loop);
  return {
    setPaused(next) {
      paused = next;
      // Presses made during the pause must not fire on resume.
      clearInput();
      lastTime = null;
    },
    end() {
      if (phase === "over") return;
      phase = "over";
      emit();
    },
    reset() {
      initGame();
      clearInput();
      lastTime = null;
      draw();
      emit();
    },
    resize(cssWidth, cssHeight, dpr) {
      const ratio = Math.min(dpr, MAX_DPR);
      canvas.width = Math.max(1, Math.round(cssWidth * ratio));
      canvas.height = Math.max(1, Math.round(cssHeight * ratio));
      ctx.setTransform(canvas.width / W, 0, 0, canvas.height / H, 0, 0);
      draw();
    },
    destroy() {
      cancelAnimationFrame(rafId);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
    },
  };
}
