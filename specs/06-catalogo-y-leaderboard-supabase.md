# SPEC 06 — Catálogo y leaderboard en Supabase

> **Estado:** Implementada
> **Depende de:** SPEC 01, SPEC 04, SPEC 05
> **Fecha:** 2026-10-11
> **Objetivo:** Mover el catálogo de `lib/games.ts` a una tabla `games` y los puntajes a una tabla `scores` en Supabase, para que la Biblioteca, el detalle, el reproductor y el Salón de la Fama lean y guarden datos reales.

---

## Por qué existe esta spec

Hoy el catálogo es el array `GAMES` de `lib/games.ts`, los leaderboards salen de `seededScores` (mock determinista) y los puntajes se guardan en `av_scores` de `localStorage`.
SPEC 04 dejó Supabase conectado sin tablas y dejó fuera explícitamente la tabla `games` y los puntajes.
SPEC 05 dejó el primer juego real (`asteroides`), así que ya hay puntajes reales que guardar.
Esta spec crea las dos tablas, migra todas las lecturas del catálogo y reemplaza los leaderboards mock por rankings reales.
No hay Auth todavía: los puntajes se insertan como anónimos y se aceptan los riesgos de trampa hasta la spec de Auth.

---

## Alcance

**Dentro:**

- **Migraciones versionadas** en `supabase/migrations/`, aplicadas con `apply_migration` del MCP de Supabase:
  - Tabla `games` con los 9 juegos actuales como seed, en el mismo orden de `GAMES`.
  - Tabla `scores` vacía, sin seed.
  - Vistas `leaderboard` y `game_stats`.
  - RLS y políticas para el rol `anon`.
- **Tipos generados** en `lib/supabase/database.types.ts` con `generate_typescript_types` del MCP.
- **Cliente sin cookies** en `lib/supabase/public.ts`, para lecturas dentro de `"use cache"` y para `generateStaticParams`.
- **Capa de datos de servidor** (`import "server-only"`):
  - `lib/catalog.ts`: `getGames()` y `getGame(id)`.
  - `lib/scores.ts`: `getLeaderboard(gameId, limit)`, `getPlayerBest(gameId, name)`.
- **`lib/games.ts`** queda solo con tipos, `CATS` y el helper `formatPlays`. Se eliminan `GAMES`, `getGame`, `seededScores` y `PLAYERS`.
- **`best` y `plays` calculados** desde `scores` (vista `game_stats`): "Mejor global" = máximo, "Partidas" = cantidad de filas.
- **Columna `playable`** en `games`. Solo `asteroides` es `true`.
- **Rutas migradas a la capa de datos:** `/` (rail), `/juegos`, `/juegos/[id]`, `/juegos/[id]/jugar` y `/salon`.
  - `generateStaticParams` de `/juegos/[id]` y `/juegos/[id]/jugar` lee los ids desde `games`.
  - `Library` recibe `games` por props en lugar de importar `GAMES`.
- **Leaderboard del detalle** (`components/leaderboard.tsx`): top 10 real de `leaderboard`, con estado vacío y estado de error.
- **Salón de la Fama**:
  - La pestaña activa vive en la URL: `/salon?juego={id}`. Sin parámetro o con un id inválido se usa el primer juego del catálogo.
  - Las pestañas son `<Link>` y el podio + tabla del top 12 se cargan en el servidor detrás de `<Suspense>` con skeleton.
  - "TU MEJOR MARCA" consulta `leaderboard` por el nombre de la sesión mock (`av_user`) mediante la Server Action `getPlayerBestAction` en `app/salon/actions.ts`.
- **Guardado real** con la Server Action `saveScoreAction` en `app/juegos/[id]/jugar/actions.ts`:
  - Valida que el juego exista y sea `playable`, que el score sea entero entre 0 y 9.999.999 y que el nombre normalizado cumpla `^[A-Z0-9_ ]{1,10}$`.
  - Inserta con el cliente público y llama a `updateTag` sobre los tags del juego.
  - El modal muestra `GUARDANDO…`, éxito, o un error con botón `REINTENTAR`.
