# SPEC 04 — Integración base de Supabase

> **Estado:** Aprobado
> **Depende de:** —
> **Fecha:** 2026-10-11
> **Objetivo:** Dejar Supabase conectado a la app de Next.js con clientes de servidor y navegador, variables de entorno documentadas y un script que verifica la conexión, sin tablas ni cambios funcionales.

---

## Por qué existe esta spec

Hoy la sesión (`av_user`) y los puntajes (`av_scores`) son mock en `localStorage`, y el catálogo vive en `lib/games.ts`.
El proyecto de Supabase ya existe y está conectado por MCP (`.mcp.json`), pero el esquema `public` no tiene tablas.
Las próximas specs (Auth y puntajes) necesitan una base común: dependencias, clientes y variables de entorno.
Esta spec deja solo esa base. Ninguna pantalla cambia de comportamiento.

---

## Alcance

**Dentro:**

- **Dependencias:** `@supabase/supabase-js`, `@supabase/ssr` y `server-only`.
- **Cliente de servidor** en `lib/supabase/server.ts`:
  - `createServerClient` de `@supabase/ssr` con el adaptador de cookies de `next/headers`.
  - `import "server-only"` en la primera línea.
- **Cliente de navegador** en `lib/supabase/client.ts` con `createBrowserClient` de `@supabase/ssr`.
- **Variables de entorno:** `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
  - Documentadas con placeholders en `.env.example`.
  - Valores reales en `.env.local` (no versionado), obtenidos con las herramientas `get_project_url` y `get_publishable_keys` del MCP de Supabase.
- **Script de verificación** `npm run supabase:check`, que consulta Auth del proyecto con las variables de entorno e imprime OK o el error.

**Fuera de alcance (para futuras specs):**

- Supabase Auth y reemplazo de la sesión mock `av_user`.
- `proxy.ts` para refrescar la sesión en cada request (va con la spec de Auth).
- Tablas, RLS y migraciones (`supabase/migrations`).
- Guardar puntajes en Supabase y la Server Action que los inserta.
- Migrar el catálogo de `lib/games.ts` a una tabla `games`.
- Tipos generados de la base de datos (`database.types.ts`).
- Cliente admin con secret key (service role).
- Supabase CLI y stack local.
- Limpiar los valores reales de Resend en `.env.example` y rotar esa key (se tratan aparte).
- Route Handler de salud expuesto en producción.
- Tests automatizados.

---

## Modelo de datos

Esta spec no introduce tablas ni estructuras persistentes.
No cambian `lib/games.ts`, `lib/session.ts`, `lib/home.ts` ni `lib/contact.ts`.

### Variables de entorno

Se agregan al final de `.env.example`, debajo de las de Resend, sin modificar estas últimas:

```bash
# Supabase (Project Settings → API). Public by design: protected by RLS, not by secrecy.
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxxxxxxx
```

- El prefijo `NEXT_PUBLIC_` es intencional: el cliente de navegador las necesita.
- La publishable key no es un secreto. La seguridad de los datos dependerá de RLS en las specs futuras.
- No se agrega ninguna secret key ni service role key.

### `lib/supabase/server.ts`

```ts
import "server-only";

