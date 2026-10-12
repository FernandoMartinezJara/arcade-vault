import "server-only";
// Game catalog read from Supabase (tables games + game_stats).
import { cacheLife, cacheTag } from "next/cache";
import type { Game, GameCategory, GameColor } from "@/lib/games";
import { createPublicClient } from "@/lib/supabase/public";
// Ordered by sort_order, with best/plays computed from scores.
export async function getGames(): Promise<Game[]> {
  "use cache";
  // Tagged "scores" too: best and plays change with every saved score.
  cacheTag("games", "scores");
  cacheLife("hours");
  const supabase = createPublicClient();
  const [games, stats] = await Promise.all([
    supabase
      .from("games")
      .select("id, title, short, long, cat, cover, color, playable")
      .order("sort_order"),
    supabase.from("game_stats").select("game_id, best, plays"),
  ]);
  if (games.error) throw new Error(`games: ${games.error.message}`);
  if (stats.error) throw new Error(`game_stats: ${stats.error.message}`);
  const byGame = new Map(stats.data.map((s) => [s.game_id, s]));
  return games.data.map((g) => {
    const s = byGame.get(g.id);
    return {
      ...g,
      // cat and color are CHECK-constrained in the table, so the casts are safe.
      cat: g.cat as GameCategory,
      color: g.color as GameColor,
      best: s?.best ?? null,
      plays: s?.plays ?? 0,
    };
  });
}
export async function getGame(id: string): Promise<Game | null> {
  const games = await getGames();
  return games.find((g) => g.id === id) ?? null;
}