- **Juegos mock no guardan:** si `playable` es `false`, el botón `GUARDAR PUNTUACIÓN` queda deshabilitado y el modal muestra `DEMO: NO SE GUARDA`.
- **Se elimina `av_scores`:** `saveScore`, `readScores` y `getBestScore` salen de `lib/session.ts`. La sesión mock `av_user` no cambia.
- **Errores de lectura:**
  - Si falla la lectura de `games`, `app/error.tsx` (nuevo, estilo arcade) muestra `EL VAULT NO RESPONDE` y un botón `REINTENTAR` que llama a `retry()`.
  - Si falla la lectura de `scores`, solo el bloque del leaderboard muestra `SIN CONEXIÓN CON EL VAULT`. El resto de la página funciona.
- **Estados vacíos:** con `scores` vacía, el leaderboard del detalle y la tabla del Salón muestran `AÚN NO HAY PUNTUACIONES · SÉ EL PRIMERO`, el podio muestra `—` en los tres puestos, "Mejor global" muestra `—` y "Partidas" muestra `0`.

**Fuera de alcance (para futuras specs):**

- Supabase Auth y reemplazo de la sesión mock `av_user`.
- Anti-trampa (validación del puntaje en servidor, firmas, límites por IP o rate limiting).
- Ticker y "TOP HOY" de la landing (`TICKER`, `TOP_TODAY` en `lib/home.ts`): siguen mock.
- Migrar los puntajes viejos de `av_scores` a Supabase.
- Panel de administración del catálogo.
- Imágenes de portada en Storage (las portadas siguen siendo clases CSS).
- Paginación del leaderboard o rankings por periodo (semana, mes).
- Supabase Realtime para actualizar leaderboards en vivo.
- Cliente admin con secret key.
- Supabase CLI y stack local.
- Corregir el texto `12+ JUEGOS` de la landing.
- Tests automatizados.

---

## Modelo de datos

### Tabla `games`

```sql
create table public.games (
  id          text primary key,                 -- slug: "asteroides"
  title       text not null,                    -- "ASTEROIDES"
  short       text not null,
  long        text not null,
  cat         text not null check (cat in ('ARCADE','PUZZLE','SHOOTER','VERSUS')),
  cover       text not null,                    -- clase CSS: "cover-asteroides"
  color       text not null check (color in ('cyan','magenta','yellow','green')),
  playable    boolean not null default false,
  sort_order  int not null unique,
  created_at  timestamptz not null default now()
);
```

- Seed: los 9 juegos de `GAMES` con los mismos `id`, `title`, `short`, `long`, `cat`, `cover` y `color`.
- `sort_order` sigue el orden actual del array (`asteroides` = 1).
- `playable = true` solo para `asteroides`.
- No hay columnas `best` ni `plays`.

### Tabla `scores`

```sql
create table public.scores (
  id          bigint generated always as identity primary key,
  game_id     text not null references public.games(id) on delete cascade,
  name        text not null check (name ~ '^[A-Z0-9_ ]{1,10}$' and name = btrim(name)),
  score       int  not null check (score between 0 and 9999999),
  created_at  timestamptz not null default now()
);

create index scores_game_score_idx on public.scores (game_id, score desc, created_at);
```

### Vistas

```sql
-- Mejor marca por nombre y juego. Empate: gana quien lo logró antes.
create view public.leaderboard with (security_invoker = true) as
select game_id, name, score, created_at,
       row_number() over (partition by game_id order by score desc, created_at asc) as rank
from (
  select distinct on (game_id, name) game_id, name, score, created_at
  from public.scores
  order by game_id, name, score desc, created_at asc
) best;

-- Estadísticas por juego. Juegos sin partidas: best null, plays 0.
create view public.game_stats with (security_invoker = true) as
select g.id as game_id, max(s.score) as best, count(s.id)::int as plays
from public.games g
left join public.scores s on s.game_id = g.id
group by g.id;
```

### RLS

| Tabla    | RLS | `anon` SELECT | `anon` INSERT                                                               | UPDATE / DELETE |
| -------- | --- | ------------- | --------------------------------------------------------------------------- | --------------- |
| `games`  | Sí  | Todas         | No                                                                          | No              |
| `scores` | Sí  | Todas         | `with check (exists (select 1 from games where id = game_id and playable))` | No              |

- Las vistas usan `security_invoker`, así que heredan las políticas de las tablas.
- `grant select` sobre las vistas a `anon`.

### Archivos de migración

