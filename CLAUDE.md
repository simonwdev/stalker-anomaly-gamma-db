# Project: gamma-tools

## Workflow
- Use `npm run build` to verify changes — do NOT start `npm run dev` (the user runs it themselves)
- `npm run typecheck` runs `vue-tsc --noEmit` for type verification
- Never add `?v=N` cache-busting query params to asset URLs
- Only make code changes when explicitly asked; discussion is not an instruction

## Git conventions
- Never use compound git commands (e.g. `cd X && git status`). Always run git commands directly from the repo root without chaining.

## Tech stack
- Vite + Vue 3 SFCs, **Options API only** (do not introduce Composition API in new components)
- `npm run dev` — Vite dev server with HMR
- `npm run build` — production build to `dist/`
- `npm run release` — build + copy Cloudflare Functions to dist
- Deploy: Cloudflare Pages via `npm run deploy`

## Project structure
Vite root is `site/`. Notable non-obvious paths:
- `site/src/App.vue` — root component; holds shared state and the `provide()` block
- `site/js/app.js` — legacy monolith (data, methods, computed, watchers) being incrementally decomposed into SFCs
- `site/src/icons.js` — tree-shaken lucide-vue-next registry (add new icons here)
- `site/src/globals.js` — temporary CDN-to-npm bridge for Fuse, FloatingUI, Chart
- `functions/` — Cloudflare Pages Functions (API)
- `workers/presence/` — separate Cloudflare Worker (online counter)
- `data/<pack>/` — CSV source files (input to data pipeline)
- `site/public/data/<pack>/` — generated JSON (output of data pipeline)

## Components
- Child components receive data via **props** and communicate back via **emits**
- Shared helpers (`t`, `formatValue`, `headerLabel`, etc.) come via Vue's **provide/inject**; new entries go in `App.vue`'s `provide()` block
- Icons use `<LucideIconName :size="N" />` — do NOT use `data-lucide` attributes or `lucide.createIcons()`

## Data pipeline
- Run `node scripts/generate-index.mjs --pack <pack-id>` to regenerate JSON under `site/public/data/<pack>/`
- When a new or updated CSV is added, review it against its docs in `data/docs/` then run the script
- Source translation CSVs are Windows-1251 encoded; the generation script decodes them automatically

## Translations
- `site/public/data/<pack>/translations.json` is **generated output** — never edit it directly
- App UI strings (anything not from game CSVs) go in `data/app_translations.json` (en + ru both required), then regenerate
- Supplementary item name overrides go in `data/supplementary_translations.json`

## Build share codes
- Build codes are share-link IDs backed by Cloudflare KV (`BUILDS` namespace), not local encoding
- API: `functions/api/build/[[catchall]].js` — validates a build JSON, canonicalizes (sorted keys), deflates, and stores under a SHA-256 content hash
- Local dev for the API: `npm run dev:api` (wrangler pages dev with the `BUILDS` KV binding)
