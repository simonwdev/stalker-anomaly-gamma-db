// Forwards WebSocket upgrades to the PresenceDO Durable Object hosted in
// the standalone `stalker-gamma-presence` Worker. The DO maintains a single
// global instance ("global") that holds every connected client and broadcasts
// the open-socket count to all of them.

export const onRequest = async (context) => {
    const { request, env } = context;

    if (request.headers.get("Upgrade") !== "websocket") {
        return new Response("Expected websocket", { status: 426 });
    }

    if (!env.PRESENCE) {
        return new Response("Presence binding not configured", { status: 503 });
    }

    const id = env.PRESENCE.idFromName("global");
    const stub = env.PRESENCE.get(id);
    try {
        return await stub.fetch(request);
    } catch (err) {
        // DO stub errors carry `retryable` / `overloaded` flags (e.g. during a
        // runtime restart). Log them so bursts are diagnosable, then fail soft.
        console.error("presence stub.fetch failed", {
            message: err?.message,
            retryable: err?.retryable,
            overloaded: err?.overloaded,
        });
        return new Response("Presence unavailable", {
            status: 503,
            headers: { "Retry-After": "30" },
        });
    }
};
