# Weapons Export

Produces multiple CSV files by weapon type: `export_weapons_{type}.csv`

Types: `pistol`, `shotgun`, `smg`, `rifle`, `sniper`, `explosive`

## Columns

| # | Column | Description |
|---|--------|-------------|
| 1 | Section | Internal item ID |
| 2 | Name | Translated display name |
| 3 | Weight | Inventory weight (kg) |
| 4 | Cost | Base purchase price |
| 5 | Repair | Repair tier label: A (Pistol), B (Shotgun), C (Rifle 5.x), D (Rifle 7.x) |
| 6 | Single-Handed | Can be used one-handed ("Y"/"N") |
| 7 | Accuracy | Weapon accuracy (%) |
| 8 | Handling | Weapon handling (%) |
| 9 | Damage | Damage value |
| 10 | Fire Rate | Rate of fire |
| 11 | Magazine Size | Ammo capacity |
| 12 | Max Range | Effective range |
| 13 | Bullet Speed | Muzzle velocity (floored) |
| 14 | Reliability | Weapon reliability/durability (%) |
| 15 | Recoil | Recoil value (floored) |
| 16 | Caliber | Ammunition caliber(s), semicolon-separated if multiple |
| 17 | Alt Caliber | Alternative calibers available via upgrades, semicolon-separated |
| 18-24 | BR1-BR7 | Ballistic resistance penetration per armor class (1-7) |

## BR (Ballistic Resistance) Classes

AP (armor piercing) values are calculated as: `k_ap * 10 * 100 * difficulty_multiplier`

| Class | AP Range |
|-------|----------|
| 0 | < 11 |
| 1 | 11-18 |
| 2 | 19-29 |
| 3 | 30-38 |
| 4 | 39-45 |
| 5 | 46-54 |
| 6 | 55+ |

Each BR column shows the highest AP value among the weapon's ammo types that falls in that class.

## Notes

- Weapons with a `parent_section` different from their own section are skipped (variant deduplication).
- Explosives with `weapon_class` set are handled in the explosives export, not here.
- Alt calibers are discovered by scanning the weapon's upgrade tree for `ammo_class` overrides.
- Difficulty scaling is disabled by default (multiplier = 1.0).
