/**
 * S.T.A.L.K.E.R. Anomaly .scoc (Lua marshal) parser.
 *
 * Parses the Lua marshal binary format to extract equipped item data.
 * Specifically reads: beltMemory (artifact belt slots) and
 * game_object[0].actor_binder.active_slot.
 */
const ScocParser = (() => {
    "use strict";

    const TAG_NIL = 0x00;
    const TAG_BOOL = 0x01;
    const TAG_NUMBER = 0x03;
    const TAG_STRING = 0x04;
    const TAG_TABLE = 0x05;
    const MARSHAL_MARKER = 0x8E;

    /**
     * Parse a .scoc file and extract equipped item info.
     * @param {ArrayBuffer} buffer  Raw .scoc file contents.
     * @returns {{ beltItemIds: Set<number>, activeSlot: number }}
     *   beltItemIds: set of object IDs currently in artifact belt slots
     *   activeSlot: active weapon slot number (0=knife, 1=pistol, 2=primary, 3=secondary, etc.)
     */
    function parse(buffer) {
        const data = new Uint8Array(buffer);
        if (data.length < 2 || data[0] !== MARSHAL_MARKER) {
            throw new Error("Not a valid .scoc file");
        }

        const state = { data, pos: 1 };
        const root = readValue(state);
        if (!root || typeof root !== "object") {
            throw new Error("Failed to parse .scoc root table");
        }

        const result = { beltItemIds: new Set(), activeSlot: -1 };

        // Extract active_slot from game_object[0].actor_binder
        const gameObject = root["game_object"];
        if (gameObject && typeof gameObject === "object") {
            const actor = gameObject["0"];
            if (actor && actor["actor_binder"]) {
                const slot = actor["actor_binder"]["active_slot"];
                if (typeof slot === "number") result.activeSlot = slot;
            }
        }

        // Extract beltMemory: { outfitId: { items: { itemId: true, ... } } }
        const beltMemory = root["beltMemory"];
        if (beltMemory && typeof beltMemory === "object") {
            for (const outfitId of Object.keys(beltMemory)) {
                const entry = beltMemory[outfitId];
                if (entry && entry["items"] && typeof entry["items"] === "object") {
                    for (const itemId of Object.keys(entry["items"])) {
                        result.beltItemIds.add(Number(itemId));
                    }
                }
            }
        }

        return result;
    }

    function readValue(state) {
        const { data } = state;
        if (state.pos >= data.length) return null;

        const tag = data[state.pos++];

        if (tag === TAG_NIL) return null;

        if (tag === TAG_BOOL) {
            return data[state.pos++] !== 0;
        }

        if (tag === TAG_NUMBER) {
            const view = new DataView(data.buffer, data.byteOffset + state.pos, 8);
            state.pos += 8;
            return view.getFloat64(0, true);
        }

        if (tag === TAG_STRING) {
            const len = data[state.pos] | (data[state.pos + 1] << 8) |
                        (data[state.pos + 2] << 16) | (data[state.pos + 3] << 24);
            state.pos += 4;
            let s = "";
            for (let i = 0; i < len; i++) s += String.fromCharCode(data[state.pos + i]);
            state.pos += len;
            return s;
        }

        if (tag === TAG_TABLE) {
            const subtype = data[state.pos++];
            const dataSize = data[state.pos] | (data[state.pos + 1] << 8) |
                             (data[state.pos + 2] << 16) | (data[state.pos + 3] << 24);
            state.pos += 4;
            const end = state.pos + dataSize;
            const result = {};
            while (state.pos < end) {
                const key = readValue(state);
                if (key === null) break;
                const val = readValue(state);
                result[String(key)] = val;
            }
            state.pos = end;
            return result;
        }

        // Unknown tag — skip to avoid infinite loop
        return undefined;
    }

    return { parse };
})();

if (typeof module !== "undefined" && module.exports) module.exports = ScocParser;
globalThis.ScocParser = ScocParser;
