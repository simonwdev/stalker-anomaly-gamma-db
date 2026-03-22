# Project: gamma-tools

## Git conventions
- Never use compound git commands (e.g. `cd X && git status`). Always run git commands directly from the repo root without chaining.

## Tech stack
- Frontend uses Vue.js via CDN (no build step)

## Data pipeline
- CSV source files live in `data/<pack>`
- Run `node scripts/generate-index.mjs --pack <pack-id>` to generate JSON output in `site/data/<pack>/`
- When a new or updated CSV is added, review it against its docs in `data/docs/` then run the script
- Some source CSVs (e.g. `ru_ru.csv`) are Windows-1251 encoded. Convert to UTF-8 with: `iconv -f WINDOWS-1251 -t UTF-8 input.csv > output.csv`

## Translations
- `site/data/<pack>/translations.json` is **generated output** — never edit it directly
- App UI strings (anything not from game CSVs) go in `data/app_translations.json` (en + ru)
- Supplementary item name overrides go in `data/supplementary_translations.json`
- New UI text must be added to `data/app_translations.json` with both `en` and `ru` keys, then regenerate

## Build codes
- `data/<pack>/dictionary.json` maps item IDs to stable integers for Sqids build codes — append-only, never regenerate from scratch
- The generation script auto-appends new items; existing indices must never change
