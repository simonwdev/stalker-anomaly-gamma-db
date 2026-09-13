import { DurableObject } from "cloudflare:workers";

const PRESENCE_KEY = "global";

// Minimum gap between fan-out broadcasts. Timestamp-based rather than a
// setTimeout, because pending timers block hibernation (and would burn the
// free-plan duration allowance).
const BROADCAST_MIN_INTERVAL_MS = 2000;

// Close codes that represent an ordinary disconnect and aren't worth logging.
const NORMAL_CLOSE_CODES = new Set([1000, 1001, 1005]);

// Online history: peak open-socket count per 15-minute slot, kept for 7 days.
// Stored as one JSON row so a wake from hibernation costs a single row read.
// Written only when a slot's peak rises or a new slot starts, piggybacking on
// connect/close events that already wake the object (no timers or alarms).
const SLOT_MS = 15 * 60_000;
const RETAIN_MS = 7 * 24 * 60 * 60_000;
const HISTORY_KEY = "history";

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
        this.history = null;
        this.ctx.storage.sql.exec("CREATE TABLE IF NOT EXISTS kv (k TEXT PRIMARY KEY, v TEXT NOT NULL)");
    }

    loadHistory() {
        if (this.history) return this.history;
        let history = { slots: [], record: null };
        try {
            const row = this.ctx.storage.sql.exec("SELECT v FROM kv WHERE k = ?", HISTORY_KEY).toArray()[0];
            if (row) history = JSON.parse(row.v);
        } catch (err) {
            console.error("presence history load failed", { message: err?.message });
        }
        this.history = history;
        return history;
    }

    recordSample(count) {
        const history = this.loadHistory();
        const now = Date.now();
        const slot = Math.floor(now / SLOT_MS) * SLOT_MS;
        const last = history.slots[history.slots.length - 1];
        let changed = false;

        if (!last || last[0] !== slot) {
            history.slots.push([slot, count]);
            const cutoff = slot - RETAIN_MS;
            while (history.slots.length && history.slots[0][0] < cutoff) history.slots.shift();
            changed = true;
        } else if (count > last[1]) {
            last[1] = count;
            changed = true;
        }
        if (!history.record || count > history.record.peak) {
            history.record = { peak: count, at: now };
            changed = true;
        }

        if (!changed) return;
        try {
            this.ctx.storage.sql.exec(
                "INSERT INTO kv (k, v) VALUES (?, ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v",
                HISTORY_KEY,
                JSON.stringify(history),
            );
        } catch (err) {
            console.error("presence history write failed", { message: err?.message });
        }
    }

    async fetch(request) {
        const upgrade = request.headers.get("Upgrade");
        if (upgrade !== "websocket") {
            return new Response("Expected websocket", { status: 426 });
        }

        const pair = new WebSocketPair();
        const [client, server] = Object.values(pair);

        this.ctx.acceptWebSocket(server);

        const count = this.openCount();
        this.recordSample(count);
        const history = this.loadHistory();
        server.send(JSON.stringify({ type: "count", value: count }));
        server.send(JSON.stringify({
            type: "history",
            now: Date.now(),
            slotMs: SLOT_MS,
            points: history.slots,
            record: history.record,
        }));
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
        this.recordSample(this.openCount());
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
