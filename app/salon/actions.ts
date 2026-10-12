"use server";

import { getPlayerBest } from "@/lib/scores";

// "TU MEJOR MARCA": the mock session name only exists in the browser, so the client asks for it.
export async function getPlayerBestAction(
  gameId: string,
  name: string,
): Promise<{ rank: number; score: number } | null> {
  if (typeof gameId !== "string" || typeof name !== "string") return null;
  const normalized = name.trim().toUpperCase();
  if (!gameId || !normalized) return null;
  try {
    return await getPlayerBest(gameId, normalized);
  } catch (err) {
    console.error("[salon] Player best read failed:", err);
    return null;
  }
}
