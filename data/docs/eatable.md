# Eatable (Food & Drink) Export

Produces: `export_eatable.csv`

Covers all consumable food and drink items (mutant meat raw/cooked, drinks, bottled items, standard food).

## Columns

| # | Column | Description |
|---|--------|-------------|
| 1 | Section | Internal item ID |
| 2 | Name | Translated display name |
| 3 | Weight | Inventory weight (kg) |
| 4 | Cost | Base purchase price |
| 5 | Tier | Item tier |
| 6 | Sleepiness | Sleep effect (%) |
| 7 | Thirst | Thirst restoration (%) |
| 8 | Alcohol | Alcohol content (%) |
| 9 | Health | Instant health change (%) |
| 10 | Radiation | Radiation applied (flat value, based on eat_radiation * 3870) |
| 11 | Satiety | Hunger restoration (%) |
| 12 | Servings | Number of uses per item |
| 13 | Used in Cooking | Whether this item is a cooking ingredient ("Y"/"N") |
| 14 | Can Be Cooked | Whether this item is produced by cooking ("Y"/"N") |
| 15 | Duration | Boost effect duration (seconds) |
| 16 | Health Restore | Health restore rate per second (%) |
| 17 | Total Health Restore | Total health restored over full duration (%) |
| 18 | Bleed Restore | Bleed restore rate (units/sec, divided by 1000) |
| 19 | Total Bleed Restore | Total bleed restored over full duration |
| 20 | Radiation Restore | Radiation restore rate (floored) |
| 21 | Total Radiation Restore | Total radiation restored over full duration (floored) |
| 22 | Stamina Restore | Stamina restore rate (%, divided by 100) |
| 23 | Total Stamina Restore | Total stamina restored over full duration (%) |
| 24 | Radiation Protection | Radiation protection boost (flat) |
| 25 | Chemical Protection | Chemical burn protection boost (%) |
| 26 | Psychic Protection | Telepathic protection boost (flat) |
| 27 | Carry Weight | Additional carry weight bonus |

## Notes

- Sleepiness is calculated relative to a max sleep threshold (default 8750) scaled by a multiplier (default 1000).
- Thirst is calculated relative to a max thirst threshold (default 5760) scaled by a multiplier (default 1000).
- Cooking relationships are read from `items\settings\cook.ltx`.
- Blacklisted/multiplayer items are excluded.
