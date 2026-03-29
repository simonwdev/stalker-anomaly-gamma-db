# Save File Progression Data

Research findings from analyzing real GAMMA save files and xray-monolith source code.

## Data Sources

All progression data comes from two files per save: `.scop` (binary objects) and `.scoc` (Lua script state).

---

## .scoc Progression Data

The `.scoc` file is a Lua marshal binary containing a flat dictionary of script module states. These keys contain progression-relevant data:

### game_statistics (rich structure)

| Sub-key | Type | Description | Example |
|---------|------|-------------|---------|
| `actor_statistics` | flat map | Global play stats | `killed_stalkers: 33, killed_monsters: 16, tasks_completed: 23, artefacts_found: 6, deaths: 0, stashes_found: 3, items_disassembled: 55, level_changes: 0, emissions: 1` |
| `actor_visited_levels` | map of level_id → bool | Which levels the player has entered | 33 levels tracked, boolean visited/unvisited |
| `actor_visited_smarts` | map of smart_name → bool | Which smart terrains (AI anchor points) the player has walked through | `esc_smart_terrain_5_7: true` |
| `actor_achievements` | map of achievement_id → bool | Unlocked achievements | 24 total, 0 unlocked in test save |
| `actor_articles` | map of article_id → bool | Encyclopedia articles discovered | ~90+ entries |
| `actor_notes` | map | Notes found | 5 in test save |

### task_info

Flat map of completed task IDs → `true`. Example: `esc_m_trader_task_2`, `simulation_task_30`, etc.

Test save: 14 completed tasks.

### treasure_manager

| Field | Type | Description |
|-------|------|-------------|
| `caches_count` | number | Total stashes in game (1,182) |
| `caches` | map of stash_id → bool | `false` = undiscovered, `true` = found/looted |

Test save: 0/1,182 found.

### fast_travel_system

| Field | Type | Description |
|-------|------|-------------|
| `locations_found` | number | Count of discovered travel points (7 in test save) |
| `spawned_zones` | map | All 35 travel zones with names and IDs |
| `cooldowns` | map | Per-zone cooldown timers |

### visited_campfires

Map of campfire object IDs → `true`. Test save: 3 campfires visited (IDs: 15588, 15598, 15610).

### skills_levels

Map of skill_name → skill data object:

```json
{
  "strength": {
    "current_level": 2,
    "max_level": 30,
    "experience": 2429.26,
    "requirement": 2812.5,
    "prev_requirement": 1875,
    "base_requirement": 750
  }
}
```

Test save: 4 skills (strength, scavenging, endurance, survival).

### known_recipe

Map of recipe_id → `true`. Test save: `recipe_advanced_1`, `recipe_basic_1`.

### drx_da_opened_articles

Nested by category → article_name → `true`. Test save: 1 article (`encyclopedia_anomalies_sphere`).

### milpda

| Sub-key | Type | Description |
|---------|------|-------------|
| `tracked_bodies` | map of id → kill record | Recent kill feed (capped, NOT all kills). Each entry has: `level`, `tod` (time of death), `name`, `comm` (victim faction), `killer_id`, `kname`, `k_comm`. **No position coordinates.** |
| `faction_data` | map of faction → data | 13 factions with `blacklisted`, `requirements`, `progress` fields |
| `found_npc_pda` | map | Found PDA entries |

Test save: 5 tracked kills (despite 33+ total kills), 13 factions.

### default_faction

String value. Test save: `"stalker"` (Loners).

### Other notable keys

| Key | Description |
|-----|-------------|
| `looted` | Map of looted container IDs (2 in test save) |
| `stealth_kills` | Has `victims` sub-object (empty in test save) |
| `opened_routes` | Fast travel routes discovered (boolean) |
| `prev_level` | Last level visited: `{ level_name: "fake_start" }` |
| `npe` | Tutorial state — 7 tutorial groups with `played: true/false` |
| `artefact_respawn_levels` | 33 levels, all `true` |
| `workshop_stashes` | Player workshop stash state |

---

## .scop Progression Data (Chunk 9: Registry Container)

Chunk 9 (`alife_registry_container`) contains 7 binary registries serialized sequentially (no sub-chunks). Format defined in `alife_registry_container.cpp`.

### Registry 0: InfoPortions

**Type:** `CALifeAbstractRegistry<u16, KNOWN_INFO_VECTOR>`

Per-character list of infoportions (string flags). Actor (ID 0) had 76 infoportions including:
- **Location spots:** `esc_smart_terrain_*_spot` (8 entries)
- **Training:** `fanat_training_*_done` (7 entries)
- **NPC death tracking:** `awr_*_dead` (24 entries — specific story-relevant NPCs)
- **Quest progress:** `drx_sl_*`, `esc_m_trader_*`, `living_legend_*`
- **System flags:** `debug_mode_flag_on`, `ironman_flag_off`, `diff_economy_flag_change`

