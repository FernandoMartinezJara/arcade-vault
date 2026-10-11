# SPEC 05 — Juego Asteroides jugable

> **Estado:** Aprobado
> **Depende de:** SPEC 01, SPEC 02
> **Fecha:** 2026-10-11
> **Objetivo:** Portar a TypeScript el Asteroids de `references/started-games/02-asteroids/` como el juego nuevo `asteroides`, jugable en `/juegos/asteroides/jugar` con el HUD, la pausa y el modal de fin de juego de la plataforma.

---

## Por qué existe esta spec

Hoy ningún juego del vault es real: `components/game-player.tsx` simula el puntaje con un `setInterval` y dibuja una arena decorativa.
La referencia `references/started-games/02-asteroids/game.js` es un juego completo en canvas (510 líneas, sin dependencias), pero usa globals, listeners en `window` sin limpieza, un HUD propio y un overlay `GAME OVER` con reinicio por Espacio.
Esta spec lo porta a un motor TypeScript que se monta y desmonta con React, delega HUD, pausa y fin de partida a la plataforma, y adopta la paleta neón del vault.
Es el primer juego real y deja el patrón para Tetris (`03-tetris`) y Arkanoid (`04-arkanoid`).

La fuente de verdad de la jugabilidad es `references/started-games/02-asteroids/game.js`. Física, puntos, tamaños, power-up y progresión de niveles se portan sin cambios.

---

## Alcance

**Dentro:**

- **Ficha nueva en el catálogo**, en la primera posición de `GAMES` (`lib/games.ts`):
  - id `asteroides`, título `ASTEROIDES`, categoría `SHOOTER`, color `cyan`, portada `cover-asteroides`, best `52300` y plays `1.2K` (mock).
  - `short` y `long` nuevos, basados en el README de la referencia (nave, campo toroidal, rocas que se parten, triple disparo). Sin mencionar OVNIs.
  - Por estar primera, aparece en el rail de la landing y es la pestaña inicial del Salón de la Fama.
- **Portada CSS `cover-asteroides`** en `app/globals.css`: contornos poligonales vectoriales y una nave en cyan, sin imágenes. Se distingue de `cover-rocas`, que usa círculos rellenos.
- **Motor portado a TypeScript** en `games/asteroides/`:
  - Clases `Bullet`, `Asteroid`, `PowerUp`, `Ship` y `Particle` con la misma lógica que la referencia.
  - Sin globals: todo el estado vive en la instancia del motor.
  - Loop con `requestAnimationFrame`, `dt` limitado a 50 ms, coordenadas lógicas fijas de 800×600.
  - Listeners de teclado en `window` que se quitan en `destroy()`.
- **Paleta neón** en el canvas: nave `#00f5ff` (cyan), asteroides `#e6e9ff` (`--ink`), balas `#f5ff00` (amarillo), power-up e indicador `3x` en `#ff006e` (magenta), llama del propulsor en naranja como el original, y glow suave con `shadowBlur`.
- **Pantalla de inicio en el canvas**: `PULSA ESPACIO PARA EMPEZAR` con la leyenda de controles. La partida empieza al pulsar Espacio.
- **HUD de la plataforma**: `player-hud` muestra puntaje, vidas y nivel reales del motor. Se elimina el HUD dibujado en el canvas, salvo el indicador `3x {s}s` del power-up, que queda en la esquina superior izquierda del canvas.
- **Controles solo de teclado**: `←` `→` rotar, `↑` propulsar, `Espacio` disparar. Durante la partida, flechas y Espacio no hacen scroll de la página.
- **Leyenda de controles** bajo el CRT, solo para `asteroides`: `← → ROTAR · ↑ PROPULSAR · ESPACIO DISPARAR · P PAUSA`.
- **Pausa**:
  - El botón PAUSA/REANUDAR y las teclas `P` y `Esc` congelan y reanudan el loop.
  - Se pausa sola con `visibilitychange` al ocultarse la pestaña, y solo se reanuda con REANUDAR o `P`.
  - Usa el overlay `EN PAUSA` que ya existe.
