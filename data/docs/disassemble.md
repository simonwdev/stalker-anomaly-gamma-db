# Disassemble Table Export

Produces two CSV files:

## 1. `export_disassemble_table.csv`

Lists what materials you get from disassembling each item. Sorted alphabetically by item name.

| # | Column | Description |
|---|--------|-------------|
| 1 | Section | Internal item ID |
| 2 | Name | Translated display name of the item being disassembled |
| 3 | Material 1 Name | First resulting material name |
| 4 | Material 1 Amount | Quantity (e.g. "x3") |
| 5 | Material 2 Name | Second material name |
| 6 | Material 2 Amount | Quantity |
| ... | ... | Continues in name/amount pairs (up to 10 material slots) |

## 2. `export_disassembles_materials.csv`

Reverse lookup — for each material, which items produce it. Sorted alphabetically by material name.

| # | Column | Description |
|---|--------|-------------|
| 1 | Section | Internal material ID |
| 2 | Name | Translated material name |
| 3 | Amount 1 | Quantity and "from" label (e.g. "3 from") |
| 4 | Source 1 | Name of the source item |
| ... | ... | Continues in amount/source pairs, sorted by count descending |

## Notes

- Disassembly data is read from `itms_manager.ini_parts` under the `nor_parts_list` key.
- Blacklisted sections: anything containing "ammo", `st_memory_stick_name`, `itm_guide_usb_1`, `itm_guide_usb_2`.
- Materials are sorted by quantity (highest first) within each disassembled item.
- Names in the CSV are quoted to handle commas in translated strings.
