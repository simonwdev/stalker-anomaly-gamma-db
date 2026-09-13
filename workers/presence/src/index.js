import { DurableObject } from "cloudflare:workers";

const PRESENCE_KEY = "global";

// Minimum gap between fan-out broadcasts. Timestamp-based rather than a
// setTimeout, because pending timers block hibernation (and would burn the
// free-plan duration allowance).
const BROADCAST_MIN_INTERVAL_MS = 2000;

// Close codes that represent an ordinary disconnect and aren't worth logging.
const NORMAL_CLOSE_CODES = new Set([1000, 1001, 1005]);

export class PresenceDO extends DurableObject {
    constructor(ctx, env) {
        super(ctx, env);
        // The constructor also runs when waking from hibernation, but then the
        // sockets are still attached. Zero sockets means a genuine cold start
        // (first start, or a restart that terminated every connection).
        if (this.ctx.getWebSockets().length === 0) {
            console.warn("presence DO cold start");
        }
        this.lastBroadcast = 0;
    }

    async fetch(request) {
        const upgrade = request.headers.get("Upgrade");
        if (upgrade !== "websocket") {
            return new Response("Expected websocket", { status: 426 });
        }

        const pair = new WebSocketPair();
        const [client, server] = Object.values(pair);

        this.ctx.acceptWebSocket(server);

        server.send(JSON.stringify({ type: "count", value: this.openCount() }));
        this.maybeBroadcast();

        return new Response(null, { status: 101, webSocket: client });
    }

    webSocketClose(ws, code, reason, wasClean) {
        if (!NORMAL_CLOSE_CODES.has(code)) {
            console.log("presence ws abnormal close", { code, reason, wasClean });
        }
        try {
            ws.close(code, reason);
        } catch {}
        this.maybeBroadcast();
    }

    webSocketError(ws, error) {
        console.error("presence ws error", { message: error?.message });
        this.maybeBroadcast();
    }

    openCount() {
        let n = 0;
        for (const ws of this.ctx.getWebSockets()) {
            if (ws.readyState === WebSocket.OPEN) n++;
        }
        return n;
    }

    // Skips the fan-out if one went out recently. Counts may lag briefly after
    // a burst until the next connect/close; new sockets always get an exact
    // count on connect.
    maybeBroadcast() {
        const now = Date.now();
        if (now - this.lastBroadcast < BROADCAST_MIN_INTERVAL_MS) return;
        this.lastBroadcast = now;
        this.broadcast(this.openCount());
    }

    broadcast(count) {
        const msg = JSON.stringify({ type: "count", value: count });
        for (const ws of this.ctx.getWebSockets()) {
            if (ws.readyState !== WebSocket.OPEN) continue;
            try {
                ws.send(msg);
            } catch {}
        }
    }
}

export default {
    async fetch(request, env) {
        const url = new URL(request.url);
        if (url.pathname !== "/presence") {
            return new Response("Not found", { status: 404 });
        }
        const id = env.PRESENCE.idFromName(PRESENCE_KEY);
        const stub = env.PRESENCE.get(id);
        return stub.fetch(request);
    },
};