- **Fin de partida con el modal de la plataforma**:
  - Al perder la última vida se abre el modal `FIN DEL JUEGO` que ya existe, con el puntaje final.
  - El botón FIN corta la partida con el puntaje actual y abre el mismo modal.
  - `GUARDAR PUNTUACIÓN` usa `saveScore` de `lib/session.ts` (`av_scores` en `localStorage`), como hoy.
  - `JUGAR DE NUEVO` reinicia el motor y vuelve a la pantalla `PULSA ESPACIO PARA EMPEZAR`.
  - Se eliminan el overlay `GAME OVER` del canvas y el reinicio con Espacio.
- **Escalado**: el canvas ocupa el 100% de `.crt-screen` (4:3). Su buffer se ajusta al tamaño real y a `devicePixelRatio` con `ResizeObserver`, sin cambiar las coordenadas lógicas.
- **Los otros 8 juegos** siguen con el simulador mock actual en `/juegos/[id]/jugar`, sin cambios.

**Fuera de alcance (para futuras specs):**

- Controles táctiles o botones en pantalla para móvil.
- Teclas alternativas (WASD).
- Sonido (la referencia no tiene).
- Guardar puntajes en Supabase.
- Retirar o modificar la ficha `rocas` (sigue como mock).
- Portar Tetris (`03-tetris`) y Arkanoid (`04-arkanoid`).
- Mecánicas nuevas: OVNIs, hiperespacio, nuevos power-ups.
- Leaderboards reales: el detalle y el Salón siguen con `seededScores` mock.
- Corregir que `seededScores` dé las mismas filas a juegos con ids del mismo largo (`asteroides` y `serpentina`, o `caida` y `rocas`).
- Corregir el texto `12+ JUEGOS` de la landing.
- Tests automatizados.

---

## Modelo de datos

Sin persistencia nueva. Los puntajes siguen en `av_scores` con el tipo `ScoreEntry` de `lib/session.ts`.

### `lib/games.ts` — ficha nueva

```ts
{
  id: "asteroides",
  title: "ASTEROIDES",
  short: "…",            // texto nuevo, sin OVNIs
  long: "…",             // texto nuevo, basado en el README
  cat: "SHOOTER",
  cover: "cover-asteroides",
  color: "cyan",
  best: 52300,
  plays: "1.2K",
}
```

Va en `GAMES[0]`. El resto del array mantiene su orden.

### `games/asteroides/` — motor

```
games/asteroides/
  constants.ts   // W, H, RADII, SPEEDS, POINTS, POWERUP_*, TRIPLE_SPREAD, COLORS
  entities.ts    // Bullet, Asteroid, PowerUp, Ship, Particle (draw recibe ctx)
  engine.ts      // createAsteroidsEngine: estado, loop, input, colisiones, overlays
```

```ts
// constants.ts: espejo de los tokens de app/globals.css (el canvas no lee CSS vars).
export const COLORS = {
  ship: "#00f5ff",
  asteroid: "#e6e9ff",
  bullet: "#f5ff00",
  powerUp: "#ff006e",
  thrust: "rgba(255, 130, 0, 0.85)",
  text: "#e6e9ff",
  textDim: "#8a8fb5",
} as const;

// engine.ts
export type AsteroidsPhase = "ready" | "playing" | "dead" | "over";

export interface AsteroidsCallbacks {
  onScore(score: number): void;
  onLives(lives: number): void;
  onLevel(level: number): void;
  onPhase(phase: AsteroidsPhase): void; // "over" abre el modal
}

export interface AsteroidsEngine {
  setPaused(paused: boolean): void; // congela update; draw muestra el último frame
  end(): void; // FIN: pasa a "over" con el puntaje actual
  reset(): void; // JUGAR DE NUEVO: estado inicial y fase "ready"
  resize(cssWidth: number, cssHeight: number, dpr: number): void;
  destroy(): void; // cancela el rAF y quita los listeners
}

export function createAsteroidsEngine(
  canvas: HTMLCanvasElement,
  callbacks: AsteroidsCallbacks,
): AsteroidsEngine;
```

