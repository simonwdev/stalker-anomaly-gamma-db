# Explosives Export

Produces: `export_explosives.csv`

Covers grenades, rockets, mines, and other explosive items.

## Columns

| # | Column | Description |
|---|--------|-------------|
| 1 | Section | Internal item ID |
| 2 | Name | Translated display name |
| 3 | Weight | Inventory weight (kg) |
| 4 | Cost | Base purchase price |
| 5 | Blast Power | Explosion damage value |
| 6 | Blast Radius | Explosion radius |
| 7 | Fragments | Number of fragments/shrapnel |
| 8 | Fragment Damage | Damage per fragment |
| 9 | Detonation Time | Fuse/detonation delay (seconds) |

## Notes

- Explosive data is read from the referenced explosive section, which varies by type:
  - Rockets: from `rocket_class`
  - Grenades: from `fake_grenade_name`
  - Mines: from `txr_mines` lookup tables
  - Direct explosives: from the item's own section
- Items with `weapon_class` set are excluded (those are handled in the weapons export as launchers).
- Items with zero cost or no translated name are excluded.
- Items containing "bad" in the section name are excluded.
