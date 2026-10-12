import Link from "next/link";
import { Suspense } from "react";
import {
  HALL_ROWS,
  HallOfFame,
  HallOfFameSkeleton,
} from "@/components/hall-of-fame";
import { getGames } from "@/lib/catalog";
import type { ScoreRow } from "@/lib/games";
import { getLeaderboard } from "@/lib/scores";
export default function SalonPage({ searchParams }: PageProps<"/salon">) {
  return (
    <div className="av-hall fade-in">
      <div className="hall-head">
        <h1>SALÓN DE LA FAMA</h1>
        <p className="pixel" style={{ fontSize: 10 }}>
          LOS NOMBRES QUE NUNCA SE BORRAN DE LA PANTALLA
        </p>
      </div>
      {/* searchParams is request data, so only this part waits for it. */}
      <Suspense fallback={<HallOfFameSkeleton />}>
        <Hall searchParams={searchParams} />
      </Suspense>
      <div style={{ textAlign: "center", marginTop: 32 }}>
        <Link href="/juegos" className="btn lg">
          VOLVER A LA BIBLIOTECA
        </Link>
      </div>
    </div>
  );
}
async function Hall({
  searchParams,
}: Pick<PageProps<"/salon">, "searchParams">) {
  const { juego } = await searchParams;
  const games = await getGames();
  // Missing or unknown ?juego= falls back to the first game of the catalog.
  const game = games.find((g) => g.id === juego) ?? games[0];
  let rows: ScoreRow[] | null;
  try {
    rows = await getLeaderboard(game.id, HALL_ROWS);
  } catch (err) {
    console.error(err);
    rows = null;
  }
  return <HallOfFame games={games} game={game} rows={rows} />;
}
