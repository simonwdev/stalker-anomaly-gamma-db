# Project: gamma-tools

## Git conventions
- Never use compound git commands (e.g. `cd X && git status`). Always run git commands directly from the repo root without chaining.

## Tech stack
- Frontend uses Vue.js via CDN (no build step)

## Data pipeline
- CSV source files live in `data/<pack>/csv/`
- Run `node scripts/generate-index.mjs --pack <pack-id>` to generate JSON output in `site/data/<pack>/`
- When a new or updated CSV is added, review it against its docs in `data/docs/` then run the script
- Some source CSVs (e.g. `ru_ru.csv`) are Windows-1251 encoded. Convert to UTF-8 with: `iconv -f WINDOWS-1251 -t UTF-8 input.csv > output.csv`
