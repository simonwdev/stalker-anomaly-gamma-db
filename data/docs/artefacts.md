# Artefacts Export

Produces: `export_artefacts.csv`

Covers all artefacts including junk artefacts.

## Columns

| # | Column | Description |
|---|--------|-------------|
| 1 | Section | Internal item ID |
| 2 | Name | Translated display name |
| 3 | Weight | Inventory weight (kg) |
| 4 | Cost | Base purchase price |
| 5 | Tier | Item tier |
| 6 | Rank | Artefact rank (`af_rank`) |
| 7 | Jump Height | Jump height modifier |
| 8 | Is Junk | Junk artefact ("Y"/"N") |
| 9 | Has Perk | Has perk-based effect ("Y"/"N") |
| 10 | Ballistic Immunity | Firearm wound immunity (%) |
| 11 | Rupture Immunity | Wound/rupture immunity (%) |
| 12 | Burn Immunity | Burn immunity (%) |
| 13 | Shock Immunity | Electric shock immunity (%) |
| 14 | Chemical Burn Immunity | Chemical burn immunity (%) |
| 15 | Radiation Immunity | Radiation immunity (%) |
| 16 | Psychic Immunity | Psy/telepathic immunity (%) |
| 17 | Impact Immunity | Strike/impact immunity (%) |
| 18 | Explosion Immunity | Explosion immunity (%) |
| 19 | Health Restore | Health restore speed |
| 20 | Satiety Restore | Satiety restore speed (%) |
| 21 | Bleed Restore | Bleed restore speed (divided by 1000) |
| 22 | Radiation Restore | Radiation restore speed (floored) |
| 23 | Stamina Restore | Power restore speed (%, rounded) |
| 24 | Ballistic Cap | Firearm wound protection cap (%) |
| 25 | Rupture Cap | Wound protection cap (%) |
| 26 | Burn Cap | Burn protection cap (%) |
| 27 | Shock Cap | Shock protection cap (%) |
| 28 | Chemical Burn Cap | Chemical burn protection cap (%) |
| 29 | Telepathic Cap | Telepathic protection cap (%) |
| 30 | Impact Cap | Strike protection cap (%) |
| 31 | Explosion Cap | Explosion protection cap (%) |
| 32 | Carry Weight | Additional carry weight bonus |
| 33 | Used in Crafting | Whether this item is a crafting ingredient ("Y"/"N") |
| 34 | Craftable | Whether this item can be crafted ("Y"/"N") |

## Notes

- Perk artefacts are determined via the `perk_based_artefacts` table (entries matching `artefact_on_*`).
- "Cap" values represent the maximum protection ceiling that the artefact contributes to.
- Crafting recipes are read from craft index 7.
- Junk artefacts have `kind = "i_arty_junk"`.
