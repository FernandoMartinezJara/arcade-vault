# SPEC 01 — MVP visual: pantallas de Arcade Vault

> **Estado:** Implementado
> **Depende de:** Ninguna
> **Fecha:** 2026-10-10
> **Objetivo:** Implementar en Next.js las cinco pantallas de `references/templates/` (Biblioteca, Detalle, Reproductor, Acceso y Salón de la Fama) como capa visual navegable con datos mock y sin ningún juego real.

---

## Por qué existe esta spec

El repo es un scaffold de `create-next-app` con el tema visual ya portado (`app/globals.css`) y las fuentes cargadas (`app/layout.tsx`).
Las plantillas de referencia son un prototipo React 18 vía CDN con router por hash.
Esta spec traduce ese prototipo al App Router de Next.js 16 con rutas reales, manteniendo la estética intacta.
Es la base sobre la que las próximas specs montarán juegos, backend y autenticación real.

---

## Alcance

**Dentro:**

- Rutas App Router: `/`, `/juegos/[id]`, `/juegos/[id]/jugar`, `/login`, `/salon`.
- Nav superior con logo, links activos, contador `CRÉDITOS · 03` estático, botón de sesión y menú móvil (hamburguesa + panel lateral).
- Footer `© 2026 ARCADE VAULT · HECHO CON PIXELES Y NEÓN · v2.6.0`.
- **Biblioteca (`/`):** hero, buscador por nombre, chips de categoría, grilla de `GameCard` con efecto tilt y estado "NO HAY RESULTADOS".
- **Detalle (`/juegos/[id]`):** portada, tags, descripción larga, stat strip, botones `JUGAR AHORA` / `VOLVER AL VAULT` y leaderboard de 10 filas mock.
- **Reproductor (`/juegos/[id]/jugar`):** HUD (jugador, puntuación, vidas, nivel), CRT con arena decorativa animada, puntaje simulado con `setInterval`, Pausa/Reanudar, `FIN` abre modal "FIN DEL JUEGO" con guardar puntuación, jugar de nuevo y volver al Vault.
- **Acceso (`/login`):** tabs Iniciar sesión / Crear cuenta, campos usuario/correo/contraseña, botón invitado y botones sociales (Google, GitHub) sin acción.
- **Salón de la Fama (`/salon`):** tabs por juego (estado local), podio top 3, tabla de 12 filas mock y fila "TU MEJOR MARCA" leída desde `av_scores`.
- Página 404 con estética arcade (`app/not-found.tsx`) para ids de juego inexistentes y rutas desconocidas.
- Mock de sesión y puntuaciones en `localStorage` (`av_user`, `av_scores`).
- Pre-generación de las 8 páginas de detalle y reproductor con `generateStaticParams`.

**Fuera de alcance (para futuras specs):**

- Cualquier juego jugable (lógica, canvas, input de teclado/táctil).
- Backend, base de datos o API de puntuaciones.
- Autenticación real, validación de formularios y OAuth (Google/GitHub).
- Sistema de créditos funcional (el contador es decorativo).
- Leaderboards reales: todos los rankings salvo "TU MEJOR MARCA" son mock deterministas.
- Query params compartibles en el Salón (`?juego=`).
- Tests automatizados (no hay test runner configurado).
- Rediseño visual: la estética es la de la plantilla.

---

## Modelo de datos

### `lib/games.ts` — datos mock tipados

Port directo de `references/templates/data.jsx`, con tipos.

```ts
export type GameCategory = "ARCADE" | "PUZZLE" | "SHOOTER" | "VERSUS";
export type GameColor = "cyan" | "magenta" | "yellow" | "green";

export interface Game {
  id: string;            // slug usado en la URL: "bloque-buster"
  title: string;         // "BLOQUE BUSTER"
  short: string;         // descripción de tarjeta
  long: string;          // descripción de detalle
  cat: GameCategory;
  cover: string;         // clase CSS de portada: "cover-bricks"
  color: GameColor;
  best: number;          // mejor puntuación global mock
  plays: string;         // "12.4K"
}

export interface ScoreRow {
  rank: number;
  name: string;
  score: number;
  date: string;          // "DD/MM/2026"
}

export const GAMES: Game[];                       // los 8 juegos de data.jsx
export const CATS: ("TODOS" | GameCategory)[];    // ["TODOS", "ARCADE", "PUZZLE", "SHOOTER", "VERSUS"]
export function getGame(id: string): Game | undefined;
export function seededScores(seed: number, count?: number): ScoreRow[];
```

Semillas (idénticas a la plantilla, para que los mock sean deterministas entre servidor y cliente):

- Detalle: `seededScores(id.length * 17 + 3, 10)`.
- Salón: `seededScores(id.length * 23 + 7, 12)`.

### `lib/session.ts` — mock de sesión en `localStorage`

```ts
export interface User { name: string }            // máx. 10 caracteres, en mayúsculas

export interface ScoreEntry {
  game: string;   // Game.id
  score: number;
  name: string;   // iniciales escritas en el modal (máx. 10, mayúsculas)
  at: number;     // Date.now()
}
```