- Fases: `ready` (pantalla de inicio) → `playing` ⇄ `dead` (2 s de reaparición) → `over`.
- Espacio en `ready` pasa a `playing`. En `over` el motor ignora el teclado.
- El motor ignora eventos cuyo `target` sea un `input` o `textarea`, para que las iniciales del modal se escriban normalmente.
- `preventDefault()` sobre `ArrowLeft`, `ArrowRight`, `ArrowUp`, `ArrowDown` y `Space` solo en `ready`, `playing` y `dead`.
- Las teclas `P`/`Esc` y `visibilitychange` las maneja el componente React, que es dueño del estado `paused`.
- Callbacks solo cuando el valor cambia, nunca por frame.
- `resize` fija `canvas.width/height = css * dpr` y aplica `ctx.setTransform` para escalar 800×600 al tamaño real.

### `components/asteroides-canvas.tsx` — puente React

```ts
"use client";
export interface AsteroidesCanvasProps extends AsteroidsCallbacks {
  paused: boolean;
  engineRef: React.RefObject<AsteroidsEngine | null>; // para end() y reset() desde GamePlayer
}
```

- Crea el motor en `useEffect` y llama a `destroy()` en el cleanup (compatible con el doble montaje de Strict Mode).
- `ResizeObserver` sobre `.crt-screen` → `engine.resize(...)`.
- Renderiza `<canvas className="game-canvas" aria-label="Asteroides">`.

---

## Plan de implementación

Cada paso deja la app corriendo con `npm run dev` y es commiteable por separado.
Antes de construir UI (portada, leyenda, canvas en el CRT), invocar `/frontend-design` (ver `CLAUDE.md`), respetando la estética existente.
Antes de usar una API de Next.js, revisar `node_modules/next/dist/docs/` (ver `AGENTS.md`).

1. **Ficha y portada.** Agregar la ficha `asteroides` en `GAMES[0]` de `lib/games.ts` y la regla `.cover-asteroides` en `app/globals.css`, junto a las demás portadas. Manual: `/juegos` muestra ASTEROIDES primero con su portada, la landing la incluye en el rail, `/juegos/asteroides` abre el detalle, el Salón abre en su pestaña y `/juegos/asteroides/jugar` todavía muestra el simulador mock.
2. **Constantes y entidades.** Crear `games/asteroides/constants.ts` y `games/asteroides/entities.ts`, portando las 5 clases con tipos. `draw(ctx)` recibe el contexto y usa `COLORS`. Verificar con `npx tsc --noEmit`.
3. **Motor.** Crear `games/asteroides/engine.ts` con `createAsteroidsEngine`: estado, fases, loop, input con limpieza, colisiones, niveles, power-up, pantalla `ready`, indicador `3x` y `resize`. Sin HUD de canvas ni overlay `GAME OVER`. Verificar con `npx tsc --noEmit`.
4. **Canvas en el reproductor.** Crear `components/asteroides-canvas.tsx` y la regla `.game-canvas` (absoluta, 100% de `.crt-screen`, por debajo de los overlays). En `components/game-player.tsx`, si `game.id === "asteroides"`, renderizar `AsteroidesCanvas` en lugar de `.game-arena`, desactivar el `setInterval` mock y alimentar puntaje, vidas y nivel desde los callbacks. Manual: se juega una partida completa y el HUD refleja puntaje, vidas y nivel.
5. **Pausa.** Conectar el botón PAUSA/REANUDAR, las teclas `P`/`Esc` y `visibilitychange` con `engine.setPaused`. El botón queda deshabilitado en `ready` y `over`. Manual: pausar congela asteroides y nave, y cambiar de pestaña deja el juego en pausa.
6. **Fin de partida.** `onPhase("over")` abre el modal. FIN llama a `engine.end()`. `JUGAR DE NUEVO` llama a `engine.reset()` y limpia el estado del modal. Manual: perder las 3 vidas abre el modal y guardar deja la entrada en `av_scores`.
7. **Leyenda de controles.** Agregar bajo el CRT, solo para `asteroides`, la leyenda `← → ROTAR · ↑ PROPULSAR · ESPACIO DISPARAR · P PAUSA` con estilo `mono` atenuado. Manual: la leyenda se ve en `asteroides` y no en los demás juegos.
8. **Cierre técnico.** Ejecutar `npm run lint`, `npx tsc --noEmit` y `npm run build`. Corregir errores e insights de Cache Components y Partial Prefetching. Recorrer `/juegos/asteroides/jugar` en desktop y a 360px sin errores de consola ni de hidratación, y navegar a otra ruta y volver para confirmar que no quedan loops ni listeners duplicados.

---

## Criterios de aceptación

