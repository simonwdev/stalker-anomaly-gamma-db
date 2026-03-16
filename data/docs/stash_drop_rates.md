# Stash Drop Rates Export

Produces: `export_stash_drop_rates.csv`

Shows the effective drop chance for every item in each map's stash pool, broken out by stash type (common/rare).

## Columns

| # | Column | Description |
|---|--------|-------------|
| 1 | Section | Map section ID (internal level name) |
| 2 | Map Name | Translated map display name |
| 3 | Stash Type | "Common" or "Rare" |
| 4+ | Repeating groups | Triplets of: Item Name, Drop Chance (%), Allowed Ecos |

Each row represents one map + stash type combination. After the first three fixed columns, items are appended as repeating triplets sorted by effective chance descending.

## Effective Chance Calculation

For each item on a given map and stash type:

1. Look up the item's `kind` and `tier` (from `grok_items_tier.ltx`).
2. Find the matching entry in `kind_tier_effect_{common|rare}` — this gives a base `chance` and per-tier `chance_multi`.
3. Count how many of the map's tier slots match the item's tier: `tier_prob = tier_count / total_slots`.
4. `effective_pct = tier_prob * chance * chance_multi`.

Multi-use items (e.g. 2/3 uses remaining) have their tier adjusted: `tier = ceil(base_tier - lost_uses / 2)`, clamped to 1–5.

## Allowed Ecos

Each item may be blacklisted from certain eco levels (1, 2, 3). The "Allowed Ecos" field shows which eco levels can spawn the item (e.g. "1/2/3" or "1/3").

## Notes

- Map tier vectors come from `treasure_manager.map_tiers`.
- Kind/tier effect tables are read from `kind_tier_effect_common` and `kind_tier_effect_rare` sections in the treasure manager config.
- Drop chances below 1% are formatted to two decimal places; others are rounded.
- Items without a tier or kind are excluded.
