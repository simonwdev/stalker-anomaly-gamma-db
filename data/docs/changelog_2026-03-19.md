# Changelog — 2026-03-19

- `translation` Faction names in the NPC Drop Sources section now display translated names instead of internal IDs (e.g. "Наёмники" instead of "Killer")
- `translation` Map names in the Stash Drop Locations section now display translated names (e.g. "Агропром" instead of "l03_agroprom")
- `translation` Filter chip labels for effects (e.g. radiation restore, sleepiness) and factions now display in Russian
- `translation` Outfit repair types now have Russian translations: Полевой, Лёгкий, Средний, Тяжёлый, Экзо
- `translation` Added missing Russian translations for column headers and item names (belt slots, BR class, movespeed, etc.)
- `translation` Weapon type column in the table view now shows translated singular names (e.g. "Пистолет" instead of "Pistols")
- `translation` Units now display in Russian (e.g. "кг" instead of "kg", "м/с" instead of "m/s", "выстр/мин" instead of "rpm")
- `translation` Materials view now shows translated source item names and "from" label
- `bugfix` Restored the yellow highlight color for rare stash drop chances
- `bugfix` Long Russian labels in the tile view no longer get cut off — they now wrap to fit the card
- `bugfix` Fixed some weapon names not being translated due to case mismatch (e.g. "MDR_black" now displays as "Desert Tech MDR 7.62x51")
- `bugfix` Removed "nil" placeholder ingredients from artefact recipes
- `infra` Created supplementary_translations.json for manual translations missing from game CSVs
- `infra` Created app_translations.json for all UI string translations using app_ prefixed slug keys
- `infra` Migrated all UI translations from hardcoded JS to data layer — single t() function for all lookups
- `infra` Generate script merges supplementary and app translations into translations.json at build time
- `feature` Arrow key navigation in the detail modal — press Left/Right to browse through filtered items without closing the modal
- `feature` Prev/next arrow buttons on modal edges for mouse-based navigation