- [ ] `npm run build`, `npm run lint` y `npx tsc --noEmit` terminan sin errores.
- [ ] `ASTEROIDES` es la primera tarjeta en `/juegos`, con portada `cover-asteroides`, categoría SHOOTER y color cyan.
- [ ] El filtro `SHOOTER` de la Biblioteca incluye ASTEROIDES.
- [ ] El rail de la landing muestra ASTEROIDES como primera `mini-card` y enlaza a `/juegos/asteroides`.
- [ ] El Salón de la Fama abre en la pestaña ASTEROIDES.
- [ ] Ningún texto de la ficha `asteroides` menciona OVNIs.
- [ ] Al entrar a `/juegos/asteroides/jugar` se ve `PULSA ESPACIO PARA EMPEZAR` y nada se mueve hasta pulsar Espacio.
- [ ] `←` `→` rotan la nave, `↑` la propulsa y `Espacio` dispara.
- [ ] Durante la partida, flechas y Espacio no hacen scroll de la página.
- [ ] Destruir un asteroide grande, mediano y pequeño suma 20, 50 y 100 puntos, y el HUD de React lo refleja.
- [ ] Los asteroides grandes se parten en 2 medianos, los medianos en 2 pequeños y los pequeños desaparecen.
- [ ] Al chocar se pierde una vida, el HUD muestra un `♥` menos y la nave reaparece al centro parpadeando e invencible.
- [ ] Al destruir todos los asteroides, el HUD pasa al nivel siguiente y aparecen `3 + nivel` asteroides grandes.
- [ ] Recoger el power-up activa el triple disparo y muestra `3x {s}s` en magenta en el canvas durante 5 s.
- [ ] El canvas no dibuja `SCORE`, `NIVEL`, íconos de vidas ni `GAME OVER`.
- [ ] Nave, asteroides, balas y power-up usan los colores de `COLORS`.
- [ ] PAUSA, `P` y `Esc` congelan el juego y muestran `EN PAUSA`; REANUDAR y `P` lo reanudan.
- [ ] Ocultar la pestaña y volver deja el juego en pausa.
- [ ] Perder la tercera vida abre el modal `FIN DEL JUEGO` con el puntaje final.
- [ ] FIN abre el modal con el puntaje actual y el juego deja de moverse.
- [ ] En el modal se pueden escribir iniciales con espacios sin que el motor reaccione.
- [ ] `GUARDAR PUNTUACIÓN` agrega `{ game: "asteroides", score, name, at }` a `av_scores`.
- [ ] Tras guardar, la pestaña ASTEROIDES del Salón muestra ese puntaje como mejor marca del usuario con sesión.
- [ ] `JUGAR DE NUEVO` cierra el modal, deja puntaje 0, 3 vidas y nivel 01, y muestra `PULSA ESPACIO PARA EMPEZAR`.
- [ ] El canvas se ve nítido en una pantalla retina y llena `.crt-screen` a 360px y en desktop sin deformarse.
- [ ] Salir con SALIR y volver a entrar no duplica la velocidad del juego ni los disparos por tecla.
- [ ] La leyenda de controles aparece solo en `/juegos/asteroides/jugar`.
- [ ] Los otros 8 juegos siguen mostrando el simulador mock sin cambios.
- [ ] `npm run dev` no muestra errores en consola ni de hidratación en `/juegos/asteroides/jugar`.

---

## Decisiones

