# Feature Ideas

## High Impact

### Loadout Builder
Let users assemble a full character loadout (weapon + outfit + helmet + belt attachments + artefacts) and see combined stats. Players want to optimize their build, not just individual slots. Could show total protection values, weight budget, and highlight stat caps.

## Medium Impact

### "Where to Find" Summary View
Pick a map/area and see all notable items that drop there, ranked by probability. Useful for planning loot runs.

### Stat Weighting in Comparisons
Let users assign importance weights to stats in the comparison modal. Highlighting would reflect personal priorities rather than raw values.

### Crafting Cost Calculator
For recipe trees, compute the full raw material cost — total price of all base ingredients, total weight, and which merchants sell them.

## Quality of Life

### Recently Viewed Items
A small "Recent" section (last 10 items viewed) in the sidebar or header.

### "Similar Items" Suggestions
When viewing an item detail modal, show 3-5 items with the closest stats in the same category.

### Pack Diff / Changelog View
When multiple packs exist, show what changed — new items, removed items, stat adjustments.

### Print / Screenshot-Friendly Comparison
A "Print view" button on the comparison modal that renders a clean, light-background table suitable for screenshots or sharing in Discord.

## Completed

### Category Badges Respect "Hide Non-NPC Dropped Weapons"
Sidebar category count badges now update when the "Hide non-NPC dropped weapons" toggle is enabled, showing only the filtered count instead of the total.

### Consistent Floating UI Tooltips
Migrated all native `title` attributes on buttons, badges, and interactive elements to the `v-tooltip` directive for a unified Floating UI tooltip experience.

### URL-Based State / Deep Linking
Encode category, filters, sort, and selected item into URL query params so users can share direct links to specific views.

### Mobile / Responsive Layout
Collapsible sidebar (hamburger menu) and stacked card layout for mobile. Opens the tool up to players browsing on their phone while playing.

### Filter Persistence Across Categories
Remember filter state per-category in localStorage instead of resetting on category change.

### Export to CSV/JSON
A "Download" button on the current filtered table view for theorycrafting or mod development.

### Mobile-Responsive Filter Panel
Filter panel converts to a full-screen overlay on small and medium screens. Uses Floating UI for desktop dropdown positioning with viewport-aware shift. Includes backdrop, close button, touch-friendly chip and input sizing, and single-column range filter layout on mobile.

### Advanced Range Filters
Add numeric range sliders for key stats (damage, weight, price, protection values). Players often want "damage > 50" or "weight < 3kg" style queries.

### Saved / Bookmarked Items
Star icon on tiles, table rows, and item detail modal to favorite items. Favorites persist in localStorage scoped per pack. Dedicated "Favorites" sidebar entry shows all favorited items across categories with category badges. Toolbar toggle to filter any category to favorites only. Favorites view state encoded in URL.

### Keyboard Navigation in Modals
Arrow keys to cycle through items in the current filtered list while the detail modal is open.
