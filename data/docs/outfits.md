# Outfits Export

Produces multiple CSV files, one per outfit repair type: `export_outfits_{repair_type}.csv`

Repair types correspond to armor weight classes: `outfit_helmet`, `outfit_light`, `outfit_medium`, `outfit_heavy`, etc.

## Helmet CSV (`export_outfits_outfit_helmet.csv`)

| # | Column | Description |
|---|--------|-------------|
| 1 | Section | Internal item ID |
| 2 | Name | Translated display name |
| 3 | Weight | Inventory weight (kg, floored to integer) |
| 4 | Cost | Base purchase price |
| 5 | Repair | Repair tier label: F (Novice), L (Light), M (Medium), H (Heavy), E (Exo) |
| 6 | AP Resistance | Ballistic resistance class (rounded) |
| 7 | Ballistic | Firearm wound protection (%) |
| 8 | Rupture | Wound/rupture protection (%) |
| 9 | Burn | Burn protection (%) |
| 10 | Shock | Electric shock protection (%) |
| 11 | Chemical Burn | Chemical burn protection (%) |
| 12 | Radiation | Radiation protection (%) |
| 13 | Telepathic | Psy/telepathic protection (%) |
| 14 | Impact | Strike/impact protection (%) |
| 15 | Explosion | Explosion protection (%) |

## Body Armor CSV (`export_outfits_{type}.csv`)

All non-helmet outfits share this wider format:

| # | Column | Description |
|---|--------|-------------|
| 1 | Section | Internal item ID |
| 2 | Faction | Outfit community/faction affiliation |
| 3 | Name | Translated display name |
| 4 | Weight | Inventory weight (kg, floored to integer) |
| 5 | Cost | Base purchase price |
| 6 | Repair | Repair tier label (F/L/M/H/E) |
| 7 | Powered | Exoskeleton ("Y"/"N") |
| 8 | AP Resistance | Ballistic resistance class (rounded) |
| 9 | Ballistic | Firearm wound protection (%) |
| 10 | Rupture | Wound/rupture protection (%) |
| 11 | Burn | Burn protection (%) |
| 12 | Shock | Electric shock protection (%) |
| 13 | Chemical Burn | Chemical burn protection (%) |
| 14 | Radiation | Radiation protection (%) |
| 15 | Telepathic | Psy/telepathic protection (%) |
| 16 | Impact | Strike/impact protection (%) |
| 17 | Explosion | Explosion protection (%) |
| 18 | Artefact Slots | Base artefact slot count |
| 19 | Max Artefact Slots | Maximum slots after upgrades |
| 20 | Carry Weight | Additional carry weight bonus |
| 21 | Speed | Movement speed modifier (%) |

## Notes

- Protection values are percentages (floored).
- Repair type remapping: `outfit_exo` is treated as `outfit_heavy`; `outfit_novice` is treated as `outfit_light`; helmets with `kind = "o_helmet"` use `outfit_helmet`.
- Max artefact slots includes upgrades that have the `prop_artefact` property.
- Multiplayer and blacklisted items are excluded.
