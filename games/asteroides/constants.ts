// Gameplay constants ported from references/started-games/02-asteroids/game.js.
// Logical playfield size; the canvas buffer is scaled to fit it.
export const W = 800;
export const H = 600;
// Indexed by asteroid size: 1 (small), 2 (medium), 3 (large).
export const RADII = [0, 16, 30, 50];
export const SPEEDS = [0, 85, 55, 32];
export const POINTS = [0, 100, 50, 20];
export const POWERUP_DROP_CHANCE = 0.15;
export const POWERUP_DURATION = 5;
export const POWERUP_TTL = 12;
export const TRIPLE_SPREAD = 0.18;
export const START_LIVES = 3;
export const START_ASTEROIDS = 4;
export const RESPAWN_DELAY = 2;
// Mirror of the tokens in app/globals.css (the canvas can't read CSS vars).
export const COLORS = {
  ship: "#00f5ff",
  asteroid: "#e6e9ff",
  bullet: "#f5ff00",
  powerUp: "#ff006e",
  thrust: "rgba(255, 130, 0, 0.85)",
  text: "#e6e9ff",
  textDim: "#8a8fb5",
} as const;
// COLORS.asteroid as RGB, for particles that fade out.
export const PARTICLE_RGB = "230, 233, 255";
// Soft neon glow applied with ctx.shadowBlur.
export const GLOW = 8;
