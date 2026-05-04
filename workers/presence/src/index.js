import { DurableObject } from "cloudflare:workers";

const PRESENCE_KEY = "global";

export class PresenceDO extends DurableObject {
    constructor(ctx, env) {
        super(ctx, env);
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
        server.send(JSON.stringify({ type: "count", value: count }));
        this.broadcast(count);

        return new Response(null, { status: 101, webSocket: client });
    }

    webSocketClose(ws, code, reason, wasClean) {
        try {
            ws.close(code, reason);
        } catch {}
        this.broadcast(this.openCount());
    }

    webSocketError(ws) {
        this.broadcast(this.openCount());
    }

    openCount() {
        let n = 0;
        for (const ws of this.ctx.getWebSockets()) {
            if (ws.readyState === WebSocket.OPEN) n++;
        }
        return n;
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
