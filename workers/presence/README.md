# Presence Worker

Standalone Cloudflare Worker that hosts the `PresenceDO` Durable Object used by
the main Pages site to power the "people online" counter in the footer.

This lives in its own Worker because Cloudflare Pages cannot define a Durable
Object class itself — it can only bind to a class defined in a separate Worker.

## Deploy

One-time deploy of the Worker (which creates the DO namespace):

```sh
npx wrangler deploy --config workers/presence/wrangler.toml
```

After this is deployed, the Pages project's root `wrangler.toml` binds to it
via `script_name = "stalker-gamma-presence"` so that Pages Functions
(`functions/api/presence.js`) can forward WebSocket upgrades to the DO.

## How it works

- One named DO instance (`PRESENCE.idFromName("global")`) holds every
  connected WebSocket via the Hibernatable WebSockets API
  (`ctx.acceptWebSocket`). The DO can be evicted from memory while sockets
  remain connected — Cloudflare wakes it on the next event.
- On `webSocketClose` (and on each new connection) the DO broadcasts the
  current open-socket count to every client.
- `ctx.getWebSockets()` is the source of truth for the count; we filter by
  `readyState === OPEN`.
- Free tier: SQLite-backed DOs are available on Workers Free plan as of
  2025-04-07. WebSocket upgrades are billed once per connection, not per
  message.
