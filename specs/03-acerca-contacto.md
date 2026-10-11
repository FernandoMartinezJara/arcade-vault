# SPEC 03 — Página Acerca de y contacto por correo

> **Estado:** Implementado
> **Depende de:** SPEC 02
> **Fecha:** 2026-10-11
> **Objetivo:** Implementar `/acerca` fiel a `references/home-about/about.jsx`, con un formulario de contacto que envía el mensaje al equipo por correo usando Resend.

---

## Por qué existe esta spec

La SPEC 02 dejó fuera `about.jsx`, el link "Acerca de" del nav y el CSS `about-*`, `contact-*`, `term-*` y `highlight-*`.
La plantilla simula el envío: valida campos vacíos y muestra la terminal de éxito sin mandar nada.
Esta spec porta la pantalla tal cual y reemplaza la simulación por un envío real con Resend desde una Server Action.
La plantilla solo define el caso feliz, así que esta spec agrega los estados de envío pendiente y de error.

Las fuentes de verdad visuales son `references/home-about/about.jsx`, `references/home-about/nav.jsx` y el bloque `ABOUT PAGE` de `references/home-about/styles.css`.

---

## Alcance

**Dentro:**

- **Página `/acerca`**, fiel a `about.jsx`:
  - Hero: kicker `▸ ACERCA DE`, título `ACERCA DE ARCADE VAULT`, párrafo de misión y 3 `highlight` con íconos pixel (HEART magenta, BROWSER cyan, PLANT green).
  - Divisor `about-divider` con 24 píxeles parpadeantes (`aria-hidden`), con `.reveal`.
  - Sección contacto (`.reveal`): kicker `▸ CONTACTO`, título `CONTÁCTANOS`, subtítulo y 3 tips (`RESPUESTA EN 24-48H`, `SUGERENCIAS BIENVENIDAS`, `SIN SPAM, JAMÁS`).
  - Formulario con `NOMBRE` (placeholder `px_kai`), `CORREO ELECTRÓNICO` (placeholder `jugador@vault.gg`), `MENSAJE` (placeholder `Cuéntanos qué tienes en mente…`, 5 filas) y botón `▶  ENVIAR MENSAJE`.
  - Terminal de éxito `VAULT-OS // TERMINAL` con las 4 líneas de la plantilla, `GRACIAS, {NOMBRE}.` en mayúsculas y botón `ENVIAR OTRO MENSAJE` que vacía el formulario.
- **Envío real con Resend** desde una Server Action en `app/acerca/actions.ts`:
  - Un correo HTML simple inline (con fallback de texto plano) a `CONTACT_TO_EMAIL`, desde `CONTACT_FROM_EMAIL`, con `replyTo` = correo del usuario.
  - Todo el contenido del usuario se escapa antes de insertarlo en el HTML.
- **Validación**:
  - Cliente: algún campo vacío (tras `trim`) → shake del formulario y no se envía, como la plantilla.
  - Servidor: `trim`, requeridos, formato de correo y longitudes máximas (nombre ≤ 60, correo ≤ 254, mensaje ≤ 2000).
- **Estado pendiente**: el botón cambia a `▶  TRANSMITIENDO…` y se deshabilita junto a los campos.
- **Estado de error**: el formulario conserva lo escrito, hace shake y muestra una línea roja sobre el botón.
- **Honeypot anti-spam**: campo oculto `website`; si llega con valor, la acción responde éxito sin enviar.
- **Nav**: link `Acerca de` (→ `/acerca`) después de `Salón de la Fama`, en desktop y en el panel móvil, activo en `/acerca`.
- **CSS**: portar a `app/globals.css` el bloque `ABOUT PAGE` de `references/home-about/styles.css`, más las reglas nuevas de error y honeypot.
- **Configuración**: dependencia `resend` y `.env.example` documentando las 3 variables de entorno.

**Fuera de alcance (para futuras specs):**

- Correo de confirmación al usuario que escribe.
- Rate limiting, captcha o cualquier anti-spam distinto del honeypot.
- Plantilla de correo con React Email o estilos arcade elaborados.
- Guardar los mensajes en base de datos o en `localStorage`.
- Precargar el nombre desde la sesión mock (`av_user`).
- Verificación del dominio remitente en Resend (es configuración de la cuenta, no código).
- CSS de Gamepad, "tweaks" y variantes de tema (`gp-*`, `tw-*`).
- Tests automatizados.
- Rediseño visual: la estética es la de la referencia.

---

## Modelo de datos

No hay persistencia nueva ni cambios en `lib/games.ts`, `lib/session.ts` ni `lib/home.ts`.

