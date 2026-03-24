# TODO

## Build Planner
- [ ] Confirm belt slot behavior: build planner uses `st_data_export_outfit_artefact_count_max` (max upgraded slots) - verify with Grok whether it should use base `ui_inv_outfit_artefact_count` instead

## Weapon Attachments
- [ ] Data pipeline for attachments and cross-reference to allowed weapons
- [ ] Tile/grid view for attachments category
- [ ] Item modal: show list of compatible weapons for each attachment
- [ ] Item modal: show allowed attachments for weapons

## Data
- [ ] Toolkit map rates CSV not yet available for 0.9.5 - `toolkit-rates.json` generation is skipped. Requires @sw to export from 0.9.5 game files
- [ ] Belt attachments missing `ui_inv_ap_res` column in `export_belt_attachments.csv`

---

# Future Ideas

## Interactive Maps
- [ ] Interactive maps using Leaflet.js or similar
- [ ] Map overlays for stashes, NPCs, etc.

## Save Game Import
- [ ] Import save game data into build planner
- [ ] Import save game data into a statistics viewer