Claves de `localStorage` (mismas que la plantilla):

- `av_user` → `User | null` serializado.
- `av_scores` → `ScoreEntry[]` serializado.

API expuesta:

- `useUser(): User | null` — hook basado en `useSyncExternalStore`; devuelve `null` en el servidor y se actualiza en todas las instancias (Nav incluido) al hacer login/logout.
- `login(user: User): void` y `logout(): void` — escriben/borran `av_user` y notifican a los suscriptores.
- `saveScore(entry: Omit<ScoreEntry, "at">): void` — agrega a `av_scores`.
- `getBestScore(gameId: string, name: string): number | null` — máximo de `av_scores` filtrado por juego y nombre.

Todo acceso a `localStorage` va envuelto en `try/catch`; si falla, la app sigue funcionando sin persistir.

### Rango de "TU MEJOR MARCA"

`rank = 1 + cantidad de filas mock con score mayor al del usuario`.
La fila solo se muestra si hay sesión **y** `getBestScore(juego, user.name)` no es `null`.

---

## Plan de implementación

Cada paso deja la app corriendo con `npm run dev` y es commiteable por separado.
Antes de usar una API de Next.js, revisar `node_modules/next/dist/docs/` (ver `AGENTS.md`).
Antes de construir UI, invocar `/frontend-design` (ver `CLAUDE.md`), respetando la estética de la plantilla.

1. **Datos mock.** Crear `lib/games.ts` con tipos, `GAMES`, `CATS`, `getGame` y `seededScores`. Verificar con `npx tsc --noEmit`.
2. **Mock de sesión.** Crear `lib/session.ts` con `useUser`, `login`, `logout`, `saveScore` y `getBestScore`. Verificar con `npx tsc --noEmit`.
3. **Shell.** Crear `components/nav.tsx` (client: `usePathname` para link activo, menú móvil, botón de sesión con `useUser`) y `components/footer.tsx`. Montarlos en `app/layout.tsx` alrededor de `<main className="av-main">`. Manual: el nav y el footer se ven en `/`.
4. **Biblioteca.** Reemplazar el contenido de `app/page.tsx` por el hero y `components/library.tsx` (client: búsqueda + chips). Crear `components/game-card.tsx` (client: tilt) con `<Link>` a `/juegos/[id]`. Manual: filtrar por "caí" + chip PUZZLE muestra solo CAÍDA.
5. **Detalle.** Crear `app/juegos/[id]/page.tsx` con `generateStaticParams` (8 ids), `notFound()` si `getGame` devuelve `undefined`, y `components/leaderboard.tsx`. Manual: `/juegos/caida` muestra el detalle completo.
6. **404.** Crear `app/not-found.tsx` con estética neón y botón a `/`. Manual: `/juegos/xyz` y `/cualquier-cosa` muestran el 404.
7. **Reproductor.** Crear `app/juegos/[id]/jugar/page.tsx` (con `generateStaticParams` y `notFound()`) y `components/game-player.tsx` (client: HUD, CRT, timer, pausa, modal fin con `saveScore`). Manual: el puntaje sube, PAUSA lo congela, FIN abre el modal y guardar muestra `▸ PUNTUACIÓN GUARDADA_`.
8. **Acceso.** Crear `app/login/page.tsx` y `components/auth-form.tsx` (client: tabs, `login`, invitado con `logout`, redirección a `/` con `useRouter`). Manual: entrar como `px_kai` muestra `PX_KAI ▾` en el nav.
9. **Salón de la Fama.** Crear `app/salon/page.tsx` y `components/hall-of-fame.tsx` (client: tabs, podio, tabla, fila "TU MEJOR MARCA"). Manual: cambiar de tab cambia podio y tabla.
10. **Cierre técnico.** Ejecutar `npm run lint`, `npx tsc --noEmit` y `npm run build`; corregir errores e insights de Cache Components / Partial Prefetching que aparezcan.

---

## Criterios de aceptación

