"use server";
import { updateTag } from "next/cache";
import { getGame } from "@/lib/catalog";
import { createPublicClient } from "@/lib/supabase/public";
// Same limits as the CHECK constraints on public.scores.
const NAME_RE = /^[A-Z0-9_ ]{1,10}$/;
const MAX_SCORE = 9_999_999;
export type SaveScoreResult = { ok: true } | { ok: false; error: string };
// Anyone can call this endpoint, so every input is revalidated. Without Auth, RLS and
// the table CHECKs are the last line of defense (see SPEC 06 risks).
export async function saveScoreAction(input: {
  gameId: string;
  score: number;
  name: string;
}): Promise<SaveScoreResult> {
  const gameId = typeof input?.gameId === "string" ? input.gameId : "";
  const score = input?.score;
  const name =
    typeof input?.name === "string" ? input.name.trim().toUpperCase() : "";
  if (!NAME_RE.test(name)) {
    return {
      ok: false,
      error:
        "Usa de 1 a 10 caracteres: letras sin tilde, números, _ o espacios.",
    };
  }
  if (!Number.isInteger(score) || score < 0 || score > MAX_SCORE) {
    return { ok: false, error: "La puntuación no es válida." };
  }
  let playable: boolean;
  try {
    playable = (await getGame(gameId))?.playable ?? false;
  } catch (err) {
    console.error("[scores] Catalog read failed:", err);
    return {
      ok: false,
      error: "No pudimos conectar con el Vault. Vuelve a intentarlo.",
    };
  }
  if (!playable)
    return {
      ok: false,
      error: "Este juego es una demo y no guarda puntuaciones.",
    };
  const { error } = await createPublicClient()
    .from("scores")
    .insert({ game_id: gameId, name, score });
  if (error) {
    console.error("[scores] Insert failed:", error.code, error.message);
    return {
      ok: false,
      error: "No pudimos guardar tu puntuación. Vuelve a intentarlo.",
    };
  }
  // Leaderboard of this game, plus best/plays in the catalog.
  updateTag(`scores:${gameId}`);
  updateTag("scores");
  return { ok: true };
}
