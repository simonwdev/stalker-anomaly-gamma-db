# Map Layers

Overview of all layers on the interactive map, their data sources, and behavior.

## Game Data Layers

Static layers derived from game configs and a one-time Lua dump. These represent the base game state and do not change during gameplay.

### Level names
- **Source:** `game_maps_single.ltx` → `generate-map-levels.mjs` → `map-levels.json`
- **Description:** Human-readable level names positioned at the center of each level's map bounds.
- **Default:** On

### Level boundaries
- **Source:** `game_maps_single.ltx` `global_rect` values → `generate-map-levels.mjs` → `map-levels.json`
- **Description:** Rectangular outlines showing each level's extent on the global map.
- **Default:** Off

### Starting factions
- **Source:** Smart terrain `.ltx` configs (`configs/scripts/<level>/smart/*.ltx`) `spawn_squads` field → `generate-map-entities.mjs` → `map-entities.json`
- **Description:** Shows which factions are configured to initially spawn squads at each smart terrain. Color-coded circles per faction. During gameplay, factions can capture and lose territory through warfare and story events — this layer only reflects the starting configuration.
- **Min zoom:** 3
- **Default:** Off

### Campfires
- **Source:** Lua dump (`zzz_gamma_map_entities.script`) via `zone_campfire` class → `generate-map-entities.mjs` → `map-entities.json`
- **Description:** Campfire locations. These are static world objects that do not move.
- **Min zoom:** 5
- **Default:** Off

### Stashes (Anomaly 1.5.3 only)
- **Source:** Lua dump → `generate-map-entities.mjs` → `map-entities.json`
- **Description:** Inventory box / stash locations. Only shown for the Anomaly 1.5.3 pack.
- **Min zoom:** 4
- **Default:** On (when available)

### Locations (Smart Terrains)
- **Source:** Lua dump via `smart_terrain` class → `generate-map-entities.mjs` → `map-entities.json`
- **Description:** Smart terrain locations with translated names. Smart terrains are fixed world anchors for the A-Life simulation.
- **Min zoom:** 5
- **Default:** Off

### Level changers
- **Source:** Lua dump via `level_changer` class → `generate-map-entities.mjs` → `map-entities.json`
- **Description:** Transition points between levels. Arrow icon rotated to point toward the destination level.
- **Min zoom:** 3
- **Default:** Off

### Notable characters
- **Source:** Lua dump via named stalkers/traders (excludes `sim_default_*` generic squads) → `generate-map-entities.mjs` → `map-entities.json`
- **Position:** Uses the NPC's assigned smart terrain position (`se.m_smart_terrain_id`) rather than the NPC's current position. This ensures the position reflects where the NPC lives, not where they happen to be at dump time (e.g. a companion following the player).
- **Description:** Named NPCs — traders, mechanics, medics, barmen, guides, leaders, arena masters. Color-coded by role with faction icons. Character names resolved via `character_name` config field and game translations.
- **Min zoom:** 3
- **Default:** Off

## Why no anomaly layer in Game Data?

Anomaly positions are not available as static game data. The base anomaly spawn points are stored in `all.spawn` binary files baked into each level's game database — a proprietary binary format separate from `.ltx` configs. The Lua API (`alife()`) only exposes anomalies that are currently spawned in the simulation, which is the same snapshot data available from a save file.

Additionally, GAMMA adds a dynamic anomaly system that reshuffles anomaly positions during gameplay. Anomalies re-randomize when entering or reloading a level, making any static dump immediately outdated.

For these reasons, anomalies are only available as a **Save Data** layer — imported from the player's own `.scop` save file, showing the anomalies active at the time of that save.

## Save Data Layers

Dynamic layers extracted from a player's `.scop` save file. These reflect the game state at the time of the save. Shown only after importing a save file via the save import panel.

### Position
- **Source:** Actor object (ID 0) `o_Position` from `.scop` spawn packet
- **Level detection:** `m_tGraphID` from actor's `STATE_Write`, resolved to a level via a mapping built from named objects (smart terrains, level changers) in the same save file. Uses direct vertex lookup with nearest-vertex fallback.
- **Coordinate transform:** World-space `(x, z)` → map pixels using `worldBounds` + `rawRect` from `map-levels.json`
- **Description:** Player's position at save time. Green dot with pulsing ring. Hover shows player name and level.
- **Player name:** Extracted from the save filename (e.g. `PlayerName - quicksave_5.scop` → `PlayerName`).
- **Default:** On
- **Persisted:** Yes (localStorage)

### Stash
- **Source:** `workshop_stash` objects' `o_Position` from `.scop`
- **Description:** Player's personal stash location. The stash moves when the player relocates to a different base via the workshop mechanic. Cyan lock icon.
- **Default:** On
- **Persisted:** Yes (localStorage)

### Anomalies
- **Source:** All objects with `section_name` starting with `zone_` (excluding `zone_campfire`) from `.scop`
- **Description:** Anomaly zones active in the save. Color-coded by type:
  - Thermal / fire → orange (`#ff6e40`)
  - Electric → blue (`#448aff`)
  - Gravitational → purple (`#b388ff`)
  - Radioactive / acid → green (`#69f0ae`)
  - Psychic / psi → pink (`#ea80fc`)
  - Other → amber (`#ffab40`)
- **Note:** Anomalies are dynamic and will change during the game. They re-randomize when entering or reloading a level.
- **Rendering:** Canvas-rendered `L.circleMarker` for performance (hundreds of markers).
- **Min zoom:** 4
- **Default:** Off
- **Persisted:** Yes (localStorage)

## Data Pipeline

### Static data (Game Data layers)
1. `zzz_gamma_map_entities.script` — Lua script run inside the game engine via debug menu. Iterates all alife objects, classifies them, captures positions and translations. Outputs `map_entities.json`.
2. `generate-map-entities.mjs` — Transforms world-space coordinates to 1024×2634 global map pixel space using `level_bounds` and `globalRects`. Merges faction data from smart terrain `.ltx` configs. Outputs `site/public/data/<pack>/map-entities.json`.
3. `generate-map-levels.mjs` — Parses `game_maps_single.ltx` for level bounds and global rects. Includes `worldBounds` for client-side coordinate transforms. Outputs `site/public/data/map-levels.json`.

### Dynamic data (Save Data layers)
1. User drops/selects a `.scop` file in the map's save import panel.
2. `scop-parser.js` decompresses (LZO1X) and parses the object registry. Extracts actor position, stash positions, and anomaly positions. Resolves levels via `graphId → level` mapping built from named objects in the save.
3. `MapsView.vue` transforms world coordinates to map pixels using `worldBounds` + `rawRect` from `map-levels.json`, places markers, and persists extracted data to localStorage.
