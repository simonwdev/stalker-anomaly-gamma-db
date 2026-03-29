# Map Images

This directory contains source map textures used by the tile generation scripts. These files are **not included in the repository** due to their size.

## Required files

Place the following DDS files in this directory before running `scripts/generate-map-tiles.mjs`:

- `ui_global_map.dds` — Global PDA map (from High Resolution PDA Maps mod)
- Per-level detail maps (e.g. `map_agroprom.dds`, `map_escape.dds`, etc.)

See `LEVEL_TEXTURE_MAP` and `MERGED_REGIONS` in `scripts/generate-map-tiles.mjs` for the full list of expected filenames.

## Upscaled variants

Run `scripts/upscale-map-dds.mjs` to generate AI-upscaled (Real-ESRGAN 4x) PNG versions of selected DDS files. The tile generator prefers `.png` over `.dds` when both exist for the same name.

## Source

The DDS textures originate from the [High Resolution PDA Maps](https://www.moddb.com/mods/stalker-anomaly/addons/high-resolution-pda-maps) mod for S.T.A.L.K.E.R. Anomaly.
