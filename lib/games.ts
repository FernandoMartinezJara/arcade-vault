// Catalog types shared by server and client. The data lives in Supabase (see lib/catalog.ts).
export type GameCategory = "ARCADE" | "PUZZLE" | "SHOOTER" | "VERSUS";
export type GameColor = "cyan" | "magenta" | "yellow" | "green";
export interface Game {
  id: string; // slug usado en la URL: "bloque-buster"
  title: string; // "BLOQUE BUSTER"
  short: string; // descripción de tarjeta
  long: string; // descripción de detalle
  cat: GameCategory;
  cover: string; // clase CSS de portada: "cover-bricks"
  color: GameColor;
  playable: boolean; // solo los juegos reales guardan puntajes
  best: number | null; // máximo de scores (game_stats); null sin partidas
  plays: number; // cantidad de partidas (game_stats)
}
export interface ScoreRow {
  rank: number;
  name: string;
  score: number;
  date: string; // "DD/MM/YYYY", created_at formateado en UTC
}
export const CATS: ("TODOS" | GameCategory)[] = [
  "TODOS",
  "ARCADE",
  "PUZZLE",
  "SHOOTER",
  "VERSUS",
];
// 0 → "0", 1240 → "1.2K", 1_500_000 → "1.5M".
export function formatPlays(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}
