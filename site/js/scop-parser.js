/**
 * S.T.A.L.K.E.R. Anomaly .scop save file parser.
 *
 * Parses LZO1X-compressed save files and extracts actor inventory items.
 * Requires LZO1X global (from lzo1x.js).
 *
 * Format reference: docs/stalker-anomaly-save-format.md
 */
const ScopParser = (() => {
    "use strict";

    const ALIFE_VERSION = 6;
    const OBJECT_CHUNK_ID = 2;
    const CFS_COMPRESS_MARK = 0x80000000;
    const M_SPAWN = 1;
    const NO_PARENT = 0xFFFF;
    const ACTOR_ID = 0;
    const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

    const STASH_SECTIONS = new Set(["workshop_stash"]);

    /**
     * Parse a .scop file and extract actor inventory and stash items.
     *
     * @param {ArrayBuffer} buffer   Raw .scop file contents.
     * @param {Set<string>} knownIds Set of known item section names from index.json.
     * @returns {{ items: Array<{sectionName: string, id: number}>,
     *             stashItems: Array<{sectionName: string, id: number}>,
     *             objectCount: number }}
     */
    function parse(buffer, knownIds) {
        if (buffer.byteLength > MAX_FILE_SIZE) {
            throw new Error("Save file too large (>50 MB)");
        }
        if (buffer.byteLength < 12) {
            throw new Error("File too small to be a valid save");
        }

        const view = new DataView(buffer);
        const marker = view.getUint32(0, true);
        if (marker !== 0xFFFFFFFF) {
            throw new Error("Not a valid .scop save file (bad header marker)");
        }

        const version = view.getUint32(4, true);
        if (version !== ALIFE_VERSION) {
            throw new Error(`Unsupported save version ${version} (expected ${ALIFE_VERSION})`);
        }

        const uncompressedSize = view.getUint32(8, true);
        const compressed = new Uint8Array(buffer, 12);

        let decompressed;
        try {
            decompressed = globalThis.LZO1X.decompress(compressed, uncompressedSize);
        } catch (e) {
            throw new Error("Failed to decompress save file — it may be corrupted");
        }

        // Walk chunks to find object registry (chunk ID 2)
        const objData = findChunk(decompressed, OBJECT_CHUNK_ID);
        if (!objData) {
            throw new Error("Could not find object registry in save file");
        }

        // Parse object entries
        return parseObjects(objData, knownIds);
    }

    /**
     * Find a chunk by ID in the decompressed IWriter chunk stream.
     */
    function findChunk(data, targetId) {
        let pos = 0;
        while (pos + 8 <= data.length) {
            const rawId = readU32(data, pos);
            const chunkSize = readU32(data, pos + 4);
            const id = rawId & 0x7FFFFFFF;
            const isCompressed = (rawId & CFS_COMPRESS_MARK) !== 0;

            if (id === targetId) {
                const chunkData = data.subarray(pos + 8, pos + 8 + chunkSize);
                if (isCompressed) {
                    // LZHUF compressed chunk — first 4 bytes are uncompressed size
                    // For now, we don't expect the object registry to be LZHUF-compressed
                    // in standard Anomaly saves. If it is, throw a descriptive error.
                    throw new Error("Object registry chunk is LZHUF-compressed (not yet supported)");
                }
                return chunkData;
            }
            pos += 8 + chunkSize;
        }
        return null;
    }

    /**
     * Parse the object registry and extract actor inventory + stash items.
     */
    function parseObjects(data, knownIds) {
        const objectCount = readU32(data, 0);
        let pos = 4;

        // First pass: parse all objects to find stash container IDs
        const allSpawns = [];
        const stashIds = new Set();

        for (let i = 0; i < objectCount && pos < data.length; i++) {
            const spawnSize = readU16(data, pos); pos += 2;
            const spawnEnd = pos + spawnSize;
            const spawn = parseSpawnPacket(data, pos, spawnSize);
            pos = spawnEnd;
            const updateSize = readU16(data, pos); pos += 2;
            pos += updateSize;

            if (spawn) {
                allSpawns.push(spawn);
                if (STASH_SECTIONS.has(spawn.sectionName)) {
                    stashIds.add(spawn.id);
                }
            }
        }

        // Resolve section name: strip addon suffixes to find known base item.
        // Handles both vanilla (_wpn_addon_*) and GAMMA-style (_p1x42, etc.) suffixes.
        function resolveSection(name) {
            if (knownIds.has(name)) return name;
            // Try _wpn_addon_ split first (most specific)
            const addonIdx = name.indexOf("_wpn_addon_");
            if (addonIdx > 0) {
                const base = name.substring(0, addonIdx);
                if (knownIds.has(base)) return base;
            }
            // Progressively strip trailing _segment parts to find longest known base
            let end = name.length;
            while (true) {
                end = name.lastIndexOf("_", end - 1);
                if (end <= 0) break;
                const candidate = name.substring(0, end);
                if (knownIds.has(candidate)) return candidate;
            }
            return null;
        }

        // Second pass: categorize items
        const items = [];
        const stashItems = [];

        for (const spawn of allSpawns) {
            const resolved = resolveSection(spawn.sectionName);
            if (spawn.parentId === ACTOR_ID && spawn.id !== ACTOR_ID && resolved) {
                items.push({ sectionName: resolved, id: spawn.id, ammoTypeIndex: spawn.ammoTypeIndex, equipSlot: spawn.equipSlot });
            } else if (stashIds.has(spawn.parentId) && resolved) {
                stashItems.push({ sectionName: resolved, id: spawn.id, ammoTypeIndex: spawn.ammoTypeIndex, equipSlot: spawn.equipSlot });
            }
        }

        return { items, stashItems, objectCount };
    }

    /**
     * Parse the essential fields from a spawn packet.
     */
    function parseSpawnPacket(data, offset, size) {
        try {
            let p = offset;
            const end = offset + size;

            // u16 M_SPAWN
            const msgType = readU16(data, p); p += 2;
            if (msgType !== M_SPAWN) return null;

            // stringZ section_name
            const secEnd = findNull(data, p, end);
            if (secEnd < 0) return null;
            const sectionName = readStringZ(data, p, secEnd);
            p = secEnd + 1;

            // stringZ name_replace (skip)
            const nameEnd = findNull(data, p, end);
            if (nameEnd < 0) return null;
            p = nameEnd + 1;

            // u8 legacy_gameid + u8 s_RP
            p += 2;

            // vec3 o_Position (12 bytes) + vec3 o_Angle (12 bytes)
            p += 24;

            // u16 RespawnTime
            p += 2;

            // u16 ID
            const id = readU16(data, p); p += 2;

            // u16 ID_Parent
            const parentId = readU16(data, p); p += 2;

            const result = { sectionName, id, parentId, ammoTypeIndex: -1, equipSlot: -1 };

            // Try to extract weapon ammo_type from STATE_Write data
            // Skip: ID_Phantom(2) + s_flags(2) + SPAWN_VERSION(2) + m_gameType(2) + script_server_object_version(2)
            p += 10;
            // client_data_size + client_data
            if (p + 2 > end) return result;
            const cdSize = readU16(data, p); p += 2;
            // Extract equip slot from client_data byte 1:
            // high nibble = inventory slot (0=ruck, 2=weapon1, 3=weapon2, etc.)
            // low nibble: 1=equipped in slot, 3=in ruck
            if (cdSize >= 2) {
                const slotByte = data[p + 1];
                const slot = (slotByte >> 4) & 0x0F;
                const state = slotByte & 0x0F;
                if (slot > 0 && state === 1) {
                    result.equipSlot = slot;
                }
                // state 3 or slot 0 → item is in the ruck (equipSlot stays -1)
            }
            p += cdSize;
            // m_tSpawnID
            p += 2;
            // state_size + STATE_Write data
            if (p + 2 > end) return result;
            const stateSize = readU16(data, p); p += 2;
            if (stateSize < 40) return result;
            // stateEnd may slightly exceed spawn end due to format quirks; use stateSize as limit
            const stateEnd = p + stateSize;

            // Parse STATE to reach weapon ammo_type:
            // CSE_ALifeObject: graphID(2) + dist(4) + directCtrl(4) + nodeID(4) + flags(4) + ini_stringZ + story_id(4) + spawn_story_id(4)
            let sp = p;
            sp += 18; // 2+4+4+4+4
            const iniNullPos = findNull(data, sp, stateEnd);
            if (iniNullPos < 0) return result;
            sp = iniNullPos + 1;
            sp += 8; // story_id + spawn_story_id
            // CSE_ALifeDynamicObjectVisual: visual_write = stringZ + u8 flags
            const visNullPos = findNull(data, sp, stateEnd);
            if (visNullPos < 0) return result;
            sp = visNullPos + 1;
            sp += 1; // visual flags
            // CSE_ALifeInventoryItem: condition(4) + upgrade_count(4) + upgrades[]
            if (sp + 8 > stateEnd) return result;
            sp += 4; // condition
            const upgCount = readU32(data, sp); sp += 4;
            for (let u = 0; u < upgCount && sp < stateEnd; u++) {
                const uNull = findNull(data, sp, stateEnd);
                if (uNull < 0) return result;
                sp = uNull + 1;
            }
            // CSE_ALifeItemWeapon: a_current(2) + a_elapsed(2) + wpn_state(1) + addon_flags(1) + ammo_type(1)
            if (sp + 7 > stateEnd) return result;
            sp += 4; // a_current + a_elapsed
            sp += 2; // wpn_state + addon_flags
            result.ammoTypeIndex = data[sp];

            return result;
        } catch (e) {
            return null; // Skip malformed packets
        }
    }

    // --- Binary helpers ---

    function readU16(data, offset) {
        return data[offset] | (data[offset + 1] << 8);
    }

    function readU32(data, offset) {
        return (data[offset] | (data[offset + 1] << 8) | (data[offset + 2] << 16) | (data[offset + 3] << 24)) >>> 0;
    }

    function findNull(data, start, end) {
        for (let i = start; i < end; i++) {
            if (data[i] === 0) return i;
        }
        return -1;
    }

    function readStringZ(data, start, nullPos) {
        let s = "";
        for (let i = start; i < nullPos; i++) s += String.fromCharCode(data[i]);
        return s;
    }

    return { parse };
})();

if (typeof module !== "undefined" && module.exports) module.exports = ScopParser;
globalThis.ScopParser = ScopParser;
