# Melee Weapons Export

Produces: `export_weapons_melee.csv`

## Columns

| # | Column | Description |
|---|--------|-------------|
| 1 | Section | Internal item ID |
| 2 | Name | Translated display name |
| 3 | Weight | Inventory weight (kg) |
| 4 | Cost | Base purchase price |
| 5 | Light Attack Power | Light attack damage (normalized to %) |
| 6 | Heavy Attack Power | Heavy attack damage (normalized to %) |
| 7 | BR | Ballistic resistance penetration value (`k_ap * 10 * 100 * difficulty_multiplier`) |
| 8 | Max Range | Effective melee range |
| 9 | Cuts Thick Skin | Can cut thick mutant skin ("Y"/"N") |
| 10 | Pelts Quality Min | Minimum pelt quality (%) |
| 11 | Pelts Quality Max | Maximum pelt quality (%) |

## Notes

- "Cuts Thick Skin" is "N" only for basic knives (`wpn_knife`, `wpn_knife2`); all non-knife melee weapons and upgraded knives return "Y".
- Pelt quality data comes from `zz_item_artefact.knifesm` — items not in that table have empty values.
- Attack power uses difficulty-aware `hit_power` / `hit_power_2` parsing with per-difficulty indexing.
- Items with "animation" in the section name are excluded.