Binary format:
```
u32 entry_count
For each entry:
  u16 owner_id
  u32 info_count
  For each info portion:
    stringZ info_id (null-terminated)
```

### Registry 1: Relations

**Type:** `CALifeAbstractRegistry<u16, RELATION_DATA>`

Per-character personal + community relations.

Actor had 0 personal relations and 32 community (faction) relations. Most at 0 except: community 5: -290, community 7: +50, community 13: +704, community 14: -40.

Binary format:
```
u32 entry_count
For each entry:
  u16 owner_id
  RELATION_DATA:
    u32 personal_count
    For each: u16 target_id, s32 goodwill
    u32 community_count
    For each: s32 community_index, s32 goodwill
```

### Registry 2: GameNews

**Type:** `CALifeAbstractRegistry<u16, GAME_NEWS_VECTOR>`

Test save: 1 owner (ID 65535 = system), 724 news items. Each item: `show_time(u32)`, `caption(stringZ)`, `text(stringZ)`, `receive_time(u64)`, `texture_name(stringZ)`.

### Registry 3: SpecificCharacter

**Type:** `CALifeAbstractRegistry<shared_str, int>`

Maps character profile strings to integers (all value=1). Test save: 2,051 entries covering all spawned NPCs.

### Registry 4: MapLocations

**Type:** `CALifeAbstractRegistry<u16, vector<SLocationKey>>`

Discovered map markers. Test save: 1 owner (ID 1), 147 map locations (level changers, spots, etc.).

### Registries 5-6: GameTasks and ActorStatistics

Exist but weren't fully parsed due to complex CMapLocation struct preceding them.

---

## Coordinate Data

Every object in the .scop object registry (chunk 2) has world position coordinates (`o_Position`: 3x float32).

| Object Type | Count | Has Position | Notes |
|-------------|-------|-------------|-------|
| Smart terrains | 519 | Yes | 477 generic `smart_terrain`, 42 named with level prefix |
| Campfires | 394 | Yes | |
| Level changers | 124 | Yes | |
| Fast travel zones | 35 | Yes | |
| Actor | 1 | Yes | Player position (-134.5, 1.5, 280.6 in test save) |

**Coordinate space:** Game world coordinates (per-level local 3D space). NOT the same as map pixel space.

**Map pixel space:** 1024x2634 pixels, defined in `game_maps_single.ltx`. Each level has a `global_rect` in this space. Level bounds are pre-computed in `site/public/data/map-levels.json` as normalized 0-1 coordinates.

**Transform needed:** To plot individual objects within a level on the map, a per-level game-to-pixel coordinate transform is needed. This has not yet been derived. The smart terrain positions from saves could serve as reference points to compute the mapping.

**Not needed for MVP:** The `actor_visited_levels` data maps directly to level IDs in `map-levels.json` — no coordinate transform required for fog-of-war overlay.

---

## Recommended Map Features (by data quality)

### Tier 1 — Clean data, direct mapping to map

| Feature | Data Source | Notes |
|---------|------------|-------|
| Fog of war (visited/unvisited zones) | `game_statistics.actor_visited_levels` | Level IDs map directly to `map-levels.json` bounds |
| Visited smart terrain pins | `game_statistics.actor_visited_smarts` | Named locations within levels |
| Stash discovery % per zone | `treasure_manager.caches` | 1,182 stashes, need stash-to-level mapping |
| Stats HUD overlay | `game_statistics.actor_statistics` | Global totals for kills, tasks, artifacts, etc. |

### Tier 2 — Good data, needs some mapping work

| Feature | Data Source | Notes |
|---------|------------|-------|
| Quest completion overlay | `task_info` | Need task-to-level mapping |
| Faction standing by region | Chunk 9 Relations registry | Need community index → faction name mapping |
| Fast travel discovered | `fast_travel_system` | 35 zones with names |
| Achievement badges | `game_statistics.actor_achievements` | 24 tracked |

### Tier 3 — Nice-to-have

| Feature | Data Source | Notes |
|---------|------------|-------|
| Skills/perks panel | `skills_levels` | 4 skills with XP progression |
| Crafting progress | `known_recipe` | Recipe discovery tracking |
| Campfire markers | `visited_campfires` | Needs coordinate transform to plot |
| Kill journal | `milpda.tracked_bodies` | Capped recent kills only, level granularity |
| Faction reputation panel | `milpda.faction_data` | 13 factions with progress |

---

## Source References

| File | Contents |
|------|----------|
| `site/js/scop-parser.js` | Browser .scop parser (objects, inventory) |
| `site/js/scoc-parser.js` | Browser .scoc parser (belt, active slot) |
| `scripts/dump-save.mjs` | CLI dump tool with full progression output |
| `site/public/data/map-levels.json` | Level bounds in normalized coordinates |
| `game_maps_single.ltx` | Level global_rect definitions (1024x2634 space) |
| `docs/stalker-anomaly-save-format.md` | Binary format reference |