// Nuevo cliente por request. Lee y escribe cookies vía next/headers.
export async function createClient(): Promise<SupabaseClient>;
```

- Usa `await cookies()` (asíncrono en esta versión de Next.js).
- `setAll` va dentro de `try/catch`: en un Server Component no se pueden escribir cookies, y el error se ignora como indica la guía de `@supabase/ssr`.

### `lib/supabase/client.ts`

```ts
// Cliente para client components ("use client").
export function createClient(): SupabaseClient;
```

### `scripts/supabase-check.mjs`

- Se ejecuta con `node --env-file=.env.local scripts/supabase-check.mjs`, expuesto como `npm run supabase:check`.
- Si falta alguna de las 2 variables, imprime cuál falta y termina con código 1.
- Hace `GET {NEXT_PUBLIC_SUPABASE_URL}/auth/v1/settings` con el header `apikey: {NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY}`.
- Respuesta 2xx: imprime `✓ Supabase OK — {host}` y termina con código 0.
- Cualquier otra respuesta o error de red: imprime `✗ Supabase` con el status o el mensaje, y termina con código 1.
- Nunca imprime el valor de la key.

---

## Plan de implementación

Cada paso deja la app corriendo con `npm run dev` y es commiteable por separado.
Antes de usar una API de Next.js, revisar `node_modules/next/dist/docs/` (ver `AGENTS.md`), en especial `01-app/02-guides/environment-variables.md` y la referencia de `cookies`.

1. **Dependencias.** `npm install @supabase/supabase-js @supabase/ssr server-only`. Manual: `npm run dev` arranca sin errores.
2. **Variables de entorno.** Agregar el bloque de Supabase al final de `.env.example`. Leer la URL con `get_project_url` y la publishable key con `get_publishable_keys` del MCP de Supabase, y agregarlas a `.env.local`. Manual: `git status` muestra `.env.example` modificado y no muestra `.env.local`.
3. **Script de verificación.** Crear `scripts/supabase-check.mjs` según el modelo de datos y agregar `"supabase:check": "node --env-file=.env.local scripts/supabase-check.mjs"` a `package.json`. Manual: `npm run supabase:check` imprime `✓ Supabase OK`.
4. **Cliente de navegador.** Crear `lib/supabase/client.ts`. Verificar con `npx tsc --noEmit`.
5. **Cliente de servidor.** Crear `lib/supabase/server.ts`. Verificar con `npx tsc --noEmit`.
6. **Cierre técnico.** Ejecutar `npm run lint`, `npx tsc --noEmit` y `npm run build`. Recorrer `/`, `/juegos`, `/salon`, `/login` y `/acerca` con `npm run dev` y confirmar que se comportan igual que antes.

---

## Criterios de aceptación

- [ ] `package.json` lista `@supabase/supabase-js`, `@supabase/ssr` y `server-only` en `dependencies`.
- [ ] `npm run build`, `npm run lint` y `npx tsc --noEmit` terminan sin errores.
- [ ] `.env.example` contiene `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` con placeholders, y sus líneas de Resend no cambiaron.
- [ ] `.env.local` contiene la URL y la publishable key reales del proyecto, y `git status` no lo muestra.
- [ ] `npm run supabase:check` imprime `✓ Supabase OK — {host}` y termina con código 0.
- [ ] Con una publishable key alterada en `.env.local`, `npm run supabase:check` imprime `✗ Supabase` y termina con código 1.
- [ ] Sin `NEXT_PUBLIC_SUPABASE_URL`, `npm run supabase:check` indica la variable faltante y termina con código 1.
- [ ] La salida de `npm run supabase:check` nunca contiene el valor de la key.
- [ ] `lib/supabase/server.ts` empieza con `import "server-only"` y exporta `createClient` asíncrono.
- [ ] `lib/supabase/client.ts` exporta `createClient` y usa `createBrowserClient`.
- [ ] Importar `lib/supabase/server.ts` desde un archivo `"use client"` hace fallar `npm run build` (probarlo temporalmente y revertir).
- [ ] No existen `proxy.ts`, `middleware.ts`, `supabase/migrations/` ni tablas nuevas en el esquema `public`.
- [ ] `/`, `/juegos`, `/salon`, `/login` y `/acerca` se comportan igual que antes de esta spec, sin errores nuevos en consola.

---

## Decisiones

- **Sí:** solo infraestructura. Separa la conexión de Auth y puntajes, que tienen decisiones propias (RLS, migración de la sesión mock).
- **No:** conexión + puntajes en la misma spec. Mezcla la base con la primera feature y agranda la spec.
- **Sí:** `@supabase/ssr` con clientes de servidor y navegador. Es la base que usarán Auth (cookies) y los client components.
- **No:** cliente admin con secret key. Nadie lo usa todavía y es una superficie de riesgo sin beneficio.
- **Sí:** `server-only` en el cliente de servidor. Un import indebido falla en build y no en runtime.
- **No:** `proxy.ts` ahora. Sin Auth no hay sesión que refrescar y sumaría trabajo a cada request.
- **Sí:** publishable key (`sb_publishable_…`) con `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Es el formato actual de Supabase.
- **No:** anon key legacy (JWT). Formato antiguo.
- **Sí:** script `npm run supabase:check` con `node --env-file`. Verifica la conexión sin tablas, sin dependencias extra y sin tocar la app.
- **No:** Route Handler de salud. Quedaría expuesto en producción.
- **No:** verificar solo con build y tipos. No detecta una URL o key incorrecta.
- **Sí:** script en `.mjs`. Corre con Node directo, sin `tsx` ni compilación.
- **Sí:** valores reales leídos del MCP de Supabase durante la implementación. Evita copiarlos a mano desde el dashboard.
- **No:** tocar las variables de Resend en `.env.example` en esta spec. Se tratan aparte.
- **No:** migraciones ni tipos generados. Sin tablas no hay nada que versionar ni tipar.

---

## Riesgos

| Riesgo                                                                            | Mitigación                                                                                                                    |
| --------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `/auth/v1/settings` responde 2xx aunque la key sea inválida                       | El criterio de la key alterada lo detecta. Si pasa, cambiar a un endpoint que valide el `apikey` y documentarlo en el script. |
| La API de cookies de `@supabase/ssr` (`getAll`/`setAll`) difiere según la versión | Revisar los tipos en `node_modules/@supabase/ssr` al implementar el paso 5.                                                   |
| `cookies()` dentro de `"use cache"` rompe con Cache Components                    | Esta spec no usa el cliente en ninguna ruta. Las specs futuras lo llaman fuera de `"use cache"` y detrás de `<Suspense>`.     |
| `node --env-file` no está disponible en la versión local de Node                  | Requiere Node ≥ 20.6. Verificar con `node -v` en el paso 3.                                                                   |
| Confundir la publishable key con un secreto, o al revés, filtrar una secret key   | Solo se agrega la publishable key. El comentario de `.env.example` explica que es pública y que la protección es RLS.         |

---

## Qué **no** entra en esta spec

- Supabase Auth y `proxy.ts`.
- Tablas, RLS, migraciones y tipos generados.
- Puntajes y catálogo en Supabase.
- Cliente admin con secret key.
- Limpieza de las variables de Resend en `.env.example`.
- Tests automatizados.

Cada uno de esos puntos, si llega, va en su propia spec.
