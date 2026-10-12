import "server-only";
// Real leaderboards read from the Supabase view `leaderboard` (best mark per name).
import { cacheLife, cacheTag } from "next/cache";
import type { ScoreRow } from "@/lib/games";
import { createPublicClient } from "@/lib/supabase/public";
// UTC so the server-rendered date never depends on the host's time zone.
const DATE_FMT = new Intl.DateTimeFormat("es-ES", {
  timeZone: "UTC",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});
export async function getLeaderboard(
  gameId: string,
  limit: number,
): Promise<ScoreRow[]> {
  "use cache";
  cacheTag(`scores:${gameId}`);
  cacheLife("hours");
  const { data, error } = await createPublicClient()
    .from("leaderboard")
    .select("rank, name, score, created_at")
    .eq("game_id", gameId)
    .order("rank")
    .limit(limit);
  if (error) throw new Error(`leaderboard: ${error.message}`);
  // View columns are typed nullable, but the underlying scores columns are NOT NULL.
  return data.map((r) => ({
    rank: r.rank!,
    name: r.name!,
    score: r.score!,
    date: DATE_FMT.format(new Date(r.created_at!)),
  }));
}

// Uncached: called from a Server Action with whatever name the browser session holds.
export async function getPlayerBest(
  gameId: string,
  name: string,
): Promise<{ rank: number; score: number } | null> {
  const { data, error } = await createPublicClient()
    .from("leaderboard")
    .select("rank, score")
    .eq("game_id", gameId)
    .eq("name", name)
    .maybeSingle();
  if (error) throw new Error(`leaderboard: ${error.message}`);
  return data ? { rank: data.rank!, score: data.score! } : null;
}