### `lib/contact.ts` — tipos, límites y validación del contacto

Módulo puro, sin dependencias de servidor; lo usan la Server Action y el formulario.

```ts
export const CONTACT_LIMITS = { name: 60, email: 254, msg: 2000 } as const;

export interface ContactInput {
  name: string;   // tras trim
  email: string;  // tras trim
  msg: string;    // tras trim
}

export type ContactError = "invalid" | "send";

export type ContactState =
  | { status: "idle" }
  | { status: "success"; name: string }       // nombre saneado para la terminal
  | { status: "error"; error: ContactError };

export const CONTACT_ERROR_MESSAGES: Record<ContactError, string> = {
  invalid: "[ERR] DATOS INVÁLIDOS. REVISA NOMBRE, CORREO Y MENSAJE.",
  send: "[ERR] NO SE PUDO TRANSMITIR. INTÉNTALO DE NUEVO.",
};

// Devuelve el input saneado o null si no cumple requeridos, formato o límites.
export function parseContact(formData: FormData): ContactInput | null;
```

- Nombres de campo del `<form>`: `name`, `email`, `msg` y honeypot `website`.
- Formato de correo: `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`.
- Estado inicial de `useActionState`: `{ status: "idle" }`.

### `lib/contact-email.ts` — construcción del correo

```ts
export function escapeHtml(s: string): string; // & < > " '
export function buildContactEmail(input: ContactInput): {
  subject: string; // "[Arcade Vault] Mensaje de {name}"
  html: string;    // tabla inline: nombre, correo, mensaje (saltos de línea → <br>)
  text: string;    // mismo contenido en texto plano
};
```

### Variables de entorno (`.env.local`, solo servidor)

```bash
RESEND_API_KEY=re_xxxxxxxx
CONTACT_TO_EMAIL=equipo@ejemplo.com
CONTACT_FROM_EMAIL="Arcade Vault <onboarding@resend.dev>"
```

Ninguna lleva el prefijo `NEXT_PUBLIC_`, así que nunca llegan al bundle del cliente.
Con `onboarding@resend.dev` como remitente, Resend solo entrega al correo dueño de la cuenta; es suficiente para desarrollo.

---

## Plan de implementación

Cada paso deja la app corriendo con `npm run dev` y es commiteable por separado.
Antes de usar una API de Next.js, revisar `node_modules/next/dist/docs/` (ver `AGENTS.md`), en especial `01-app/02-guides/forms.md`, `01-app/02-guides/server-actions.md` y `01-app/02-guides/environment-variables.md`.
Antes de construir UI, invocar `/frontend-design` (ver `CLAUDE.md`), respetando la estética de la referencia.

1. **CSS de Acerca de.** Copiar a `app/globals.css` el bloque `ABOUT PAGE` de `references/home-about/styles.css` (desde `.about` hasta `.term-body .caret`, incluye `.btn.press`, `@keyframes shake` y `@keyframes pxblink`), sin tocar reglas existentes. Agregar:
   - `.contact-error`: texto `var(--mono)` 11px en rojo neón, `margin-bottom: 12px`.
   - `.contact-hp`: oculto fuera de pantalla (`position: absolute; left: -9999px`), no con `display: none`.
   - Estilo `:disabled` para `.field input` y `.contact-form textarea` (opacidad reducida).
   - Bajo `prefers-reduced-motion: reduce`: sin animación en `.div-pixels span` ni en `.contact-form.shake`.
   Manual: `npm run dev` compila sin errores.
2. **Nav.** En `components/nav.tsx`: agregar la sección `"acerca"` (activa con `pathname.startsWith("/acerca")`) y el link `Acerca de` después de `Salón de la Fama`, en `.links` y en el panel móvil. Medir el nav a 841px: si desborda, subir el breakpoint `max-width: 840px` del nav en `app/globals.css` al ancho mínimo sin desborde. Manual: el link aparece en ambos lugares (todavía lleva al 404).
3. **Página estática.** Crear `components/highlight-icon.tsx` (server, íconos HEART/BROWSER/PLANT con `aria-hidden`) y `app/acerca/page.tsx` (server) con hero, highlights, divisor e intro de contacto, `<RevealObserver />` y el mismo `<noscript><style>` de la landing. En el lugar del formulario, dejar un `<form className="contact-form">` sin acción con los 3 campos y el botón. Manual: `/acerca` coincide visualmente con la plantilla.
4. **Lógica pura.** Crear `lib/contact.ts` y `lib/contact-email.ts` según el modelo de datos. Verificar con `npx tsc --noEmit`.
5. **Server Action.** `npm install resend`. Crear `.env.example` con las 3 variables y agregar `!.env.example` a `.gitignore`. Crear `app/acerca/actions.ts` con `"use server"` y `sendContact(prev: ContactState, formData: FormData): Promise<ContactState>`:
   - Honeypot `website` con valor → `{ status: "success", name }` sin llamar a Resend.
   - `parseContact` devuelve `null` → `{ status: "error", error: "invalid" }`.
   - Falta alguna variable de entorno → `console.error` sin datos del usuario y `{ status: "error", error: "send" }`.
   - `resend.emails.send(...)` devuelve `error` o lanza → `console.error` y `{ status: "error", error: "send" }`.
   - Envío correcto → `{ status: "success", name: input.name }`.
   Manual: `npx tsc --noEmit` sin errores.
