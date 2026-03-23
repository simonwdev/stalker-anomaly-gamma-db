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
