# Weapon Drop Sources Export

Produces: `export_weapon_drop_sources.csv`

Shows which NPC factions and ranks can carry/drop each weapon.

## Columns

| # | Column | Description |
|---|--------|-------------|
| 1 | Section | Internal weapon ID |
| 2 | Type | Weapon kind (pistol, shotgun, smg, rifle, sniper, explosive) |
| 3 | Name | Translated display name |
| 4+ | Faction columns | One column per faction found in loadout data, containing comma-separated rank names |

## Notes

- Data is read from `items\settings\npc_loadouts\npc_loadouts.ltx`.
- Faction columns are dynamically generated and sorted alphabetically.
- Ranks within each cell are sorted by progression: any, novice, trainee, experienced, professional, veteran, expert, master, legend.
- Loadout sections prefixed with `loadout_` parse as `loadout_{faction}_{rank}`; others parse as `{faction}_{rank}`.
- Sections without a `primary` line are skipped.
- Ammo drop sections are excluded.
