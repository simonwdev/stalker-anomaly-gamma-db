# Item Drop Locations Export

Produces: `item_drop_locations.csv`

Reverse lookup of stash drop rates — for each item, shows which maps it can appear in and the effective drop chance per map.

## Columns

| # | Column | Description |
|---|--------|-------------|
| 1 | Section | Internal item ID |
| 2 | Name | Translated display name |
| 3 | Stash Type | "Common" or "Rare" |
| 4+ | Repeating groups | Triplets of: Map Name, Drop Chance (%), Allowed Ecos |

Each item produces up to two rows (one per stash type). After the first three fixed columns, maps are appended as repeating triplets sorted by effective chance descending.

## Effective Chance Calculation

Same formula as [stash_drop_rates.md](stash_drop_rates.md) — `effective_pct = tier_prob * chance * chance_multi`.

## Notes

- Items without a tier or kind are excluded.
- Only rows with at least one map having a non-zero drop chance are written.
- Rows are sorted by item section ID.
- Drop chances below 1% are formatted to two decimal places; others are rounded.
