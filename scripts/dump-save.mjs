#!/usr/bin/env node
/**
 * Dump save file contents for debugging.
 *
 * Usage:
 *   node scripts/dump-save.mjs <path-to-save.scop> [path-to-save.scoc]
 *   node scripts/dump-save.mjs <path-to-save.scoc>
 *
 * If given a .scop file, dumps actor inventory, stashes, NPC summary, and world items.
 * If a .scoc file is also provided (or given alone), dumps Lua script state.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

// Load browser-global modules via Function constructor (ESM-safe)
const lzoSrc = fs.readFileSync(path.join(root, "site/js/lzo1x.js"), "utf8");
const scopSrc = fs.readFileSync(path.join(root, "site/js/scop-parser.js"), "utf8");
const scocSrc = fs.readFileSync(path.join(root, "site/js/scoc-parser.js"), "utf8");
const LZO1X = new Function(lzoSrc + "\nreturn LZO1X;")();
const ScopParser = new Function("LZO1X", scopSrc + "\nreturn ScopParser;")(LZO1X);
const ScocParser = new Function(scocSrc + "\nreturn ScocParser;")();

// Load game data
const index = JSON.parse(fs.readFileSync(path.join(root, "site/public/data/gamma-0.9.5/index.json"), "utf8"));
const translations = JSON.parse(fs.readFileSync(path.join(root, "site/public/data/gamma-0.9.5/translations.json"), "utf8"));
const catMap = {};
for (const entry of index) catMap[entry.id] = entry.category;
const knownIds = new Set(index.map(e => e.id));

// Load weapon data for ammo type resolution
const weaponData = {};
for (const slug of ["rifles", "shotguns", "smgs", "snipers", "launchers", "pistols", "melee"]) {
    const d = JSON.parse(fs.readFileSync(path.join(root, `site/public/data/gamma-0.9.5/${slug}.json`), "utf8"));
    for (const item of d.items) weaponData[item.id] = item;
}

function itemName(sectionName) {
    const entry = index.find(e => e.id === sectionName);
    if (!entry) return sectionName;
    return translations.en?.[entry.name] || entry.displayName || sectionName;
}

function resolveBase(section) {
    if (knownIds.has(section)) return section;
    const idx = section.indexOf("_wpn_addon_");
    if (idx > 0) {
        const base = section.substring(0, idx);
        if (knownIds.has(base)) return base;
    }
    // Progressively strip trailing _segment parts to find longest known base
    let end = section.length;
    while (true) {
        end = section.lastIndexOf("_", end - 1);
        if (end <= 0) break;
        const candidate = section.substring(0, end);
        if (knownIds.has(candidate)) return candidate;
    }
    return section;
}

function resolveAmmoName(weaponSection, ammoTypeIndex) {
    const base = resolveBase(weaponSection);
    const wpn = weaponData[base];
    if (!wpn || ammoTypeIndex < 0) return null;
    const types = (wpn.ui_ammo_types || "").split(";").filter(Boolean);
    const alt = (wpn.st_data_export_ammo_types_alt || "").split(";").filter(Boolean);
    const allTypes = [...types, ...alt];
    if (ammoTypeIndex >= allTypes.length) return `index ${ammoTypeIndex}`;
    const ammoId = allTypes[ammoTypeIndex].replace(/-/g, "_");
    return `${itemName(ammoId)} (${ammoId})`;
}

// --- Determine files ---

let scopPath = null;
let scocPath = null;

for (const arg of process.argv.slice(2)) {
    const lower = arg.toLowerCase();
    if (lower.endsWith(".scop")) scopPath = arg;
    else if (lower.endsWith(".scoc")) scocPath = arg;
    else {
        console.error(`Unknown file type: ${arg}`);
        console.error("Usage: node scripts/dump-save.mjs <save.scop> [save.scoc]");
        process.exit(1);
    }
}

if (!scopPath && !scocPath) {
    console.error("Usage: node scripts/dump-save.mjs <save.scop> [save.scoc]");
    process.exit(1);
}

// --- .scoc dump ---

if (scocPath) {
    dumpScoc(scocPath);
}

// --- .scop dump ---

if (scopPath) {
    // Auto-detect matching .scoc if not provided
    if (!scocPath) {
        const candidate = scopPath.replace(/\.scop$/i, ".scoc");
        if (fs.existsSync(candidate)) {
            console.log(`(Auto-detected .scoc: ${path.basename(candidate)})`);
            console.log();
            scocPath = candidate;
            dumpScoc(scocPath);
        }
    }

    dumpScop(scopPath, scocPath);
}

// =============================================
// .scoc dump
// =============================================

function dumpScoc(filePath) {
    const raw = fs.readFileSync(filePath);
    const buffer = raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.length);

    console.log(`============================`);
    console.log(`  .scoc: ${path.basename(filePath)} (${raw.length} bytes)`);
    console.log(`============================`);

    // Parse with ScocParser for structured data
    const parsed = ScocParser.parse(buffer);
    console.log();
    console.log(`  Active slot: ${parsed.activeSlot} (${slotName(parsed.activeSlot)})`);
    console.log(`  Belt item IDs: ${[...parsed.beltItemIds].join(", ") || "(none)"}`);

    // Also do a full root table dump for interesting keys
    const data = new Uint8Array(buffer);
    const state = { data, pos: 1 };
    const rootTable = readLuaValue(state);

    if (rootTable && typeof rootTable === "object") {
        const keys = Object.keys(rootTable);
        console.log(`  Root keys (${keys.length}): ${keys.join(", ")}`);
        console.log();

        // game_object[0] — actor
        const go = rootTable["game_object"];
        if (go && go["0"]) {
            const actor = go["0"];
            console.log(`  game_object[0]:`);
            console.log(`    name: ${actor.name || "(none)"}`);
            if (actor.actor_binder) {
                console.log(`    actor_binder:`);
                for (const [k, v] of Object.entries(actor.actor_binder)) {
                    console.log(`      ${k}: ${JSON.stringify(v)}`);
                }
            }
            if (actor.pstor_all) {
                console.log(`    pstor_all (${Object.keys(actor.pstor_all).length} keys):`);
                for (const [k, v] of Object.entries(actor.pstor_all).slice(0, 20)) {
                    console.log(`      ${k}: ${v}`);
                }
                if (Object.keys(actor.pstor_all).length > 20) {
                    console.log(`      ... and ${Object.keys(actor.pstor_all).length - 20} more`);
                }
            }
        }

        // beltMemory
        const belt = rootTable["beltMemory"];
        if (belt && typeof belt === "object") {
            console.log();
            console.log(`  beltMemory:`);
            for (const [outfitId, entry] of Object.entries(belt)) {
                const items = entry?.items ? Object.keys(entry.items) : [];
                console.log(`    outfit ID ${outfitId}: ${items.length} items [${items.join(", ")}]`);
            }
        }

        // item_condition
        const cond = rootTable["item_condition"];
        if (cond && typeof cond === "object") {
            const entries = Object.entries(cond);
            console.log();
            console.log(`  item_condition (${entries.length} entries):`);
            for (const [id, val] of entries.slice(0, 15)) {
                console.log(`    ID ${id}: ${typeof val === "number" ? (val * 100).toFixed(1) + "%" : val}`);
            }
            if (entries.length > 15) console.log(`    ... and ${entries.length - 15} more`);
        }

        // item_remaining_uses
        const uses = rootTable["item_remaining_uses"];
        if (uses && typeof uses === "object") {
            const entries = Object.entries(uses);
            console.log();
            console.log(`  item_remaining_uses (${entries.length} entries):`);
            for (const [id, val] of entries.slice(0, 15)) {
                console.log(`    ID ${id}: ${val}`);
            }
            if (entries.length > 15) console.log(`    ... and ${entries.length - 15} more`);
        }

        // mags_storage
        const mags = rootTable["mags_storage"];
        if (mags && typeof mags === "object") {
            const entries = Object.entries(mags);
            console.log();
            console.log(`  mags_storage (${entries.length} entries):`);
            for (const [id, val] of entries.slice(0, 10)) {
                console.log(`    ID ${id}: ${JSON.stringify(val).slice(0, 120)}`);
            }
            if (entries.length > 10) console.log(`    ... and ${entries.length - 10} more`);
        }

        // game_statistics
        const stats = rootTable["game_statistics"];
        if (stats && typeof stats === "object") {
            console.log();
            console.log(`  game_statistics:`);
            for (const [k, v] of Object.entries(stats)) {
                if (typeof v !== "object") console.log(`    ${k}: ${v}`);
                else console.log(`    ${k}: {${Object.keys(v).length} keys}`);
            }
        }

        // SurgeManager / PsiStormManager
        for (const mgr of ["SurgeManager", "PsiStormManager"]) {
            const data = rootTable[mgr];
            if (data && typeof data === "object") {
                console.log();
                console.log(`  ${mgr}:`);
                for (const [k, v] of Object.entries(data)) {
                    console.log(`    ${k}: ${JSON.stringify(v).slice(0, 100)}`);
                }
            }
        }

        // =============================================
        // PROGRESSION DATA
        // =============================================
        console.log();
        console.log(`  ============================`);
        console.log(`    PROGRESSION`);
        console.log(`  ============================`);

        // Faction
        const faction = rootTable["default_faction"];
        if (faction) console.log(`\n  Faction: ${faction}`);

        // Actor statistics summary
        if (stats?.actor_statistics && typeof stats.actor_statistics === "object") {
            console.log();
            console.log(`  Actor Statistics:`);
            for (const [k, v] of Object.entries(stats.actor_statistics)) {
                console.log(`    ${k}: ${v}`);
            }
        }

        // Visited levels
        if (stats?.actor_visited_levels && typeof stats.actor_visited_levels === "object") {
            const levels = Object.entries(stats.actor_visited_levels);
            const visited = levels.filter(([, v]) => v === true || v === 1);
            const unvisited = levels.filter(([, v]) => !v && v !== true);
            console.log();
            console.log(`  Visited Levels (${visited.length}/${levels.length}):`);
            for (const [name] of visited.sort()) console.log(`    ✓ ${name}`);
            if (unvisited.length <= 20) {
                console.log(`  Unvisited:`);
                for (const [name] of unvisited.sort()) console.log(`    · ${name}`);
            }
        }

        // Visited smart terrains
        if (stats?.actor_visited_smarts && typeof stats.actor_visited_smarts === "object") {
            const smarts = Object.entries(stats.actor_visited_smarts);
            const visited = smarts.filter(([, v]) => v === true || v === 1);
            console.log();
            console.log(`  Visited Smart Terrains (${visited.length}/${smarts.length}):`);
            // Group by level prefix
            const byLevel = {};
            for (const [name] of visited) {
                const prefix = name.match(/^([a-z]+\d*[a-z]*_)/)?.[1] || "other_";
                if (!byLevel[prefix]) byLevel[prefix] = [];
                byLevel[prefix].push(name);
            }
            for (const [prefix, names] of Object.entries(byLevel).sort()) {
                console.log(`    ${prefix}: ${names.length} (${names.sort().join(", ")})`);
            }
        }

        // Achievements
        if (stats?.actor_achievements && typeof stats.actor_achievements === "object") {
            const achievements = Object.entries(stats.actor_achievements);
            const unlocked = achievements.filter(([, v]) => v === true || v === 1);
            console.log();
            console.log(`  Achievements (${unlocked.length}/${achievements.length}):`);
            for (const [name] of unlocked.sort()) console.log(`    ★ ${name}`);
        }

        // Task/quest completion
        const taskInfo = rootTable["task_info"];
        if (taskInfo && typeof taskInfo === "object") {
            const tasks = Object.keys(taskInfo);
            console.log();
            console.log(`  Completed Tasks (${tasks.length}):`);
            for (const name of tasks.sort()) console.log(`    ✓ ${name}`);
        }

        // Treasure/stash discovery
        const treasure = rootTable["treasure_manager"];
        if (treasure && typeof treasure === "object") {
            const total = treasure.caches_count || 0;
            const caches = treasure.caches && typeof treasure.caches === "object" ? Object.entries(treasure.caches) : [];
            const found = caches.filter(([, v]) => v === true || v === 1);
            console.log();
            console.log(`  Stash Discovery: ${found.length}/${total} found (${total ? ((found.length / total) * 100).toFixed(1) : 0}%)`);
            if (found.length > 0 && found.length <= 50) {
                for (const [id] of found) console.log(`    found: stash ${id}`);
            }
        }

        // Fast travel discovery
        const fastTravel = rootTable["fast_travel_system"];
        if (fastTravel && typeof fastTravel === "object") {
            const found = fastTravel.locations_found || 0;
            const zones = fastTravel.spawned_zones && typeof fastTravel.spawned_zones === "object" ? Object.keys(fastTravel.spawned_zones) : [];
            console.log();
            console.log(`  Fast Travel: ${found}/${zones.length} locations discovered`);
            if (fastTravel.spawned_zones) {
                for (const [id, zone] of Object.entries(fastTravel.spawned_zones)) {
                    const name = typeof zone === "object" ? (zone.name || zone.location || id) : id;
                    console.log(`    ${name}`);
                }
            }
        }

        // Visited campfires
        const campfires = rootTable["visited_campfires"];
        if (campfires && typeof campfires === "object") {
            const ids = Object.keys(campfires);
            console.log();
            console.log(`  Visited Campfires: ${ids.length} (IDs: ${ids.join(", ")})`);
        }

        // Skills
        const skills = rootTable["skills_levels"];
        if (skills && typeof skills === "object") {
            console.log();
            console.log(`  Skills:`);
            for (const [name, data] of Object.entries(skills)) {
                if (typeof data === "object") {
                    const lvl = data.current_level ?? data.level ?? "?";
                    const maxLvl = data.max_level ?? "?";
                    const xp = data.experience ?? 0;
                    const req = data.requirement ?? "?";
                    console.log(`    ${name}: level ${lvl}/${maxLvl} (xp: ${xp}/${req})`);
                } else {
                    console.log(`    ${name}: ${data}`);
                }
            }
        }

        // Known recipes
        const recipes = rootTable["known_recipe"];
        if (recipes && typeof recipes === "object") {
            const names = Object.keys(recipes);
            console.log();
            console.log(`  Known Recipes (${names.length}): ${names.sort().join(", ")}`);
        }

        // Encyclopedia articles
        const articles = rootTable["drx_da_opened_articles"];
        if (articles && typeof articles === "object") {
            let count = 0;
            const flatArticles = [];
            for (const [cat, entries] of Object.entries(articles)) {
                if (typeof entries === "object") {
                    const names = Object.keys(entries);
                    count += names.length;
                    flatArticles.push(`${cat}: ${names.length}`);
                }
            }
            console.log();
            console.log(`  Encyclopedia Articles (${count}): ${flatArticles.join(", ")}`);
        }

        // Looted bodies/containers
        const looted = rootTable["looted"];
        if (looted && typeof looted === "object") {
            console.log();
            console.log(`  Looted Containers: ${Object.keys(looted).length}`);
        }

        // Stealth kills
        const stealthKills = rootTable["stealth_kills"];
        if (stealthKills && typeof stealthKills === "object") {
            const victims = stealthKills.victims && typeof stealthKills.victims === "object" ? Object.keys(stealthKills.victims) : [];
            console.log();
            console.log(`  Stealth Kills: ${victims.length}`);
        }

        // MilPDA tracked bodies (kill journal)
        const milpda = rootTable["milpda"];
        if (milpda && typeof milpda === "object") {
            const bodies = milpda.tracked_bodies && typeof milpda.tracked_bodies === "object" ? Object.entries(milpda.tracked_bodies) : [];
            const factions = milpda.faction_data && typeof milpda.faction_data === "object" ? Object.entries(milpda.faction_data) : [];
            console.log();
            console.log(`  MilPDA:`);
            console.log(`    Tracked kills: ${bodies.length}`);
            if (bodies.length > 0) {
                for (const [id, body] of bodies.slice(0, 10)) {
                    if (typeof body === "object") {
                        const level = body.level_name || body.level || "?";
                        const community = body.community || "?";
                        console.log(`      ${community} @ ${level}`);
                    }
                }
                if (bodies.length > 10) console.log(`      ... and ${bodies.length - 10} more`);
            }
            if (factions.length > 0) {
                console.log(`    Faction standings (${factions.length}):`);
                for (const [name, data] of factions) {
                    if (typeof data === "object") {
                        const blacklisted = data.blacklisted ? " [BLACKLISTED]" : "";
                        const progress = data.progress ?? "";
                        console.log(`      ${name}: progress=${progress}${blacklisted}`);
                    }
                }
            }
        }
    }
    console.log();
}

function slotName(slot) {
    const names = { 0: "knife", 1: "pistol", 2: "primary", 3: "secondary", 4: "grenade", 5: "binoculars", 7: "detector", 12: "outfit", 13: "helmet" };
    return names[slot] || `slot ${slot}`;
}

// Minimal Lua marshal reader (duplicated from scoc-parser for standalone use)
function readLuaValue(state) {
    const { data } = state;
    if (state.pos >= data.length) return null;
    const tag = data[state.pos++];
    if (tag === 0x00) return null;
    if (tag === 0x01) return data[state.pos++] !== 0;
    if (tag === 0x03) {
        const view = new DataView(data.buffer, data.byteOffset + state.pos, 8);
        state.pos += 8;
        return view.getFloat64(0, true);
    }
    if (tag === 0x04) {
        const len = data[state.pos] | (data[state.pos+1]<<8) | (data[state.pos+2]<<16) | (data[state.pos+3]<<24);
        state.pos += 4;
        let s = "";
        for (let i = 0; i < len; i++) s += String.fromCharCode(data[state.pos + i]);
        state.pos += len;
        return s;
    }
    if (tag === 0x05) {
        state.pos++; // subtype
        const dataSize = data[state.pos] | (data[state.pos+1]<<8) | (data[state.pos+2]<<16) | (data[state.pos+3]<<24);
        state.pos += 4;
        const end = state.pos + dataSize;
        const result = {};
        while (state.pos < end) {
            const key = readLuaValue(state);
            if (key === null) break;
            const val = readLuaValue(state);
            result[String(key)] = val;
        }
        state.pos = end;
        return result;
    }
    return undefined;
}

// =============================================
// .scop dump
// =============================================

function dumpScop(filePath, scocFilePath) {
    const raw = fs.readFileSync(filePath);
    const buffer = raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.length);
    const view = new DataView(buffer);

    const marker = view.getUint32(0, true);
    const version = view.getUint32(4, true);
    const uncompressedSize = view.getUint32(8, true);

    console.log(`============================`);
    console.log(`  .scop: ${path.basename(filePath)}`);
    console.log(`============================`);
    console.log(`  Marker: 0x${marker.toString(16)}, Version: ${version}`);
    console.log(`  Compressed: ${raw.length - 12} bytes, Uncompressed: ${uncompressedSize} bytes`);
    console.log();

    const compressed = new Uint8Array(buffer, 12);
    const data = LZO1X.decompress(compressed, uncompressedSize);

    // Load .scoc for belt/equipped info if available
    let beltItemIds = null;
    if (scocFilePath) {
        try {
            const scocRaw = fs.readFileSync(scocFilePath);
            const scocBuf = scocRaw.buffer.slice(scocRaw.byteOffset, scocRaw.byteOffset + scocRaw.length);
            const scocData = ScocParser.parse(scocBuf);
            beltItemIds = scocData.beltItemIds;
        } catch (e) { /* ignore */ }
    }

    // List chunks
    let pos = 0;
    const chunkNames = { 0: "alife_simulator_header", 1: "alife_spawn_registry", 2: "alife_object_registry", 5: "alife_time_manager", 9: "alife_registry_container" };
    let objData;
    console.log("  Chunks:");
    while (pos + 8 <= data.length) {
        const rawId = (data[pos] | (data[pos+1]<<8) | (data[pos+2]<<16) | (data[pos+3]<<24)) >>> 0;
        const size = (data[pos+4] | (data[pos+5]<<8) | (data[pos+6]<<16) | (data[pos+7]<<24)) >>> 0;
        const id = rawId & 0x7FFFFFFF;
        const compressed = (rawId & 0x80000000) !== 0;
        const name = chunkNames[id] || `chunk_${id}`;
        console.log(`    ${name} (id=${id}${compressed ? " LZHUF" : ""}) — ${size} bytes`);
        if (id === 2) objData = data.subarray(pos + 8, pos + 8 + size);
        pos += 8 + size;
    }
    console.log();

    if (!objData) { console.error("  Could not find object registry (chunk 2)"); return; }

    // Parse all objects
    const objCount = (objData[0] | (objData[1]<<8) | (objData[2]<<16) | (objData[3]<<24)) >>> 0;
    console.log(`  Total objects: ${objCount}`);

    pos = 4;
    const allObjects = [];
    const sectionById = {};

    function readU16(d, o) { return d[o] | (d[o+1]<<8); }
    function readU32(d, o) { return (d[o] | (d[o+1]<<8) | (d[o+2]<<16) | (d[o+3]<<24)) >>> 0; }
    function findNull(d, s, e) { for (let i = s; i < e; i++) if (d[i] === 0) return i; return -1; }
    function readF32(d, o) { return new DataView(d.buffer, d.byteOffset + o, 4).getFloat32(0, true); }

    for (let i = 0; i < objCount && pos < objData.length; i++) {
        const spawnSize = readU16(objData, pos); pos += 2;
        const spawnEnd = pos + spawnSize;

        let section = null, objId = null, parentId = null, ammoTypeIndex = -1, condition = -1;
        let p = pos;
        const msgType = readU16(objData, p); p += 2;
        if (msgType === 1) {
            let secEnd = p;
            while (secEnd < spawnEnd && objData[secEnd] !== 0) secEnd++;
            section = "";
            for (let j = p; j < secEnd; j++) section += String.fromCharCode(objData[j]);
            p = secEnd + 1;
            while (p < spawnEnd && objData[p] !== 0) p++;
            p++;
            p += 2 + 24 + 2;
            objId = readU16(objData, p); p += 2;
            parentId = readU16(objData, p); p += 2;

            // Parse STATE for weapon ammo_type and condition
            try {
                p += 10; // phantom, flags, ver, gametype, scriptver
                const cdSize = readU16(objData, p); p += 2;
                p += cdSize;
                p += 2; // spawnID
                const stateSize = readU16(objData, p); p += 2;
                if (stateSize >= 30) {
                    const stateEnd = p + stateSize;
                    let sp = p + 18; // skip CSE_ALifeObject fixed fields
                    const iniNull = findNull(objData, sp, stateEnd);
                    if (iniNull >= 0) {
                        sp = iniNull + 1 + 8; // skip ini_string + story_ids
                        const visNull = findNull(objData, sp, stateEnd);
                        if (visNull >= 0) {
                            sp = visNull + 1 + 1; // skip visual + flags byte
                            if (sp + 8 <= stateEnd) {
                                condition = readF32(objData, sp); sp += 4;
                                const upgCount = readU32(objData, sp); sp += 4;
                                for (let u = 0; u < upgCount && sp < stateEnd; u++) {
                                    const uNull = findNull(objData, sp, stateEnd);
                                    if (uNull < 0) break;
                                    sp = uNull + 1;
                                }
                                if (sp + 7 <= stateEnd) {
                                    sp += 6; // a_current + a_elapsed + wpn_state + addon_flags
                                    ammoTypeIndex = objData[sp];
                                }
                            }
                        }
                    }
                }
            } catch (e) { /* best effort */ }
        }

        pos = spawnEnd;
        const updateSize = readU16(objData, pos); pos += 2;
        pos += updateSize;

        if (section !== null) {
            allObjects.push({ section, id: objId, parentId, ammoTypeIndex, condition });
            sectionById[objId] = section;
        }
    }

    // --- Actor Inventory ---

    const actorItems = allObjects.filter(o => o.parentId === 0 && o.id !== 0);
    console.log();
    console.log(`  ============================`);
    console.log(`    ACTOR INVENTORY (${actorItems.length} items)`);
    console.log(`  ============================`);

    const actorByCategory = {};
    for (const obj of actorItems) {
        const base = resolveBase(obj.section);
        const cat = catMap[base] || "(unknown)";
        if (!actorByCategory[cat]) actorByCategory[cat] = [];
        actorByCategory[cat].push({ ...obj, base });
    }

    const weaponCats = new Set(["Rifles", "Shotguns", "SMGs", "Snipers", "Launchers", "Pistols", "Melee"]);

    for (const [cat, items] of Object.entries(actorByCategory).sort((a, b) => a[0].localeCompare(b[0]))) {
        console.log();
        console.log(`    ${cat}:`);
        const counts = {};
        for (const item of items) {
            const key = item.base;
            if (!counts[key]) counts[key] = { base: key, section: item.section, count: 0, ids: [], ammoTypeIndex: item.ammoTypeIndex, condition: item.condition };
            counts[key].count++;
            counts[key].ids.push(item.id);
        }
        for (const entry of Object.values(counts)) {
            const name = itemName(entry.base);
            const countStr = entry.count > 1 ? ` x${entry.count}` : "";
            const condStr = entry.condition >= 0 ? `  ${(entry.condition * 100).toFixed(1)}%` : "";
            const addonStr = entry.section !== entry.base ? `  (${entry.section})` : "";
            let ammoStr = "";
            if (weaponCats.has(cat) && entry.ammoTypeIndex >= 0) {
                const resolved = resolveAmmoName(entry.section, entry.ammoTypeIndex);
                if (resolved) ammoStr = `  loaded: ${resolved}`;
            }
            const beltStr = beltItemIds && entry.ids.some(id => beltItemIds.has(id)) ? "  [EQUIPPED]" : "";
            console.log(`      ${name}${countStr}  [${entry.base}]${condStr}${ammoStr}${addonStr}${beltStr}  IDs: ${entry.ids.join(", ")}`);
        }
    }

    // --- Player Stash ---

    const STASH_SECTIONS = new Set(["workshop_stash"]);
    const stashContainerIds = new Set();
    for (const obj of allObjects) {
        if (STASH_SECTIONS.has(obj.section)) stashContainerIds.add(obj.id);
    }

    const stashItems = allObjects.filter(o => stashContainerIds.has(o.parentId));

    if (stashItems.length) {
        console.log();
        console.log(`  ============================`);
        console.log(`    PLAYER STASH (${stashItems.length} items)`);
        console.log(`  ============================`);

        const byParent = {};
        for (const item of stashItems) {
            if (!byParent[item.parentId]) byParent[item.parentId] = [];
            byParent[item.parentId].push(item);
        }

        for (const [parentId, items] of Object.entries(byParent).sort((a, b) => b[1].length - a[1].length)) {
            const parentSection = sectionById[parentId] || "(unknown)";
            console.log();
            console.log(`    ${parentSection} (ID ${parentId}) — ${items.length} items:`);
            for (const item of items) {
                const base = resolveBase(item.section);
                const cat = catMap[base];
                const name = itemName(base);
                const catLabel = cat ? ` [${cat}]` : "";
                const known = knownIds.has(base) ? "" : " (NOT IN DB)";
                const condStr = item.condition >= 0 ? `  ${(item.condition * 100).toFixed(1)}%` : "";
                const addonStr = item.section !== base ? `  (${item.section})` : "";
                let ammoStr = "";
                if (cat && weaponCats.has(cat) && item.ammoTypeIndex >= 0) {
                    const resolved = resolveAmmoName(item.section, item.ammoTypeIndex);
                    if (resolved) ammoStr = `  loaded: ${resolved}`;
                }
                console.log(`      ${name}${catLabel}${condStr}${ammoStr}${addonStr}${known}  — ${item.section} ID=${item.id}`);
            }
        }
    }

    // --- Other stash-like containers ---

    const STASH_PATTERNS = ["inv_box", "crate", "toolbox", "locker", "safe", "case"];
    const otherContainerIds = new Set();
    for (const obj of allObjects) {
        if (!STASH_SECTIONS.has(obj.section) && STASH_PATTERNS.some(p => obj.section.includes(p))) {
            otherContainerIds.add(obj.id);
        }
    }
    const otherStashItems = allObjects.filter(o => otherContainerIds.has(o.parentId));
    if (otherStashItems.length) {
        console.log();
        console.log(`  ============================`);
        console.log(`    OTHER CONTAINERS (${otherStashItems.length} items in ${otherContainerIds.size} containers)`);
        console.log(`  ============================`);
        const byParent = {};
        for (const item of otherStashItems) {
            if (!byParent[item.parentId]) byParent[item.parentId] = [];
            byParent[item.parentId].push(item);
        }
        for (const [parentId, items] of Object.entries(byParent).sort((a, b) => b[1].length - a[1].length)) {
            const parentSection = sectionById[parentId] || "(unknown)";
            console.log(`    ${parentSection} (ID ${parentId}): ${items.length} items`);
        }
    }

    // --- NPC inventories summary ---

    const allContainerIds = new Set([...stashContainerIds, ...otherContainerIds]);
    const npcItems = allObjects.filter(o => o.parentId !== 0 && o.parentId !== 0xFFFF && !allContainerIds.has(o.parentId) && o.id !== 0);
    const npcParents = {};
    for (const item of npcItems) {
        const parentSec = sectionById[item.parentId] || "(unknown)";
        if (!npcParents[parentSec]) npcParents[parentSec] = 0;
        npcParents[parentSec]++;
    }

    console.log();
    console.log(`  ============================`);
    console.log(`    NPC INVENTORIES (${npcItems.length} items, ${Object.keys(npcParents).length} NPCs)`);
    console.log(`  ============================`);
    console.log();
    for (const [sec, count] of Object.entries(npcParents).sort((a, b) => b[1] - a[1]).slice(0, 30)) {
        console.log(`    ${sec}: ${count} items`);
    }
    if (Object.keys(npcParents).length > 30) {
        console.log(`    ... and ${Object.keys(npcParents).length - 30} more`);
    }

    // --- World items ---

    const worldItems = allObjects.filter(o => o.parentId === 0xFFFF && knownIds.has(resolveBase(o.section)));
    console.log();
    console.log(`  ============================`);
    console.log(`    WORLD/GROUND ITEMS (${worldItems.length} known items)`);
    console.log(`  ============================`);
    const worldByCategory = {};
    for (const obj of worldItems) {
        const cat = catMap[resolveBase(obj.section)] || "(unknown)";
        worldByCategory[cat] = (worldByCategory[cat] || 0) + 1;
    }
    console.log();
    for (const [cat, count] of Object.entries(worldByCategory).sort((a, b) => b[1] - a[1])) {
        console.log(`    ${cat}: ${count}`);
    }
}
