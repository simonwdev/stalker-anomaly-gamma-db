# Outfit Exchange Table Export

Produces: `export_outfit_exchange.csv`

Shows which outfits can be exchanged and what reward outfit each faction gives in return.

## Columns

| # | Column | Description |
|---|--------|-------------|
| 1 | Source Faction | Faction that the source outfit belongs to |
| 2 | Source Name | Translated name of the outfit being traded in |
| 3 | (empty separator) | — |
| 4+ | Faction columns | One column per faction, containing the reward outfit name for that faction (empty if no exchange available) |

## Notes

- Faction columns are dynamically generated from `game_relations.factions_table`, sorted alphabetically.
- Exchange data comes from the `grok_armor_convert` table.
- Rows with `all_` prefix in the variable name are excluded.
- Sorted by source faction, then by source outfit name.
