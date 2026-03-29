# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## 2026-03-29

### Added

- Artifact crafting tree view with collapsible nodes, connection lines, and stat tooltips (Evincars)
- Quick navigation dialog (Ctrl+K) for jumping to any item or page (Evincars)
- Infinite scroll for large item lists to improve initial load performance (Evincars)
- Grim Raid Addon 2.4 mod pack with full item data, icons, and drop locations (SaloEater)
- Stash drop chances for Anomaly 1.5.3 items (SaloEater)
- Version compare filters now persist in URL query params for shareable filtered views

### Changed

- Responsive header, filter bar, and version compare toolbar — collapses gracefully on tablet and mobile with icon-only buttons and two-row layout
- Updated Anomaly 1.5.3 data with latest game exports and new item icons

### Fixed

- Save file import now resolves weapons with GAMMA-style addon suffixes (e.g. wpn_ak74u_tac_p1x42) and uses equip slot data to correctly assign loadout slots
- Build planner character name and faction now persist across page refreshes and are properly reset on clear

## 2026-03-28

### Added

- What's New banner showing highlighted release notes entries on first visit after an update
- Feature callouts that spotlight new UI elements when the user navigates to the relevant page
- Ammo tooltips on weapon caliber badges — hover any ammo type on a gun to see an image, armor penetration, damage, accuracy, and cost per round (Evincars)
- Clicking an ammo badge on a weapon now navigates directly to that ammo item (Evincars)
- Version Compare page accessible from the sidebar with category and property filter dropdowns
- Version compare filters persist to localStorage and survive modal navigation

### Changed

- URLs are now path-based (`/db/gamma-0.9.4/rifles`) instead of query-based for cleaner shareable links and proper Cloudflare analytics tracking
- Browser back/forward navigation now works correctly between categories and views
- Save file import in the build planner — drag and drop .scop/.scoc save files to auto-populate your loadout, inventory, and stash contents with item hover previews

## 2026-03-26

### Added

- Yes/No toggle for all flag filters, allowing items to be excluded by flags like Powered Exo, Craftable, and others
- Alt ammo toggle on the ammo type filter to include weapons with matching alternate ammo conversions
- Contributor credit chips on release notes with role-based tooltips

## 2026-03-25

### Added

- French translations for app UI strings

### Changed

- Belt slots now use the outfit's max upgraded slot count directly, removing the manual +/- bonus buttons
- Outfit slot in build planner shows both default and max belt slot counts

### Fixed

- Build sharing now works for items with hyphens in their IDs (e.g. OG-7B, VOG-25 ammo)
- Copy link and copy code buttons now show a loading spinner while saving the build
- Adding favourites to build planner inventory now correctly updates stats (Evincars)
- French locale selection now persists across page reloads

## 2026-03-24

### Added

- Toolkit Rates page showing stash tool drop chances per map with sortable heatmap table, search filtering, and CSV/JSON export

### Fixed

- Resist cap calculation in build planner now correctly sums cap bonuses from all equipped items and adds them to the 65% base cap, instead of using only the highest single cap value as the total belt/artifact allowance
- Belt attachments now contribute to BR Class (armor points) in the build planner - waiting on `ui_inv_ap_res` column in `export_belt_attachments.csv` data
- Toolkit Rates category no longer shows in sidebar when the pack has no toolkit rates data
- Release notes no longer require a hard refresh to show new entries

### Changed

- Translation CSV decoding now uses Node.js TextDecoder instead of external iconv, working cross-platform without extra tools
- Per-file encoding overrides via `pack.json` - each translation CSV can specify its own encoding instead of assuming Windows-1251 for all files
- Refreshed all GAMMA 0.9.5 CSV data with latest game exports

## 2026-03-23

### Added

- Cross-pack build sharing via Cloudflare KV - shared builds now work across different mod packs, dropping items that don't exist in the target pack
- Build payload validation on the server to prevent abuse
- Per-IP rate limiting on build share endpoint
- App UI translations loaded independently from pack data - adding UI strings no longer requires regenerating all packs
- Toast notifications for share errors

### Changed

- Build share URLs now use clean format with no query parameters
- Share and import buttons show loading state during async operations

### Removed

- Sqids-based build codes and per-pack dictionary.json files replaced by server-side storage

### Added

- GAMMA 0.9.5 mod pack support (preview)
- Cross-pack stat comparison in item modal to see what changed between pack versions
- Version compare tool page listing all items with stat differences between packs, with CSV export
- Item descriptions now shown in the modal for items that have them
- Redesigned modal toolbar with icon buttons for favorite, pin, copy ID, copy link, and compare

### Changed

- Item modal now uses full available width with responsive 1-4 column stat grid
- Modal close button moved outside to match navigation arrow style
- Tighter spacing throughout the modal for a more compact layout

## 2026-03-22

### Added

- Keyboard shortcuts for common actions like search, view toggling, and item navigation
- Sidebar can now be collapsed on desktop for more screen space
- Collapsible sidebar category groups with persistent accordion state
- Contact page with Discord channel link for feature requests, bugs, and discussions
- Anomaly 1.5.3 mod pack support with 798 items across 16 categories
- Pack selector popup menu for switching between mod packs
- Pack status badges for marking packs as preview, beta, etc.
- Global search recalls your last query when reopened with `/` or Ctrl+K

### Changed

- Ammo chip badges on weapon tiles now wrap instead of truncating when there are many ammo types
- Tile stat labels no longer wrap on narrow tiles
- Non-integer stat values on tiles now round to 1 decimal place

### Fixed

- Filter chip labels now display translated text instead of raw translation keys

### Removed

- Total heal fields (total health restoration, total wound healing, etc.) no longer clutter tile view

### Changed

- Global search now shows item IDs to distinguish items with the same name
- Compact mobile footer with icon-only links and shorter copyright text
- Acknowledgements and contact pages now use clean directory-based URLs
- Use data-driven `is_backpack` field from CSV instead of hardcoded backpack ID list
- Reduce max belt slots from 12 to 6
