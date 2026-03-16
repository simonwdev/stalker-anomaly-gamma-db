# Release Notes

## What's New

### Saved / Bookmarked Items
Favorite any item by clicking the star icon (☆/★) on tiles, table rows, or the item detail modal. Favorites are stored in localStorage per pack with no limit. A dedicated "Favorites" entry at the top of the sidebar shows all favorited items across categories, each with a category badge. Within any category, a star toggle in the toolbar filters the view to just your favorites. Favorites view state is encoded in the URL for sharing.

### Category Badges Respect "Hide Non-NPC Dropped Weapons"
Sidebar category badges now reflect the active filter. When "Hide non-NPC dropped weapons" is enabled, weapon category counts (Pistols, SMGs, Shotguns, Rifles, Snipers, Launchers, Melee, and All Weapons) decrease to show only NPC-dropped weapons. Non-weapon categories are unaffected.

### Consistent Floating UI Tooltips
All tooltips now use the Floating UI-powered `v-tooltip` directive instead of native browser `title` attributes. Hover over any button, badge, or interactive element to see the new styled tooltips with smooth animations and a consistent dark rounded appearance.

### URL-Based State / Deep Linking
Category, filters, sort order, and selected items are now encoded in the URL. Share a link and the recipient sees exactly what you see — no more lost navigation state on refresh.

### Mobile / Responsive Layout
The app now works on phones and tablets. The sidebar collapses into a hamburger menu and items display in a stacked card layout on smaller screens.

### Filter Persistence Across Categories
Switching categories no longer resets your filters. Filter state (active filters, search query, sort column, sort direction, and faction filter) is saved per-category in localStorage and restored when you return.

### Export to CSV/JSON
Download the current filtered and sorted table view as CSV or JSON. The download button appears in the toolbar next to the copy-link button — click it to choose a format. Exported data matches exactly what you see: same columns, filters, and sort order. Useful for theorycrafting spreadsheets or mod development.

### Mobile-Responsive Filter Panel
The filter panel now works well on all screen sizes. On phones and narrow windows, it opens as a full-screen overlay with a dark backdrop, close button, and scrollable content. Filter chips and range inputs are enlarged for touch targets (44px minimum). Range filters stack in a single column on mobile. On desktop, the panel uses Floating UI to position below the filter button and stay within the viewport. On medium screens where the panel won't fit as a dropdown, it automatically switches to the full-screen overlay.