- [ ] `npm run build`, `npm run lint` y `npx tsc --noEmit` terminan sin errores.
- [ ] `npm run dev` no muestra errores en consola ni errores de hidratación al recorrer las cinco pantallas.
- [ ] `/` muestra el hero "ARCADE VAULT", el buscador, los 5 chips y 8 tarjetas.
- [ ] Escribir "zzz" en el buscador muestra "NO HAY RESULTADOS".
- [ ] Seleccionar el chip SHOOTER muestra solo INVASORES y ROCAS.
- [ ] Clic en una tarjeta o en su botón JUGAR navega a `/juegos/[id]`.
- [ ] `/juegos/bloque-buster` muestra título, tags, stat strip y un leaderboard de 10 filas con el top 3 destacado.
- [ ] `JUGAR AHORA` navega a `/juegos/[id]/jugar` y `VOLVER AL VAULT` navega a `/`.
- [ ] `/juegos/xyz` y `/juegos/xyz/jugar` muestran la página 404 arcade.
- [ ] En el Reproductor la puntuación aumenta sola; PAUSA la detiene y muestra "EN PAUSA"; REANUDAR la retoma.
- [ ] FIN abre el modal con la puntuación final; GUARDAR PUNTUACIÓN agrega una entrada a `av_scores` y muestra el toast.
- [ ] JUGAR DE NUEVO reinicia puntuación a 0, vidas a 3 y nivel a 01; SALIR vuelve al detalle del juego.
- [ ] En `/login`, la tab CREAR CUENTA muestra el campo de correo y la tab INICIAR SESIÓN lo oculta.
- [ ] Enviar el formulario con usuario `px_kai` guarda `av_user`, redirige a `/` y el nav muestra `PX_KAI ▾`.
- [ ] Clic en el nombre del nav cierra sesión y vuelve a mostrar "Iniciar Sesión".
- [ ] La sesión persiste al recargar la página.
- [ ] En `/salon` cambiar de tab actualiza el podio y la tabla de 12 filas.
- [ ] Con sesión y una puntuación guardada para el juego seleccionado, aparece la fila "TU MEJOR MARCA" con ese puntaje; sin puntuación guardada, la fila no aparece.
- [ ] El link activo del nav corresponde a la pantalla actual (Biblioteca activo también en detalle y reproductor).
- [ ] Con ancho ≤ 768px aparece el botón hamburguesa y abre/cierra el panel lateral.
- [ ] La apariencia de cada pantalla coincide con `references/templates/Arcade Vault.html` abierto en el navegador.

---

## Decisiones

- **Sí:** rutas reales del App Router en español (`/juegos/[id]`, `/juegos/[id]/jugar`, `/login`, `/salon`). Permiten botón atrás, URLs directas y prefetch de `<Link>`.
- **No:** SPA con router por hash como la plantilla. No aprovecha Next.js.
- **No:** rutas en inglés. El producto y la UI están en español.
- **Sí:** reutilizar las clases CSS ya portadas en `app/globals.css`. El trabajo de estilos ya está hecho y garantiza fidelidad.
- **No:** migrar los estilos a utilidades Tailwind. Mucho trabajo sin cambio visible.
- **No:** rediseño libre. `/frontend-design` se usa solo para pulir accesibilidad y estados hover/focus sin cambiar la estética.
- **Sí:** Reproductor simulado como la plantilla (timer de puntaje, pausa, modal). Permite validar el flujo completo sin juego real.
- **No:** Reproductor estático. No permitiría probar el modal ni el guardado de puntuación.
- **Sí:** mock de sesión y puntuaciones en `localStorage` con las claves `av_user` y `av_scores`. Da un flujo creíble sin backend.
- **No:** estado solo en memoria. Se pierde al recargar y rompe la demo.
- **Sí:** `useSyncExternalStore` para leer la sesión. Evita mismatches de hidratación y sincroniza Nav y pantallas.
- **Sí:** tabs del Salón en estado local. Fiel a la plantilla y sin `<Suspense>` adicional por `searchParams`.
- **No:** query param `?juego=`. Queda para una spec futura si se necesita compartir URLs.
- **Sí:** `notFound()` + `app/not-found.tsx` arcade para ids inválidos. Más claro que redirigir en silencio.
- **No:** `redirect("/")` para ids inválidos. Oculta errores de URL.
- **Sí:** "TU MEJOR MARCA" calculada desde `av_scores`. Conecta el guardado del Reproductor con el Salón.
- **No:** fila inventada como en la plantilla. Mostraría datos que contradicen lo guardado.
- **Sí:** datos mock en `lib/games.ts` con las mismas semillas que la plantilla. Los rankings son deterministas y renderizan igual en servidor y cliente.
- **Sí:** contador `CRÉDITOS · 03` y botones sociales sin acción. Son decorativos en este MVP.

---

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Mismatch de hidratación al leer `localStorage` durante el render | `useUser` usa `useSyncExternalStore` con snapshot de servidor `null`. Nada lee `localStorage` fuera de ese hook o de handlers de eventos. |
| `toLocaleString("es-ES")` formatea distinto en servidor y cliente | Node incluye ICU completo; verificar en el paso 10 que no aparezcan warnings. Si aparecen, usar un formateador propio en `lib/games.ts`. |
| Insights de `cacheComponents` / `partialPrefetching` por leer `params` o `usePathname` fuera de `<Suspense>` | Revisar las guías en `node_modules/next/dist/docs/` antes de cada ruta y resolver los insights en el paso 10. |
| `localStorage` bloqueado (modo privado, cookies deshabilitadas) | Accesos en `try/catch`; la app funciona sin persistir. |
| El efecto tilt de `GameCard` no aplica en pantallas táctiles | Aceptado: es solo decoración de hover. |

---

## Qué **no** entra en esta spec

- Juegos jugables.
- Backend, API o base de datos.
- Autenticación real, validación de formularios y OAuth.
- Créditos funcionales.
- Leaderboards reales.
- URLs compartibles con query params en el Salón.
- Tests automatizados.

Cada uno de esos puntos, si llega, va en su propia spec.
