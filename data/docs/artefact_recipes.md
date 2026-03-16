# Artefact Recipes Export

Produces: `export_artefact_recipes.csv`

Lists crafting recipes for artefacts, sorted alphabetically by output name.

## Columns

| # | Column | Description |
|---|--------|-------------|
| 1 | Section | Internal item ID of the crafted artefact |
| 2 | Name | Translated display name of the crafted artefact |
| 3 | Ingredient 1 Name | First ingredient name |
| 4 | Ingredient 1 Amount | First ingredient quantity (e.g. "x2") |
| 5 | Ingredient 2 Name | Second ingredient name |
| 6 | Ingredient 2 Amount | Second ingredient quantity |
| 7 | Ingredient 3 Name | Third ingredient name |
| 8 | Ingredient 3 Amount | Third ingredient quantity |
| 9 | Ingredient 4 Name | Fourth ingredient name |
| 10 | Ingredient 4 Amount | Fourth ingredient quantity |

## Notes

- Recipes are read from craft index 7 in `items\settings\craft.ltx`.
- Each recipe supports 2-4 ingredients. Empty ingredient slots are left blank.
- If an artefact has multiple recipes, only the last one is exported (due to table key overwrite).