```
supabase/migrations/
  20261011000001_create_games.sql         -- tabla, RLS, políticas, seed
  20261011000002_create_scores.sql        -- tabla, índice, RLS, políticas
  20261011000003_create_leaderboard_views.sql
```

El nombre exacto de cada archivo usa la versión que devuelve `apply_migration`, para que el repo y `list_migrations` coincidan.

### `lib/games.ts` — tipos

```ts
export type GameCategory = "ARCADE" | "PUZZLE" | "SHOOTER" | "VERSUS";
export type GameColor = "cyan" | "magenta" | "yellow" | "green";

export interface Game {
  id: string;
  title: string;
  short: string;
  long: string;
  cat: GameCategory;
  cover: string;
  color: GameColor;
  playable: boolean;
  best: number | null; // de game_stats; null sin partidas
  plays: number; // de game_stats
}

export interface ScoreRow {
  rank: number;
  name: string;
  score: number;
  date: string; // "DD/MM/YYYY", created_at formateado en UTC
}

export const CATS: ("TODOS" | GameCategory)[];
export function formatPlays(n: number): string; // 0 → "0", 1240 → "1.2K", 1_500_000 → "1.5M"
```

### `lib/supabase/public.ts`

```ts
// Cliente sin cookies ni sesión. Seguro dentro de "use cache" y en generateStaticParams.
export function createPublicClient(): SupabaseClient<Database>;
```

- Usa `createClient` de `@supabase/supabase-js` con `persistSession: false`.
- Lee `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.

### `lib/catalog.ts` y `lib/scores.ts`

```ts
// lib/catalog.ts — "use cache", cacheTag("games", "scores")
export async function getGames(): Promise<Game[]>; // ordenados por sort_order, con best/plays
export async function getGame(id: string): Promise<Game | null>;

// lib/scores.ts — "use cache", cacheTag(`scores:${gameId}`)
export async function getLeaderboard(
  gameId: string,
  limit: number,
): Promise<ScoreRow[]>;
// Sin "use cache": se llama desde una Server Action con un nombre arbitrario.
export async function getPlayerBest(
  gameId: string,
  name: string,
): Promise<{ rank: number; score: number } | null>;
```

- Ambas funciones con caché lanzan un error si Supabase responde con error, para que lo capture `error.tsx` o el bloque del leaderboard.
- `getGames` lleva el tag `scores` porque incluye `best` y `plays`.

### Tags de caché

| Tag           | Lo asigna             | Lo invalida                                |
| ------------- | --------------------- | ------------------------------------------ |
| `games`       | `getGames`, `getGame` | Nadie en esta spec (cambios por migración) |
| `scores`      | `getGames`, `getGame` | `saveScoreAction` con `updateTag`          |
| `scores:{id}` | `getLeaderboard`      | `saveScoreAction` con `updateTag`          |

### Server Actions

```ts
// app/juegos/[id]/jugar/actions.ts
"use server";
export type SaveScoreResult = { ok: true } | { ok: false; error: string };
export async function saveScoreAction(input: {
  gameId: string;
  score: number;
  name: string;
}): Promise<SaveScoreResult>;

