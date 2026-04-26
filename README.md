# Stalker GAMMA Item Database

A web-based item database for [S.T.A.L.K.E.R. Anomaly](https://www.moddb.com/mods/stalker-anomaly) modpacks. Currently built around [G.A.M.M.A.](https://www.stalkergamma.com/), but the data pipeline works with any Anomaly modpack — just export your pack's data with [USADE](https://github.com/SaloEater/Universal-Stalker-Anomaly-Data-Export) by [SaloEater](https://github.com/SaloEater) and generate a new dataset.

Full English and Russian language support.

**Live site:** https://stalker-gamma-db.pages.dev/

## Features

- **Search & filtering** — fuzzy search across all items, filter by stats, ranges, and effects, sort by any column
- **Item comparison** — select multiple items and compare stats side-by-side
- **Tile & table views** — switch between card grid and spreadsheet layouts
- **Detailed item info** — NPC/stash drops, crafting recipes, disassembly data, ammo compatibility
- **Outfit exchange** — faction-based trading matrix
- **Crafting trees** — expandable recipe chains
- **Bookmarks & history** — favorite items and pick up where you left off
- **Shareable links** — deep-linkable categories, filters, and items

## Tech Stack

- **Frontend:** Vue.js (CDN, no build step)
- **Data pipeline:** Node.js scripts that transform CSV exports into JSON
- **Hosting:** Cloudflare Pages

## Data Pipeline

Item data is exported from the game files using [USADE](https://github.com/SaloEater/Universal-Stalker-Anomaly-Data-Export) (by [SaloEater](https://github.com/SaloEater)), producing CSV files that live in `data/<pack>/csv/`.

To regenerate the JSON output for a pack:

```bash
node scripts/generate-index.mjs --pack <pack-id>
```

Output is written to `site/public/data/<pack>/`.

## Development

```bash
npm install
npm run dev
```

This starts a local dev server on port 3000.

## Acknowledgements

- **[GSC Game World](https://www.gsc-game.com/)** — S.T.A.L.K.E.R. series
- **[S.T.A.L.K.E.R. Anomaly](https://www.moddb.com/mods/stalker-anomaly)** — standalone mod/engine
- **[G.A.M.M.A.](https://github.com/Grokitach/Stalker_GAMMA)** — modpack by Grok and the GAMMA community
- **[USADE](https://github.com/SaloEater/Universal-Stalker-Anomaly-Data-Export)** — data export tool by [SaloEater](https://github.com/SaloEater)

## Contributing

Contributions are welcome! Here's how to get involved:

- Check the [TODO.md](TODO.md) for open tasks
- Discuss ideas or ask questions in the [GAMMA Discord channel](https://discord.com/channels/912320241713958912/1484195028891861022)
- DM **@sw** for anything else
- Submit a pull request - all PRs require approval before merge
- Deployment to Cloudflare Pages is manual and handled by @sw

## License

[AGPL-3.0](LICENSE)

## Disclaimer

This is a community project and is not affiliated with, endorsed by, or connected to GSC Game World, the S.T.A.L.K.E.R. Anomaly team, or the G.A.M.M.A. team. All trademarks and registered trademarks are the property of their respective owners.