6. **Formulario cliente.** Crear `components/contact-form.tsx` (`"use client"`) y reemplazar con él el formulario estático de `app/acerca/page.tsx`:
   - `useActionState(sendContact, { status: "idle" })`.
   - Inputs controlados con `useState`, como la plantilla, para conservar lo escrito tras un error.
   - `onSubmit`: si algún campo está vacío tras `trim`, `preventDefault()` y shake de 400 ms.
   - `maxLength` en cada campo según `CONTACT_LIMITS`.
   - `pending` → campos y botón deshabilitados, botón `▶  TRANSMITIENDO…`.
   - `status: "error"` → shake y `<p className="contact-error" role="alert">` con el mensaje de `CONTACT_ERROR_MESSAGES`.
   - `status: "success"` → terminal de éxito; `ENVIAR OTRO MENSAJE` vacía los campos y vuelve al formulario.
   - Honeypot dentro de `<div className="contact-hp" aria-hidden="true">` con `tabIndex={-1}` y `autoComplete="off"`.
   Manual: con `.env.local` configurado, enviar el formulario entrega el correo y muestra la terminal.
7. **Cierre técnico.** Ejecutar `npm run lint`, `npx tsc --noEmit` y `npm run build`. Corregir errores e insights de Cache Components / Partial Prefetching. Recorrer `/acerca` en 360px, 375px, 841px y desktop sin errores de hidratación ni scroll horizontal.

---

## Criterios de aceptación

- [x] `npm run build`, `npm run lint` y `npx tsc --noEmit` terminan sin errores.
- [x] `npm run dev` no muestra errores en consola ni de hidratación al recorrer `/acerca`.
- [x] `/acerca` muestra el hero `ACERCA DE ARCADE VAULT`, la misión, 3 highlights con íconos, el divisor de píxeles y la sección `CONTÁCTANOS` con 3 tips y el formulario.
- [x] El nav muestra `Acerca de` después de `Salón de la Fama`, en desktop y en el panel móvil, y navega a `/acerca`.
- [x] `Acerca de` está activo solo en `/acerca`; los demás links mantienen su comportamiento de la SPEC 02.
- [x] Enviar con algún campo vacío (o solo espacios) hace shake y no ejecuta la Server Action.
- [x] Durante el envío, el botón dice `▶  TRANSMITIENDO…` y los campos y el botón están deshabilitados.
- [x] Con las 3 variables configuradas, un envío válido entrega un correo HTML a `CONTACT_TO_EMAIL` con nombre, correo y mensaje, y responder ese correo apunta al correo del usuario.
- [x] Tras un envío exitoso aparece la terminal con `GRACIAS, {NOMBRE}.` en mayúsculas.
- [x] `ENVIAR OTRO MENSAJE` vuelve al formulario con los tres campos vacíos.
- [x] Un mensaje con `<script>alert(1)</script>` llega como texto visible en el correo, no como HTML.
- [x] Un correo con formato inválido (p. ej. `jugador@vault`, quitando `type="email"` en DevTools) muestra `[ERR] DATOS INVÁLIDOS. REVISA NOMBRE, CORREO Y MENSAJE.` y no envía correo.
- [x] Sin `RESEND_API_KEY`, el envío muestra `[ERR] NO SE PUDO TRANSMITIR. INTÉNTALO DE NUEVO.`, el formulario conserva lo escrito y el servidor registra el error.
- [x] Con el honeypot `website` lleno (vía DevTools), se muestra la terminal de éxito y no se envía correo.
- [x] Ninguna variable de entorno aparece en el JS enviado al navegador (buscar `RESEND_API_KEY` y el valor de la key en `.next/static`).
- [x] `.env.example` está versionado y `.env.local` no.
- [x] Las secciones `.reveal` aparecen con fade al hacer scroll; con "reducir movimiento" se ven de inmediato y los píxeles del divisor no parpadean.
- [x] Con JavaScript deshabilitado, todas las secciones de `/acerca` son visibles.
- [x] A 360px, 375px y 841px, `/acerca` y el nav no tienen scroll horizontal.
- [x] La apariencia de `/acerca` coincide con la pantalla Acerca de de `references/home-about/arcade-vault-standalone.html` abierta en el navegador.