- **Sí:** juego nuevo `asteroides` en el catálogo. Decisión del usuario; ROCAS queda como mock.
- **No:** reemplazar `rocas`. Se descartó a favor de una ficha propia.
- **Sí:** `asteroides` en la primera posición. Es el único jugable: queda en el rail de la landing y como pestaña inicial del Salón.
- **Sí:** color `cyan`. ROCAS ya usa `yellow` y la nave del juego es cyan.
- **Sí:** portada CSS nueva `cover-asteroides`. Dos juegos con la misma portada confunden en la Biblioteca.
- **Sí:** port a TypeScript en `games/asteroides/`. Permite montar y desmontar con React y comunicar puntaje, vidas y fases sin globals.
- **No:** iframe con el original. Aísla el juego del HUD, el modal y el guardado.
- **No:** cargar `game.js` con `<Script>`. Deja globals y listeners vivos al navegar.
- **Sí:** carpeta `games/` en la raíz. `lib/games/` convivía con `lib/games.ts` y se prestaba a confusión. Tetris y Arkanoid seguirán el mismo patrón.
- **Sí:** HUD de la plataforma alimentado por callbacks que solo se disparan al cambiar el valor. Consistencia visual y sin re-render por frame.
- **No:** HUD duplicado o solo en canvas. Duplica información o rompe la consistencia.
- **Sí:** indicador `3x` en el canvas. Cambia varias veces por segundo y no vale la pena llevarlo a React.
- **Sí:** paleta neón con colores en `COLORS`. Integra el juego con el CRT. El canvas no lee variables CSS, así que se duplican los hex con un comentario.
- **No:** blanco fiel al original. Desentona con el resto del vault.
- **Sí:** solo teclado. El juego original es de teclado; lo táctil es otra spec.
- **Sí:** pausa con botón, `P`, `Esc` y auto-pausa por `visibilitychange`. Evita perder vidas al cambiar de pestaña.
- **Sí:** el componente React maneja pausa y visibilidad, y el motor solo expone `setPaused`. Una sola fuente de verdad para `paused`, que ya vive en `GamePlayer`.
- **Sí:** pantalla `PULSA ESPACIO PARA EMPEZAR`. El jugador no pierde vidas mientras lee, y el primer Espacio confirma que el teclado está activo.
- **Sí:** `JUGAR DE NUEVO` vuelve a la pantalla de inicio. Es el mismo flujo de entrada y no lanza la partida mientras el jugador vuelve al teclado.
- **Sí:** fin con el modal de la plataforma. Reutiliza iniciales y guardado; se elimina el reinicio por Espacio del original.
- **No:** overlay `GAME OVER` del canvas antes del modal. Duplica el mensaje.
- **Sí:** puntajes en `localStorage` con `saveScore`. Supabase va en otra spec.
- **Sí:** coordenadas lógicas 800×600 con buffer escalado a `devicePixelRatio`. Nítido en retina y en cualquier ancho sin tocar la física.
- **No:** buffer fijo escalado por CSS. Se ve borroso.
- **Sí:** el motor ignora el teclado cuando el foco está en un `input`/`textarea` y en la fase `over`. El modal de iniciales sigue funcionando.
- **Sí:** los otros 8 juegos conservan el simulador mock. No cambia el comportamiento de rutas fuera del alcance.

---

## Riesgos

| Riesgo                                                                          | Mitigación                                                                                                              |
| ------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Strict Mode monta el efecto dos veces y deja dos loops o listeners duplicados   | `destroy()` cancela el rAF y quita los listeners; un criterio verifica salir, volver y que la velocidad no se duplique. |
| El canvas tapa los overlays `EN PAUSA` o el modal                               | `.game-canvas` va por debajo de `.crt-content` (z-index) y el modal vive fuera del CRT.                                 |
| Espacio en un botón enfocado (PAUSA) lo activa además de disparar               | Al iniciar la partida se quita el foco del botón activo (`blur`); verificarlo en el paso 5.                             |
| `devicePixelRatio` alto (3x) en móviles agranda el buffer y baja el rendimiento | Limitar `dpr` a 2 en `resize`.                                                                                          |
| Callbacks por frame causan re-renders del HUD                                   | El motor compara con el último valor emitido antes de llamar.                                                           |
| El modo `ready` deja una pantalla negra si el canvas aún no tiene tamaño        | `resize` se llama al montar con el tamaño inicial de `.crt-screen`, antes del primer `draw`.                            |
| Insights de Cache Components en `/juegos/[id]/jugar`                            | La ruta no cambia su lectura de `params`; el motor vive en un client component. Resolver en el paso 8.                  |
| En móvil sin teclado el juego no es jugable                                     | Aceptado en esta spec; la leyenda deja claro que es de teclado. Lo táctil va en otra spec.                              |

---

## Qué **no** entra en esta spec

- Controles táctiles y WASD.
- Sonido.
- Puntajes en Supabase y leaderboards reales.
- Cambios a la ficha `rocas`.
- Tetris y Arkanoid.
- Mecánicas nuevas (OVNIs, hiperespacio, power-ups).
- Tests automatizados.

Cada uno de esos puntos, si llega, va en su propia spec.
