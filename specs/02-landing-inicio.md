# SPEC 02 — Landing de inicio

> **Estado:** Aprobado
> **Depende de:** SPEC 01
> **Fecha:** 2026-10-10
> **Objetivo:** Reemplazar `/` por la landing de `references/home-about/` (home + nav con "Inicio") y mover la Biblioteca a `/juegos`, dejando fuera la página Acerca de.

---

## Por qué existe esta spec

La SPEC 01 dejó la Biblioteca en `/` como punto de entrada.
La nueva referencia `references/home-about/arcade-vault-standalone.html` agrega una landing de marketing previa a la Biblioteca.
Al desempaquetar el bundle, todas sus pantallas son idénticas a `references/templates/`. Solo cambian tres cosas:

- `home.jsx`: la landing nueva (hero, features, rail de juegos, stats, actividad, precios, CTA final).
- `nav.jsx`: agrega los links "Inicio" y "Acerca de", y el logo lleva al home.
- `styles.css`: solo agrega reglas nuevas (no modifica las existentes de la SPEC 01).

Las fuentes de verdad de esta spec son `references/home-about/home.jsx`, `references/home-about/nav.jsx` y `references/home-about/styles.css`.
`references/home-about/about.jsx` queda fuera.

---

## Alcance

**Dentro:**

- **Landing en `/`**, fiel a `home.jsx`:
  - Hero con siluetas pixel flotantes (8 SVG decorativos), eyebrow `▸ INSERTA UNA MONEDA_`, título en tres líneas `EL ARCADE / CLÁSICO ESTÁ / DE VUELTA`, subtítulo, CTAs `▶ EXPLORAR JUEGOS` (→ `/juegos`) y `✦ CREAR CUENTA` (→ `/login`), e indicador `DESLIZA ▼`.
  - `// 01 ¿POR QUÉ ARCADE VAULT?`: 4 `feature-card` con íconos pixel (GAMEPAD, FREE, TROPHY, ROCKET).
  - `// 02 JUEGOS DISPONIBLES AHORA`: rail con los 6 primeros `GAMES` como `mini-card` (→ `/juegos/[id]`) y botón `VER TODOS LOS JUEGOS →` (→ `/juegos`).
  - Franja de stats: `12+ JUEGOS`, `MILES DE PARTIDAS`, `GLOBAL RANKING`.
  - `// 03 ACTIVIDAD EN VIVO`: ticker "ÚLTIMAS PUNTUACIONES" (7 filas) y "TOP JUGADORES · HOY" (5 filas) con link `VER SALÓN →` (→ `/salon`).
  - `// 04 PRECIOS`: tarjeta "JUGADOR VAULT · $0 / SIEMPRE" con lista, sello `FREE PLAY`, botón `EMPEZAR GRATIS →` (→ `/login`) y 3 preguntas FAQ.
  - CTA final `¿LISTO PARA JUGAR?` con botón `INSERTAR MONEDA →` (→ `/juegos`).
  - Animación `.reveal` por sección con `IntersectionObserver`.
- **Biblioteca movida a `/juegos`**: mismo hero `ARCADE VAULT`, buscador, chips y grilla que hoy tiene `/`, sin cambios de comportamiento.
- **Nav**: links `Inicio` (→ `/`), `Biblioteca` (→ `/juegos`) y `Salón de la Fama`, en desktop y en el panel móvil. El logo lleva a `/`.
- **Links que hoy apuntan a `/`** y pasan a `/juegos`: `VOLVER AL VAULT` (detalle, modal del reproductor y 404), `VOLVER A LA BIBLIOTECA` (Salón) y la redirección tras login e invitado.
- **CSS**: portar a `app/globals.css` solo los bloques de `references/home-about/styles.css` que usa la landing.
- **Scroll horizontal en móviles angostos (360–420px)**: corregirlo en el nav, la sección de actividad de la landing, el Detalle y el Salón de la Fama (los tres últimos heredados de la SPEC 01 o del CSS de la referencia).

**Fuera de alcance (para futuras specs):**

- Página Acerca de / Contacto (`about.jsx`) y su link "Acerca de" en el nav.
- CSS de About, Contacto, Gamepad, Terminal y "tweaks" (`about-*`, `contact-*`, `gp-*`, `term-*`, `tw-*`, `highlight-*`, `score-pop`, `spinner`).
- Datos reales en la landing: stats, ticker y top jugadores son mock estáticos (no leen `av_scores` ni `seededScores`).
- Corregir el texto `12+ JUEGOS` aunque hoy haya 8 juegos.
- Abrir directamente la tab CREAR CUENTA desde los CTAs (`/login?modo=registro`).
- Variar los CTAs según haya sesión: la landing es igual con o sin sesión.
- Redirección de `/` a `/juegos` para enlaces antiguos.
- Tests automatizados.
- Rediseño visual: la estética es la de la referencia.

