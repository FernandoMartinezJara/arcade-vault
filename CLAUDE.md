# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project

Arcade Vault is an online platform for playing games and competing for the highest score. The repo is currently a fresh `create-next-app` scaffold (only `app/layout.tsx` and `app/page.tsx` exist), so most of the product has yet to be built.

Development follows **Spec Driven Design** using the `/spec` and `/spec-impl` skills from [Klerith/fernando-skills](https://github.com/Klerith/fernando-skills) (install with `npx skills@latest add Klerith/fernando-skills`). Write or update a spec before implementing a feature, then implement against it.

No test runner is configured yet.

## Skills

Usa siempre /frontend-design para diseñar la interfaz de usuario.

## Stack and non-default configuration

- **Next.js 16.4 (App Router), React 19.3, TypeScript strict, Tailwind CSS v4.** Per AGENTS.md, check `node_modules/next/dist/docs/` before using any Next.js API; this version differs from older training data.
- `next.config.ts` enables flags that change how routes must be written:
  - `cacheComponents: true`: Cache Components model. Data caching is opt-in through `"use cache"`, and uncached or dynamic data must sit behind `<Suspense>`. See `docs/01-app/01-getting-started/08-caching.md`.
  - `partialPrefetching: true`: `<Link>` prefetches only a route's static App Shell. Reading URL data (`params`, `searchParams`) outside Suspense triggers dev-overlay insights. See `docs/01-app/02-guides/adopting-partial-prefetching.md`.
  - `experimental.agentFeedback: true`: makes `next dev` rewrite the managed block in `AGENTS.md`. Commit that file instead of reverting it.
- Tailwind v4 runs through a custom Turbopack CSS loader (`@tailwindcss/turbopack`) configured in `next.config.ts`; there is no PostCSS or `tailwind.config` file. Theme tokens live in `app/globals.css` under `@theme inline`.
- Layouts and pages use the global, generated `LayoutProps<"/">` / `PageProps` route types (no import needed).
- Import alias: `@/*` maps to the repo root.