---

## Decisiones

- **Sí:** ruta `/acerca`. Corta y en español, igual que `/juegos` y `/salon`.
- **No:** `/acerca-de` ni `/about`. Más larga o en inglés, rompe la convención.
- **Sí:** Server Action con `useActionState`. Sin endpoint público, sin `fetch` manual, y la API key no sale del servidor.
- **No:** Route Handler `app/api/contacto/route.ts`. Más código y expone un endpoint HTTP que nadie más usa.
- **Sí:** destinatario, remitente y API key en variables de entorno. Cambian entre dev y producción sin tocar código.
- **No:** destinatario y remitente hardcodeados. Obliga a un commit para cambiar de cuenta o dominio.
- **Sí:** correo HTML simple inline con fallback de texto plano. Legible en cualquier cliente sin dependencias extra.
- **No:** React Email. Suma dependencias para un único correo interno.
- **Sí:** escapar todo el contenido del usuario en el HTML. Evita inyección de HTML en el correo del equipo.
- **Sí:** validación manual en cliente (vacíos) y servidor (requeridos, formato, límites). El servidor es la fuente de verdad; el cliente solo replica el shake de la plantilla.
- **No:** zod. Una dependencia para tres campos.
- **Sí:** honeypot que responde éxito sin enviar. Frena bots simples sin dar pistas y sin dependencias.
- **No:** rate limit en memoria. No funciona con varias instancias serverless; si hace falta, va en otra spec.
- **No:** correo de confirmación al usuario. Convierte el formulario en un emisor de correos a terceros y exige dominio verificado.
- **Sí:** error dentro del formulario conservando lo escrito. El usuario reintenta sin reescribir el mensaje.
- **No:** terminal de error. Agrega una pantalla que la plantilla no tiene.
- **Sí:** un único mensaje genérico para fallos de envío y de configuración. No revela detalles del servidor al usuario.
- **Sí:** estado pendiente con botón y campos deshabilitados. Evita dobles envíos.
- **No:** terminal animada durante el envío. Mezcla el estado pendiente con el de éxito.
- **Sí:** inputs controlados con `useState`. React 19 resetea los inputs no controlados de un `<form action>`, y se perdería lo escrito al fallar.
- **No:** precargar el nombre desde `av_user`. Fidelidad con la plantilla y sin acoplar la página a la sesión mock.
- **Sí:** `Acerca de` en el nav de desktop y del panel móvil. Igual que `nav.jsx`.
- **Sí:** solo `ContactForm` y `RevealObserver` son client components. Hero, highlights y divisor se renderizan en el servidor.
- **Sí:** `.env.example` versionado con `!.env.example` en `.gitignore`. Documenta las variables sin exponer secretos.
- **Sí:** portar el bloque `ABOUT PAGE` completo. Toda la pantalla lo usa.

---

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Con `onboarding@resend.dev`, Resend rechaza destinatarios distintos al dueño de la cuenta | Usar ese correo como `CONTACT_TO_EMAIL` en dev. En producción se verifica un dominio propio y se cambia `CONTACT_FROM_EMAIL`. |
| El cuarto link desborda el nav entre 841px y ~1000px | El paso 2 mide a 841px y sube el breakpoint del nav si hace falta. |
| Bots que ignoran el honeypot llenan el buzón | Aceptado para esta versión; rate limit o captcha van en otra spec. |
| La firma de `resend.emails.send` (`replyTo` vs `reply_to`) difiere según la versión del SDK | Revisar los tipos de `node_modules/resend` al implementar el paso 5. |
| La API key se filtra al cliente | Solo se lee en `app/acerca/actions.ts` y sin prefijo `NEXT_PUBLIC_`; un criterio de aceptación lo verifica en `.next/static`. |
| Insights de Cache Components por la Server Action o el formulario | `/acerca` no lee `params`, `searchParams` ni datos dinámicos; resolver cualquier insight en el paso 7. |

---

## Qué **no** entra en esta spec

- Correo de confirmación al usuario.
- Rate limiting o captcha.
- Plantilla de correo con React Email.
- Guardar los mensajes recibidos.
- Precargar el nombre desde la sesión.
- Tests automatizados.

Cada uno de esos puntos, si llega, va en su propia spec.
