# Ammo Export

Produces: `export_ammo.csv`

Covers all ammunition types.

## Columns

| # | Column | Description |
|---|--------|-------------|
| 1 | Section | Internal item ID |
| 2 | Name | Translated display name (quoted, with unit words stripped) |
| 3 | Weight | Inventory weight (kg) |
| 4 | Cost | Base purchase price |
| 5-11 | BR1-BR7 | Ballistic resistance penetration per armor class (0-6) |
| 12 | Projectiles | Projectiles per shot (buckshot count, default 1) |
| 13 | Damage | Base damage multiplier (`k_hit`) |
| 14 | Accuracy | Dispersion modifier (%, from `k_disp`) |
| 15 | Range | Range modifier (%, from `k_dist`) |
| 16 | Falloff | Air resistance / damage falloff (%, from `k_air_resistance`) |
| 17 | Velocity | Bullet speed modifier (%, from `k_bullet_speed`) |
| 18 | Impulse | Impact impulse modifier (%, from `k_impulse`) |
| 19 | Degradation | Weapon degradation rate (%, from `impair`) |

## BR (Ballistic Resistance) Classes

Same scale as weapons — see [weapons.md](weapons.md) for the AP range table.

Each ammo type gets a single BR column populated based on its `k_ap` value.

## Name Sanitization

The following words are stripped from ammo names: "mm", "rounds", "grenade", "round", "shells", "Grenade", "warhead". The resulting name is wrapped in quotes.

## Notes

- Modifier columns (accuracy, range, falloff, velocity, impulse, degradation) are `decimal * 100` expressed as percentages.
- Blacklisted patterns: `_knife`, `_binoc`, `_base$`, `_dyno$`, `_batteries`, `^mp_`, `_bad$`, `_verybad$`, `_heli$`, `_parts$`, `^casing_`, `^powder_`, `^bullet_`.
- Difficulty scaling is disabled by default (multiplier = 1.0).