---

## Modelo de datos

No hay persistencia nueva ni cambios en `lib/games.ts` ni en `lib/session.ts`.
Se agrega un módulo de contenido estático tipado para la landing.

### `lib/home.ts` — contenido mock de la landing

Port literal de los arrays inline de `home.jsx`.

```ts
import type { GameColor } from "@/lib/games";

export type FeatureIconKind = "GAMEPAD" | "FREE" | "TROPHY" | "ROCKET";

export interface Feature {
  icon: FeatureIconKind;
  title: string;        // "JUEGOS CLÁSICOS"
  desc: string;
  color: GameColor;     // clase de color de la tarjeta
}

export interface HomeStat {
  n: string;            // "12+"
  u: string;            // "JUEGOS"
  s: string;            // "Y CONTANDO"
}

export interface TickerRow {
  player: string;       // "NEONFOX"
  game: string;         // "Caída"
  score: number;
  ago: string;          // "hace 2 min"
  color: GameColor;
}

export interface TopPlayer {
  rank: number;
  player: string;
  score: number;
}

export interface Faq {
  q: string;
  a: string;
}

export const FEATURES: Feature[];        // 4 entradas
export const HOME_STATS: HomeStat[];     // 3 entradas
export const TICKER: TickerRow[];        // 7 entradas
export const TOP_TODAY: TopPlayer[];     // 5 entradas
export const PRICING_PERKS: string[];    // 6 entradas, con el "✔ " incluido
export const FAQS: Faq[];                // 3 entradas
```

El ancho de la barra del top se calcula en el render como en la plantilla: `100 - índice * 16` (%).
Los puntajes se formatean con `toLocaleString("es-ES")`, igual que el resto de la app.

---

## Plan de implementación

Cada paso deja la app corriendo con `npm run dev` y es commiteable por separado.
Antes de usar una API de Next.js, revisar `node_modules/next/dist/docs/` (ver `AGENTS.md`).
Antes de construir UI, invocar `/frontend-design` (ver `CLAUDE.md`), respetando la estética de la referencia.

1. **Mover la Biblioteca.** Crear `app/juegos/page.tsx` con el contenido actual de `app/page.tsx` (hero `ARCADE VAULT` + `<Library />`). Dejar `app/page.tsx` temporalmente igual. Manual: `/juegos` muestra la Biblioteca y `/juegos/caida` sigue funcionando.
2. **Actualizar links y nav.** En `components/nav.tsx`: agregar `Inicio` (→ `/`, activo solo en `/`), `Biblioteca` pasa a `/juegos` (activo en `/juegos` y sus subrutas), el logo apunta a `/` con `aria-label` "Arcade Vault, ir al inicio", y el panel móvil replica los mismos links. Cambiar a `/juegos` los links de `app/juegos/[id]/page.tsx`, `components/game-player.tsx`, `app/not-found.tsx`, `components/hall-of-fame.tsx` y los dos `router.push` de `components/auth-form.tsx`. Manual: `VOLVER AL VAULT` desde un detalle lleva a `/juegos`.
3. **CSS de la landing.** Copiar a `app/globals.css` los bloques `HOME PAGE` (incluye `.reveal`), `ACTIVITY` y `PRICING` de `references/home-about/styles.css`, sin tocar las reglas existentes. Agregar el fallback de `.reveal`: bajo `prefers-reduced-motion: reduce` las secciones se ven sin transición (`opacity: 1; transform: none`). Manual: `npm run dev` compila sin errores.
4. **Contenido mock.** Crear `lib/home.ts` con los tipos y constantes del modelo de datos. Verificar con `npx tsc --noEmit`.
5. **Componentes de la landing.** Crear como server components `components/home-silhouettes.tsx` (8 SVG con `aria-hidden`), `components/feature-icon.tsx` (íconos pixel) y `components/mini-card.tsx` (un `<Link>` a `/juegos/[id]` con portada, título y categoría). Crear `components/reveal-observer.tsx` (client, renderiza `null`): observa los `.reveal`, les agrega `.in` al entrar en pantalla y, si no existe `IntersectionObserver`, agrega `.in` a todos de inmediato.
6. **Landing.** Reemplazar `app/page.tsx` por la landing (server component) con las 7 secciones de `home.jsx`, usando `<Link>` en todos los CTAs, `<RevealObserver />` y un `<noscript><style>` que deja `.reveal` visible sin JS. Manual: `/` muestra la landing completa y cada CTA navega a su destino.
7. **Ajustes para móvil angosto.** En `app/globals.css`:
   - **Nav:** agregar `@media (max-width: 420px)` que baja el `gap` de `.av-nav` a 12px y el padding horizontal de `.av-nav .auth-btn` a 14px. Hoy, a 375px, logo + botón de sesión + hamburguesa + gaps suman 396px.
   - **Actividad (landing) y Detalle:** en sus media queries de ≤ 900px, cambiar `grid-template-columns: 1fr` por `minmax(0, 1fr)` en `.activity-grid` y `.av-detail`. Un track `1fr` no baja de su contenido mínimo, y el ticker y el leaderboard lo ensanchan más allá del contenedor.
   - **Stats del Detalle:** en el mismo `@media (max-width: 420px)`, bajar `.stat-strip .v` a 12px y el padding de cada celda a 10px. A 360px, los tres valores en 16px necesitan ~351px y solo hay 328px.
   - **Tabla del Salón:** agregar `@media (max-width: 420px)` con columnas compactas para `.hall-table .th, .hall-table .tr` (rango y puntaje fijos, jugador `minmax(0, 1fr)`, gap y padding menores) y encabezados más chicos para que `PUNTUACIÓN` quepa en su columna.
   Manual: a 360px y 375px, con y sin sesión, ninguna pantalla tiene scroll horizontal, el botón de sesión sigue visible y la tabla del Salón no superpone columnas.
