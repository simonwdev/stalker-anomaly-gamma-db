const CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
};

function jsonResponse(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
}

async function sha256hex(text) {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
    return Array.from(new Uint8Array(buf))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
}

async function deflate(text) {
    const stream = new Blob([text]).stream().pipeThrough(new CompressionStream("deflate-raw"));
    return new Response(stream).arrayBuffer();
}

async function inflate(buffer) {
    const stream = new Blob([buffer]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
    return new Response(stream).text();
}

// Canonical JSON with sorted keys for content-addressable storage
function canonicalize(obj) {
    return JSON.stringify(obj, Object.keys(obj).sort());
}

const MAX_BODY_SIZE = 4096;

const SINGLE_SLOTS = ["outfit", "helmet", "backpack", "weapon1", "weapon2", "sidearm", "grenade", "ammo1", "ammo2", "ammoSidearm"];
const ARRAY_SLOTS = ["belts", "artifacts"];
const VALID_SLOT_TYPES = new Set(["outfit", "helmet", "backpack", "belt", "artifact", "weapon", "sidearm", "grenade", "ammo"]);
const ALLOWED_KEYS = new Set([...SINGLE_SLOTS, ...ARRAY_SLOTS, "inventory", "beltBonus", "pack"]);
const MAX_ARRAY_LENGTH = 10;
const ID_PATTERN = /^[a-z0-9_.\-]{2,40}$/;

function validateBuild(body) {
    // Reject unknown keys
    for (const key of Object.keys(body)) {
        if (!ALLOWED_KEYS.has(key)) return `Unknown field: ${key}`;
    }

    // Validate single slots (string ID or null)
    for (const key of SINGLE_SLOTS) {
        const val = body[key];
        if (val !== null && val !== undefined) {
            if (typeof val !== "string" || !ID_PATTERN.test(val)) return `Invalid ${key}`;
        }
    }

    // Validate array slots (arrays of string IDs)
    for (const key of ARRAY_SLOTS) {
        const val = body[key];
        if (val === undefined) continue;
        if (!Array.isArray(val) || val.length > MAX_ARRAY_LENGTH) return `Invalid ${key}`;
        for (const id of val) {
            if (typeof id !== "string" || !ID_PATTERN.test(id)) return `Invalid ${key} entry`;
        }
    }

    // Validate inventory (array of {id, slotType})
    if (body.inventory !== undefined) {
        if (!Array.isArray(body.inventory) || body.inventory.length > MAX_ARRAY_LENGTH) return "Invalid inventory";
        for (const entry of body.inventory) {
            if (!entry || typeof entry !== "object") return "Invalid inventory entry";
            if (typeof entry.id !== "string" || !ID_PATTERN.test(entry.id)) return "Invalid inventory item";
            if (!VALID_SLOT_TYPES.has(entry.slotType)) return "Invalid inventory slot type";
        }
    }

    // Validate beltBonus
    if (body.beltBonus !== undefined) {
        if (typeof body.beltBonus !== "number" || body.beltBonus < 0 || body.beltBonus > 10) return "Invalid beltBonus";
    }

    // Validate pack (string or null)
    if (body.pack !== undefined && body.pack !== null) {
        if (typeof body.pack !== "string" || body.pack.length > 30) return "Invalid pack";
    }

    return null;
}
const RATE_LIMIT_WINDOW = 60; // seconds
const RATE_LIMIT_MAX = 10; // max POSTs per window per IP

export async function onRequest(context) {
    const { request, env, params } = context;

    if (request.method === "OPTIONS") {
        return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    // POST /api/build — store a build
    if (request.method === "POST" && (!params.catchall || params.catchall.length === 0)) {
        if (!env.BUILDS) {
            return jsonResponse({ error: "Storage not configured" }, 503);
        }

        // Rate limit by IP
        const ip = request.headers.get("CF-Connecting-IP") || "unknown";
        const rateKey = `rate:${ip}`;
        const rateData = await env.BUILDS.get(rateKey, { type: "json" });
        const now = Math.floor(Date.now() / 1000);
        const count = rateData && rateData.t > now - RATE_LIMIT_WINDOW ? rateData.n : 0;
        if (count >= RATE_LIMIT_MAX) {
            return jsonResponse({ error: "Rate limit exceeded" }, 429);
        }
        await env.BUILDS.put(rateKey, JSON.stringify({ n: count + 1, t: now }), {
            expirationTtl: RATE_LIMIT_WINDOW,
        });

        const contentLength = request.headers.get("content-length");
        if (contentLength && parseInt(contentLength) > MAX_BODY_SIZE) {
            return jsonResponse({ error: "Payload too large" }, 413);
        }

        let body;
        try {
            body = await request.json();
        } catch {
            return jsonResponse({ error: "Invalid JSON" }, 400);
        }

        if (!body || typeof body !== "object") {
            return jsonResponse({ error: "Invalid build data" }, 400);
        }

        // Validate build structure
        const err = validateBuild(body);
        if (err) {
            return jsonResponse({ error: err }, 400);
        }

        // Separate metadata fields from build data before hashing
        const { pack, ...buildData } = body;

        const canonical = canonicalize(buildData);
        if (canonical.length > MAX_BODY_SIZE) {
            return jsonResponse({ error: "Payload too large" }, 413);
        }

        const hash = await sha256hex(canonical);
        const code = hash.slice(0, 10);
        const compressed = await deflate(canonical);

        await env.BUILDS.put(code, compressed, {
            metadata: { created: new Date().toISOString(), pack: pack || null },
        });

        return jsonResponse({ code });
    }

    // GET /api/build/<code> — retrieve a build
    if (request.method === "GET" && params.catchall?.length === 1) {
        if (!env.BUILDS) {
            return jsonResponse({ error: "Storage not configured" }, 503);
        }

        const code = params.catchall[0];
        if (!/^[a-f0-9]{6,16}$/.test(code)) {
            return jsonResponse({ error: "Invalid code" }, 400);
        }

        const data = await env.BUILDS.get(code, { type: "arrayBuffer" });
        if (!data) {
            return jsonResponse({ error: "Build not found" }, 404);
        }

        const json = await inflate(data);
        return new Response(json, {
            headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        });
    }

    return jsonResponse({ error: "Not found" }, 404);
}
