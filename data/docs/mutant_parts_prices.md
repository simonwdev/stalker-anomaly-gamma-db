# Mutant Parts Prices Export

Produces: `export_mutant_parts_prices.csv`

Lists sell prices for mutant parts and hides at two key traders.

## Columns

| # | Column | Description |
|---|--------|-------------|
| 1 | Section | Internal item ID |
| 2 | Name | Translated display name |
| 3 | Sakharov Price | Sell price at Professor Sakharov (Ecologist trader) |
| 4 | Butcher Price | Sell price at Butcher (Stalker trader) |

## Notes

- Prices are calculated using `utils_item.get_item_cost` with each trader's actual trade profile.
- The script finds two live NPCs on the current level and temporarily assigns them the Butcher and Sakharov trade configs.
- Items are sorted by type (mutant parts first, then hides), then alphabetically by name.
- `mutant_part_general_meat` is excluded.
- Sections matching `^hide` (excluding `absorbation`) are classified as type 2 (hides); sections containing `mutant_part` are type 1.