8. **Cierre técnico.** Ejecutar `npm run lint`, `npx tsc --noEmit` y `npm run build`. Corregir errores e insights de Cache Components / Partial Prefetching. Recorrer `/`, `/juegos`, detalle, reproductor, login, salón y 404 sin errores de hidratación.

---

## Criterios de aceptación

- [ ] `npm run build`, `npm run lint` y `npx tsc --noEmit` terminan sin errores.
- [ ] `npm run dev` no muestra errores en consola ni de hidratación al recorrer `/` y `/juegos`.
- [ ] `/` muestra el hero `EL ARCADE / CLÁSICO ESTÁ / DE VUELTA` con las siluetas pixel animadas.
- [ ] `/` muestra, en orden: 4 features, rail de 6 juegos, 3 stats, ticker de 7 filas + top de 5 filas, tarjeta de precios con sello `FREE PLAY` + 3 FAQ, y el CTA final `¿LISTO PARA JUGAR?`.
- [ ] `▶ EXPLORAR JUEGOS`, `VER TODOS LOS JUEGOS →` e `INSERTAR MONEDA →` navegan a `/juegos`.
- [ ] `✦ CREAR CUENTA` y `EMPEZAR GRATIS →` navegan a `/login`.
- [ ] `VER SALÓN →` navega a `/salon`.
- [ ] Clic en una `mini-card` navega a `/juegos/[id]` del juego correspondiente.
- [ ] Las secciones aparecen con fade al hacer scroll; con "reducir movimiento" activado se ven de inmediato sin transición.
- [ ] Con JavaScript deshabilitado, todas las secciones de `/` son visibles.
- [ ] `/juegos` muestra el hero `ARCADE VAULT`, el buscador, los 5 chips y 8 tarjetas; "zzz" muestra "NO HAY RESULTADOS".
- [ ] El nav muestra `Inicio`, `Biblioteca` y `Salón de la Fama` (sin "Acerca de"), en desktop y en el panel móvil.
- [ ] `Inicio` está activo solo en `/`; `Biblioteca` está activo en `/juegos`, `/juegos/[id]` y `/juegos/[id]/jugar`.
- [ ] El logo del nav navega a `/`.
- [ ] `VOLVER AL VAULT` (detalle, modal del reproductor, 404) y `VOLVER A LA BIBLIOTECA` (Salón) navegan a `/juegos`.
- [ ] Enviar el login o entrar como invitado redirige a `/juegos`.
- [ ] Con ancho ≤ 600px el rail muestra 2 columnas y las features 1 columna en ≤ 520px, sin scroll horizontal.
- [ ] A 360px y 375px, con y sin sesión, ninguna pantalla (`/`, `/juegos`, detalle, reproductor, login, salón, 404) tiene scroll horizontal y el botón de sesión del nav sigue visible.
- [ ] A 360px las columnas de la tabla del Salón no se superponen y cada puntaje se lee completo.
- [ ] La apariencia de `/` coincide con la pantalla Inicio de `references/home-about/arcade-vault-standalone.html` abierta en el navegador.

