# Medicine Export

Produces: `export_medicine.csv`

Covers medical items: medkits, bandages, anti-radiation drugs, and other medical consumables.

## Columns

| # | Column | Description |
|---|--------|-------------|
| 1 | Section | Internal item ID |
| 2 | Name | Translated display name |
| 3 | Weight | Inventory weight (kg) |
| 4 | Cost | Base purchase price |
| 5 | Tier | Item tier |
| 6 | Sleepiness | Sleep effect (%, rounded) |
| 7 | Thirst | Thirst restoration (%) |
| 8 | Alcohol | Alcohol content (%) |
| 9 | Health | Instant health change (%) |
| 10 | First Aid Duration | Active healing time for limb treatment (seconds) |
| 11 | First Aid Head | Temporary head healing amount |
| 12 | First Aid Torso | Temporary torso healing amount |
| 13 | First Aid Arm | Temporary arm healing amount |
| 14 | First Aid Leg | Temporary leg healing amount |
| 15 | Post-Heal Head | Permanent head healing amount |
| 16 | Post-Heal Torso | Permanent torso healing amount |
| 17 | Post-Heal Arm | Permanent arm healing amount |
| 18 | Post-Heal Leg | Permanent leg healing amount |
| 19 | Ballistic Immunity | Firearm wound immunity boost (%) |
| 20 | Rupture Immunity | Wound/rupture immunity boost (%) |
| 21 | Burn Immunity | Burn immunity boost (%) |
| 22 | Shock Immunity | Electric shock immunity boost (%) |
| 23 | Chemical Burn Immunity | Chemical burn immunity boost (%) |
| 24 | Radiation Immunity | Radiation immunity boost (%) |
| 25 | Psychic Immunity | Psy/telepathic immunity boost (%) |
| 26 | Impact Immunity | Strike/impact immunity boost (%) |
| 27 | Explosion Immunity | Explosion immunity boost (%) |
| 28 | Satiety | Hunger restoration (%) |
| 29 | Servings | Number of uses per item |
| 30 | Duration | Boost effect duration (seconds) |
| 31 | Health Restore | Health restore rate per second (%) |
| 32 | Total Health Restore | Total health restored over full duration (%) |
| 33 | Bleed Restore | Bleed restore rate (units/sec, divided by 1000) |
| 34 | Total Bleed Restore | Total bleed restored over full duration |
| 35 | Radiation Restore | Radiation restore rate (floored) |
| 36 | Total Radiation Restore | Total radiation restored over full duration (floored) |
| 37 | Stamina Restore | Stamina restore rate (%) |
| 38 | Total Stamina Restore | Total stamina restored over full duration (%) |
| 39 | Radiation Protection | Radiation protection boost (%) |
| 40 | Chemical Protection | Chemical burn protection boost (%) |
| 41 | Psychic Protection | Telepathic protection boost (%) |
| 42 | Carry Weight | Additional carry weight bonus |
| 43 | Used in Crafting | Whether this item is a crafting ingredient ("Y"/"N") |
| 44 | Craftable | Whether this item can be crafted ("Y"/"N") |

## Notes

- Limb healing data comes from `zzz_player_injuries` — temporary healing uses the `medkits` table, permanent healing uses `healhelp`.
- First Aid Duration is the `timeregen` value from the medkits table (converted from ms to seconds).
- Immunity boosts (columns 19-27) from `boost_*_immunity` config values are multiplied by 100 to get percentages.
- Crafting recipes are read from craft index 5 (`items\settings\craft.ltx`).
