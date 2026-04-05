# TODO

## Build Planner

## Clean code/rafactor
- [x] Split logic into smaller dedicated components
- [ ] Split `app.js` into smaller JS files named by category (e.g., `weapons.js`, `attachments.js`, `maps.js`, etc.)
- [ ] Create a `utils.js` for shared utility functions (e.g., data fetching, formatting, etc.)
- [ ] Refactor `style.css` (variables for official color-palette which will be used everywhere (**same for vars for font-sizes**), shared styles, util-styles *for common styles used on a lots of places*, etc.)
- [ ] Split each page-component into smaller components (e.g., `WeaponList`, `WeaponDetail`, `AttachmentList`, etc.)

## Weapon Attachments
- [x] Data pipeline for attachments and cross-reference to allowed weapons
- [x] Tile/grid view for attachments category
- [x] Item modal: show list of compatible weapons for each attachment
- [x] Item modal: show allowed attachments for weapons
- [ ] Graph comparison of attachments (except the price, all other values are 'zero')

## Data
- [ ] Toolkit map rates CSV not yet available for 0.9.5 - `toolkit-rates.json` generation is skipped. Requires @sw to export from 0.9.5 game files
- [ ] Belt attachments missing `ui_inv_ap_res` column in `export_belt_attachments.csv`

---

# Future Ideas

## Interactive Maps
- [x] Interactive maps using Leaflet.js or similar
- [x] Map overlays for stashes, NPCs, etc.