// app/salon/actions.ts
("use server");
export async function getPlayerBestAction(
  gameId: string,
  name: string,
): Promise<{ rank: number; score: number } | null>;
```

- `saveScoreAction` normaliza el nombre (`trim` + mayúsculas) antes de validar.
- Si la validación falla, devuelve `{ ok: false, error }` sin tocar la base.
- Los mensajes de error para el usuario son fijos en español; el detalle de Supabase solo va a `console.error` del servidor.

---

## Plan de implementación

Cada paso deja la app corriendo con `npm run dev` y es commiteable por separado.
Antes de construir UI (estados vacíos, error, skeleton, mensajes del modal), invocar `/frontend-design` (ver `CLAUDE.md`), respetando la estética existente.
Antes de usar una API de Next.js, revisar `node_modules/next/dist/docs/` (ver `AGENTS.md`), en especial `01-app/01-getting-started/08-caching.md`, `cacheTag`, `updateTag`, `error.md` y `02-guides/adopting-partial-prefetching.md`.

1. **Tabla `games`.** Escribir `supabase/migrations/…_create_games.sql` con tabla, RLS, política SELECT y seed de los 9 juegos. Aplicarla con `apply_migration`. Manual: `list_tables` muestra `games` y `execute_sql` con `select count(*) from games` devuelve 9.
2. **Tabla `scores` y vistas.** Escribir y aplicar `…_create_scores.sql` y `…_create_leaderboard_views.sql`. Manual: `get_advisors` (security) no reporta tablas sin RLS ni vistas `security_definer`.
3. **Tipos y cliente público.** Generar `lib/supabase/database.types.ts` y crear `lib/supabase/public.ts`. Verificar con `npx tsc --noEmit`.
4. **Capa de catálogo.** Crear `lib/catalog.ts`. Cambiar `Game` en `lib/games.ts` (`playable`, `best: number | null`, `plays: number`) y agregar `formatPlays`. Adaptar `GameCard` y el detalle a `best` nulo y `plays` numérico. Todavía no se borra `GAMES`. Verificar con `npx tsc --noEmit`.
5. **Rutas del catálogo.** Migrar `/` (rail), `/juegos` (`Library` por props), `/juegos/[id]` y `/juegos/[id]/jugar` (incluido `generateStaticParams`) a `getGames`/`getGame`. Crear `app/error.tsx`. Manual: las 4 rutas se ven igual que antes, salvo "Mejor global" `—` y "Partidas" `0`.
6. **Leaderboard del detalle.** Crear `lib/scores.ts` con `getLeaderboard`. El detalle muestra el top 10 real detrás de `<Suspense>`, con estado vacío y estado de error. Manual: con la tabla vacía se ve `AÚN NO HAY PUNTUACIONES · SÉ EL PRIMERO`.
7. **Guardado.** Crear `saveScoreAction`. Conectar el modal de `GamePlayer`: estados `GUARDANDO…`, éxito y error con `REINTENTAR`; `DEMO: NO SE GUARDA` y botón deshabilitado si `!game.playable`. Manual: guardar una partida de `asteroides` crea la fila y el detalle la muestra en el top al volver.
8. **Salón de la Fama.** Pestañas con `<Link href="/salon?juego={id}">`, podio y tabla del top 12 en servidor detrás de `<Suspense>`. Crear `getPlayerBest` y `getPlayerBestAction` para "TU MEJOR MARCA". Manual: cambiar de pestaña actualiza la URL, y `/salon?juego=xyz` cae al primer juego.
9. **Limpieza.** Borrar `GAMES`, `getGame`, `seededScores` y `PLAYERS` de `lib/games.ts`, y `saveScore`, `readScores`, `getBestScore` y `SCORES_KEY` de `lib/session.ts`. Verificar con `grep` que no quedan referencias.
10. **Cierre técnico.** Ejecutar `npm run lint`, `npx tsc --noEmit` y `npm run build`. Corregir errores e insights de Cache Components y Partial Prefetching. Recorrer `/`, `/juegos`, `/juegos/asteroides`, `/juegos/asteroides/jugar` y `/salon` en desktop y a 360px sin errores de consola ni de hidratación.

---

## Criterios de aceptación

- [ ] `npm run build`, `npm run lint` y `npx tsc --noEmit` terminan sin errores.
- [ ] `supabase/migrations/` contiene las 3 migraciones y `list_migrations` muestra las mismas versiones.
- [ ] `games` tiene 9 filas con los mismos ids, títulos, categorías, portadas y colores que el `GAMES` anterior, y solo `asteroides` tiene `playable = true`.
- [ ] `get_advisors` (security) no reporta RLS desactivado en `games` ni `scores`, ni vistas `security_definer`.
- [ ] Con la publishable key, un `insert` directo en `scores` para `bloque-buster` es rechazado por RLS.
- [ ] Con la publishable key, `update` y `delete` sobre `games` y `scores` no afectan filas.
- [ ] Un `insert` con `score = -1`, `score = 10000000` o `name = 'abc'` es rechazado por los `CHECK`.
- [ ] `lib/games.ts` no exporta `GAMES`, `getGame`, `seededScores` ni `PLAYERS`, y `lib/session.ts` no exporta `saveScore` ni `getBestScore`.
- [ ] Ningún archivo de `app/`, `components/` o `lib/` referencia `av_scores` ni `seededScores`.
- [ ] `/juegos` muestra los 9 juegos en el orden de `sort_order` y los filtros por categoría siguen funcionando.
- [ ] El rail de la landing muestra los 6 primeros juegos de `games`.
- [ ] Con `scores` vacía, `/juegos/asteroides` muestra "Mejor global" `—`, "Partidas" `0` y `AÚN NO HAY PUNTUACIONES · SÉ EL PRIMERO`.
- [ ] Guardar una partida de `asteroides` crea una fila en `scores` con `game_id`, `name` en mayúsculas y `score` correctos.
- [ ] Tras guardar, sin recargar caché manualmente, `/juegos/asteroides` muestra el puntaje en el leaderboard, "Partidas" `1` y "Mejor global" igual al puntaje.
- [ ] Si un mismo nombre guarda 3 partidas, el leaderboard muestra una sola fila con su mejor puntaje.
- [ ] Dos nombres con el mismo puntaje se ordenan por quién lo logró antes.
- [ ] En un juego mock, el modal muestra `DEMO: NO SE GUARDA` y `GUARDAR PUNTUACIÓN` está deshabilitado.
- [ ] Si `saveScoreAction` falla, el modal muestra un error y `REINTENTAR`, y reintentar con Supabase disponible guarda una sola fila.
- [ ] `/salon` abre en `ASTEROIDES`, y `/salon?juego=caida` abre en `CAÍDA` con su pestaña activa.
- [ ] `/salon?juego=xyz` abre en el primer juego del catálogo sin error.
- [ ] Con sesión mock activa y una partida guardada con ese nombre, el Salón muestra "TU MEJOR MARCA" con rango y puntaje reales.
- [ ] Sin sesión, el Salón no muestra "TU MEJOR MARCA".
- [ ] Con una URL de Supabase inválida en `.env.local`, `/juegos` muestra `app/error.tsx` con `EL VAULT NO RESPONDE` y `REINTENTAR`.
- [ ] Si solo falla la lectura de `scores`, el detalle muestra la ficha del juego y el bloque `SIN CONEXIÓN CON EL VAULT`.
- [ ] `/juegos/asteroides/jugar` sigue jugándose igual que en SPEC 05.
- [ ] `npm run dev` no muestra errores en consola ni de hidratación en `/`, `/juegos`, `/juegos/asteroides`, `/juegos/asteroides/jugar` y `/salon`.

---

## Decisiones

- **Sí:** una sola spec para `games` y `scores`. Decisión del usuario; `scores` depende de la FK a `games` y se verifican juntas.
- **No:** dividir en dos specs. Se ofreció y se descartó.
- **Sí:** tabla `games` en Supabase como única fuente del catálogo. Era el pendiente explícito de SPEC 04.
- **No:** fallback a `lib/games.ts` si Supabase falla. Duplica el catálogo en dos fuentes que divergen.
- **Sí:** `best` y `plays` calculados desde `scores` con la vista `game_stats`. Los números del catálogo dejan de ser inventados.
- **No:** columnas estáticas `best`/`plays`. No reflejan partidas reales.
- **Sí:** `scores` arranca vacía con estado vacío en la UI. Decisión del usuario; un leaderboard real no debe mezclar jugadores ficticios.
- **No:** seed con los jugadores de `PLAYERS`. Contaminaría el ranking real.
- **Sí:** mejor marca por nombre, empate para quien lo logró antes. Un nombre no acapara el top.
- **No:** una fila por partida. Un solo jugador podría llenar el top 10.
- **Sí:** vista `leaderboard` con `DISTINCT ON` y `row_number()`. Una sola fuente para top N y para "TU MEJOR MARCA".
- **No:** función RPC o agrupar en TypeScript. Más SQL que mantener, o no escala.
- **Sí:** vistas con `security_invoker`. Heredan las políticas RLS de las tablas.
- **Sí:** Server Action con publishable key y RLS que permite INSERT anon solo en juegos `playable`. Sin Auth es la opción que no exige secret key.
- **No:** Server Action con secret key. SPEC 04 descartó el cliente admin.
- **No:** esperar a Auth. Se acepta el riesgo de trampa hasta esa spec.
- **Sí:** columna `playable` y bloqueo de guardado en juegos mock. Los puntajes simulados no entran al ranking real.
- **Sí:** validación duplicada en la Server Action y en `CHECK`. La action da mensajes claros; el `CHECK` protege del acceso directo por API.
- **Sí:** score entre 0 y 9.999.999 y nombre `^[A-Z0-9_ ]{1,10}$`. Mismo límite de 10 del modal actual y un techo contra valores absurdos.
- **Sí:** `"use cache"` con `cacheTag` y `updateTag` tras guardar. Lecturas rápidas y el jugador ve su puntaje enseguida (read-your-own-writes).
- **No:** todo dinámico con Suspense. Más carga a la base sin beneficio.
- **Sí:** cliente sin cookies en `lib/supabase/public.ts`. `cookies()` no se puede leer dentro de `"use cache"` y no hay sesión que leer.
- **Sí:** `getGames` etiquetado también con `scores`. Incluye `best` y `plays`, que cambian con cada partida.
- **Sí:** pestaña del Salón en `?juego=`. Enlazable y el servidor carga un solo juego por request.
- **No:** precargar los 9 leaderboards. Más datos por request y peor con el crecimiento de `scores`.
- **Sí:** "TU MEJOR MARCA" por Server Action. El nombre de la sesión mock solo existe en el navegador.
- **Sí:** eliminar `av_scores`. Decisión del usuario; los puntajes viejos se ignoran.
- **No:** mantener `localStorage` como respaldo. Dos fuentes de puntajes que no coinciden.
- **Sí:** `app/error.tsx` para fallos del catálogo y aviso local para fallos de `scores`. Sin catálogo no hay página; sin puntajes la ficha sigue siendo útil.
- **Sí:** `lib/games.ts` queda con tipos y `CATS`; consultas en `lib/catalog.ts` y `lib/scores.ts` con `server-only`. Los client components siguen importando tipos sin arrastrar código de servidor.
- **Sí:** migraciones en `supabase/migrations/` aplicadas por MCP y tipos generados. El esquema queda versionado en el repo.
- **Sí:** fechas del leaderboard formateadas en UTC. Servidor y cliente renderizan lo mismo.
- **No:** ticker y "TOP HOY" de la landing reales. Fuera de alcance por decisión del usuario.

---

## Riesgos

| Riesgo                                                                             | Mitigación                                                                                                                                  |
| ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Cualquiera con la publishable key inserta puntajes falsos vía API                  | `CHECK` de rango y nombre, RLS solo para juegos `playable`. Aceptado hasta la spec de Auth y anti-trampa.                                   |
| `npm run build` falla si Supabase no responde (`generateStaticParams` lee `games`) | Documentado: el build requiere `.env.local` con valores válidos. Se verifica en el paso 10.                                                 |
| `cookies()` o `searchParams` dentro de `"use cache"` rompen con Cache Components   | Las funciones cacheadas usan solo `lib/supabase/public.ts` y reciben `gameId` como argumento; `searchParams` se lee dentro de `<Suspense>`. |
| `updateTag` no refresca el detalle si el tag no coincide exactamente               | Tags definidos en una sola tabla de esta spec; un criterio verifica que el puntaje aparece tras guardar.                                    |
| Doble clic en `GUARDAR PUNTUACIÓN` inserta dos filas                               | El botón se deshabilita mientras `GUARDANDO…` y tras el éxito.                                                                              |
| La vista `leaderboard` se vuelve lenta con muchas partidas                         | Índice `(game_id, score desc, created_at)`. Si crece, se pasa a vista materializada en otra spec.                                           |
| Los tipos generados quedan desactualizados tras cambiar el esquema                 | Regenerar `database.types.ts` en el mismo commit que cada migración.                                                                        |
| El nombre `INVITADO` acumula partidas de distintas personas en una sola fila       | Aceptado sin Auth. El ranking muestra su mejor marca, como cualquier otro nombre.                                                           |
| Formato de fecha distinto entre servidor y cliente provoca errores de hidratación  | Las fechas se formatean en el servidor con `timeZone: "UTC"` y llegan como string.                                                          |

---

## Qué **no** entra en esta spec

- Supabase Auth y reemplazo de `av_user`.
- Anti-trampa y rate limiting.
- Ticker y "TOP HOY" de la landing.
- Migración de los puntajes viejos de `av_scores`.
- Administración del catálogo, portadas en Storage y Realtime.
- Paginación y rankings por periodo.
- Tests automatizados.

Cada uno de esos puntos, si llega, va en su propia spec.
