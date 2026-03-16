# Belt Attachments Export

Produces: `export_belt_attachments.csv`

Covers belt-slot items: mutant belt trophies, attachments, backpacks, and the hunting kit.

## Columns

| # | Column | Description |
|---|--------|-------------|
| 1 | Section | Internal item ID |
| 2 | Name | Translated display name |
| 3 | Weight | Inventory weight (kg) |
| 4 | Cost | Base purchase price |
| 5 | Tier | Item tier |
| 6 | Jump Height | Jump height modifier |
| 7 | Bonus Mutant Part Chance | Extra mutant part drop chance (%) |
| 8 | Ballistic Immunity | Firearm wound immunity (%) |
| 9 | Rupture Immunity | Wound/rupture immunity (%) |
| 10 | Burn Immunity | Burn immunity (%) |
| 11 | Shock Immunity | Electric shock immunity (%) |
| 12 | Chemical Burn Immunity | Chemical burn immunity (%) |
| 13 | Radiation Immunity | Radiation immunity (%) |
| 14 | Psychic Immunity | Psy/telepathic immunity (%) |
| 15 | Impact Immunity | Strike/impact immunity (%) |
| 16 | Explosion Immunity | Explosion immunity (%) |
| 17 | Health Restore | Health restore speed |
| 18 | Satiety Restore | Satiety restore speed (%) |
| 19 | Bleed Restore | Bleed restore speed (divided by 1000) |
| 20 | Radiation Restore | Radiation restore speed (floored) |
| 21 | Stamina Restore | Power restore speed (%, rounded) |
| 22 | Carry Weight | Additional carry weight bonus |

## Notes

- Includes items with kinds: `i_mutant_belt`, `i_attach`, `i_backpack`, `EQ_BAKPK`.
- The `kit_hunt` item is whitelisted regardless of kind.
- Stat calculations use the artefact stat system (same as artefacts).
