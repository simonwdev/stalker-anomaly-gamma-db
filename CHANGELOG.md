# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## 2026-03-22

### Added

- Keyboard shortcuts for common actions like search, view toggling, and item navigation
- Sidebar can now be collapsed on desktop for more screen space
- Collapsible sidebar category groups with persistent accordion state
- Contact page with Discord channel link for feature requests, bugs, and discussions
- Anomaly 1.5.3 mod pack support with 798 items across 16 categories
- Pack selector popup menu for switching between mod packs
- Pack status badges for marking packs as preview, beta, etc.

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
