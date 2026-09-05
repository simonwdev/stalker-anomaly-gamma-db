# Stalker DB (in-game)

Item catalog for Anomaly / GAMMA / Grim Raid. One MO2 zip per pack. Pick a language in the installer (English, Russian, French).

`STALKER_DB.open` is the API. Call it from `on_game_start` or `on_game_load`. Same id always returns the same handle. A new id after load finishes returns nil. Do not invent a new id every call.

```lua
local db

function on_game_start()
    db = STALKER_DB.open("cool_mod")
end

local row = db.get("wpn_ak74")
if db.is(sec, "weapons") then
end
local pistols = db.list("pistols")
local rec = db.craft(sec)
```

The handle also has `json`, `is_any`, and `translate`.

## Build

```bash
npm run pack-mod -- --release --out dist/mod
```

CI opens a draft when `site/public/data/` changes. Publish it by hand. Same data as the last draft or release is a no-op.

## Version

UTC stamp. Tag `v2026-08-30-2214`. Zip and `meta.ini` use `2026.08.30-2214` so MO2 keeps the day and time.
