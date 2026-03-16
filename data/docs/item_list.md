# Complete Item List Export

Produces: `export_items_list.csv`

A comprehensive list of every item in the game with basic info.

## Columns

| # | Column | Description |
|---|--------|-------------|
| 1 | Section | Internal item ID |
| 2 | Name | Translated display name |
| 3 | Kind | Item kind/category (e.g. `w_pistol`, `i_food`, `i_arty`) |
| 4 | Cost | Base purchase price |
| 5 | Can Be Looted | Whether NPCs can carry/loot this item ("Y"/"N") |

## Notes

- Includes every item that has a non-empty `kind` field in the system INI.
- Lootability is determined by checking if the item appears in any section of `items\trade\gulag_job_trade_buy_sell.ltx`.
- Multiplayer items (section starting with `mp_`) are excluded.