---

## Decisiones

- **Sí:** Biblioteca en `/juegos`. Forma jerarquía con `/juegos/[id]` y `/juegos/[id]/jugar`, y el link activo se resuelve con `startsWith("/juegos")`.
- **No:** `/biblioteca`. Coincide con la etiqueta, pero rompe la jerarquía con las rutas de juego existentes.
- **Sí:** omitir "Acerca de" del nav hasta su spec. Evita links rotos.
- **No:** link "Acerca de" deshabilitado con "PRONTO". Agrega un estado temporal que luego hay que quitar.
- **Sí:** stats, ticker y top jugadores como mock estático idéntico a la plantilla, incluido `12+ JUEGOS`. Fidelidad sin lógica nueva.
- **No:** derivar actividad desde `av_scores` o `seededScores`. Requiere definir estados vacíos y queda para una spec de leaderboards reales.
- **Sí:** CTAs de cuenta como link simple a `/login`. No toca `auth-form` ni lee `searchParams`.
- **No:** `/login?modo=registro`. Obliga a leer `searchParams` dentro de `<Suspense>` por `partialPrefetching`.
- **Sí:** todos los "volver" y la redirección de login/invitado apuntan a `/juegos`. Igual que la plantilla, donde todos navegan a la Biblioteca.
- **Sí:** `.reveal` con fallback: visible con `prefers-reduced-motion`, sin JS (`<noscript>`) y sin `IntersectionObserver`. El contenido nunca queda oculto.
- **No:** `.reveal` idéntico a la plantilla. Si el JS falla, las secciones quedan invisibles.
- **Sí:** portar solo el CSS que usa la landing (`HOME PAGE`, `ACTIVITY`, `PRICING`). No se agrega CSS sin uso.
- **No:** portar también el CSS de About. Son ~600 líneas sin uso hasta su spec.
- **Sí:** landing igual con o sin sesión. Permite que `app/page.tsx` sea un server component estático, sin riesgo de hidratación.
- **No:** ocultar `CREAR CUENTA` con sesión. Requiere `useUser` en un client component para un cambio menor.
- **Sí:** contenido de la landing en `lib/home.ts` tipado. Separa copy de marcado, igual que `lib/games.ts`.
- **Sí:** compactar el nav a ≤ 420px (gap 12px, padding del botón de sesión 14px). Corrige el desborde de 21px de la SPEC 01 sin quitar nada.
- **Sí:** `minmax(0, 1fr)` en las grillas de una columna de Actividad y Detalle. Es la corrección estándar del desborde por contenido mínimo y no cambia el diseño en anchos mayores.
- **Sí:** corregir en esta spec el desborde de Detalle y Salón (SPEC 01). Se detectó al verificar el criterio de scroll horizontal y se decidió no diferirlo.
- **No:** ocultar el botón de sesión en móvil. Con sesión iniciada es el único control para cerrar sesión; el link "Cuenta" del panel móvil solo lleva a `/login`.
- **Sí:** solo `RevealObserver` es client component; siluetas, íconos y `mini-card` son server components. Minimiza el JS enviado.

---

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Algún link a `/` queda sin actualizar y lleva al home en vez de la Biblioteca | El paso 2 lista los 7 enlaces; al cerrar, buscar `href="/"` y `push("/")` en `app/` y `components/` y confirmar que solo quedan el logo e `Inicio`. |
| Flash de contenido: `.reveal` oculto antes de que corra el observer | Las secciones `.reveal` están bajo el fold; el hero no usa `.reveal`. Aceptado. |
| Las 8 siluetas animadas y el `drop-shadow` afectan el rendimiento en móviles | Son decorativas; el bloque `prefers-reduced-motion` de `globals.css` ya detiene las animaciones. |
| Usuarios con `/` guardado como Biblioteca llegan a la landing | Aceptado: la landing enlaza a `/juegos` desde el hero. No se agrega redirección. |
| Insights de Partial Prefetching en `/juegos` o `/` | No se leen `params` ni `searchParams` en estas rutas; resolver cualquier insight en el paso 7. |

---

## Qué **no** entra en esta spec

- Página Acerca de / Contacto y su link en el nav.
- Datos reales en stats, ticker y top jugadores.
- Abrir la tab CREAR CUENTA desde los CTAs.
- Landing distinta con sesión iniciada.
- Redirección de `/` a `/juegos`.
- Tests automatizados.

Cada uno de esos puntos, si llega, va en su propia spec.
