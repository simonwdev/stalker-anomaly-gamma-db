<template>
<span
    ref="trigger"
    class="online-counter"
    @mouseenter="onHover(true)"
    @mouseleave="onHover(false)"
    @focus="onHover(true)"
    @blur="onHover(false)"
    tabindex="0"
>
    <span class="online-dot" :class="{ 'online-dot--offline': !connected }"></span>
    <span v-if="connected && count !== null" class="online-counter-text">
        <span class="online-counter-num">{{ count }}</span>
        {{ count === 1 ? t('app_online_label_one') : t('app_online_label_other') }}
    </span>
    <span v-else class="online-counter-text online-counter-text--offline">{{ t('app_online_offline') }}</span>

    <Teleport to="body">
        <Transition name="pda-fade">
            <div v-if="hovered" class="pda-popover" :style="popoverStyle" role="tooltip">
                <div class="pda-popover-header">
                    <svg class="pda-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M4.9 19.1A10 10 0 0 1 4.9 4.9"/>
                        <path d="M7.8 16.2a6 6 0 0 1 0-8.4"/>
                        <circle cx="12" cy="12" r="2"/>
                        <path d="M16.2 7.8a6 6 0 0 1 0 8.4"/>
                        <path d="M19.1 4.9a10 10 0 0 1 0 14.2"/>
                    </svg>
                    <span class="pda-time">{{ nowHHMM }}</span>
                    <span class="pda-title">{{ t('app_pda_title') }}</span>
                </div>
                <ul class="pda-popover-body">
                    <li>{{ t('app_pda_line_1') }}</li>
                    <li><span v-html="line2Html"></span></li>
                    <li>{{ t('app_pda_line_3_prefix') }} <span class="pda-accent">{{ t('app_pda_stalker') }}</span></li>
                </ul>
            </div>
        </Transition>
    </Teleport>
</span>
</template>

<script>
const LOCK_NAME = "presence-leader";
const CHANNEL_NAME = "presence-count";
const CONFIG_URL = "/presence.json";

// A socket that stays open this long counts as healthy and resets backoff.
const STABLE_MS = 60_000;
// Consecutive attempts that never open (e.g. a proxy stripping Upgrade)
// before giving up until the tab is revisited.
const MAX_FAILS = 5;
const BACKOFF_CAP_MS = 300_000;
// After a healthy socket drops (usually the DO restarting and dropping every
// client at once), wait a random delay so tabs don't reconnect in lockstep.
const DROP_JITTER_MIN_MS = 5_000;
const DROP_JITTER_MAX_MS = 60_000;
const GIVE_UP_RETRY_MS = 10 * 60_000;

export default {
    name: "OnlineCounter",
    inject: ["t"],
    data() {
        return {
            count: null,
            connected: false,
            ws: null,
            channel: null,
            isLeader: false,
            releaseLock: null,
            reconnectTimer: null,
            reconnectAttempt: 0,
            failStreak: 0,
            gaveUpAt: null,
            unloading: false,
            hovered: false,
            nowHHMM: "",
            clockTimer: null,
            popoverStyle: {},
        };
    },
    computed: {
        line2Html() {
            const tmpl = this.t("app_pda_line_2");
            const value = this.connected && this.count !== null ? String(this.count) : "—";
            const safe = value.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
            return tmpl.replace("{count}", `<span class="pda-accent">${safe}</span>`);
        },
    },
    mounted() {
        if (typeof window === "undefined") return;

        if ("BroadcastChannel" in window) {
            this.channel = new BroadcastChannel(CHANNEL_NAME);
            this.channel.onmessage = (e) => {
                if (e.data && e.data.type === "count" && !this.isLeader) {
                    this.count = e.data.value;
                    this.connected = true;
                }
            };
        }

        this.handleUnload = () => {
            this.unloading = true;
            this.releaseLock?.();
        };
        window.addEventListener("pagehide", this.handleUnload);

        this.handleVisibility = () => {
            if (document.visibilityState !== "visible" || this.gaveUpAt === null) return;
            if (Date.now() - this.gaveUpAt < GIVE_UP_RETRY_MS) return;
            this.gaveUpAt = null;
            this.failStreak = MAX_FAILS - 1; // one more attempt before giving up again
            this.connect();
        };
        document.addEventListener("visibilitychange", this.handleVisibility);

        if ("locks" in navigator) {
            this.acquireLeadership();
        } else {
            this.isLeader = true;
            this.startIfEnabled();
        }
    },
    beforeUnmount() {
        this.unloading = true;
        if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
        if (this.clockTimer) clearInterval(this.clockTimer);
        if (this.ws) {
            try { this.ws.close(1000); } catch {}
            this.ws = null;
        }
        if (this.channel) {
            try { this.channel.close(); } catch {}
            this.channel = null;
        }
        this.releaseLock?.();
        if (typeof window !== "undefined") {
            window.removeEventListener("pagehide", this.handleUnload);
            document.removeEventListener("visibilitychange", this.handleVisibility);
        }
    },
    methods: {
        onHover(show) {
            this.hovered = show;
            if (show) {
                this.updateClock();
                this.clockTimer = setInterval(this.updateClock, 30000);
                this.$nextTick(this.positionPopover);
            } else if (this.clockTimer) {
                clearInterval(this.clockTimer);
                this.clockTimer = null;
            }
        },
        updateClock() {
            const d = new Date();
            const hh = String(d.getHours()).padStart(2, "0");
            const mm = String(d.getMinutes()).padStart(2, "0");
            this.nowHHMM = `${hh}:${mm}`;
        },
        positionPopover() {
            const trigger = this.$refs.trigger;
            if (!trigger) return;
            const rect = trigger.getBoundingClientRect();
            const margin = 8;
            const right = Math.max(margin, window.innerWidth - rect.right);
            const top = rect.bottom + 8;
            this.popoverStyle = {
                top: `${top}px`,
                right: `${right}px`,
            };
        },
        async acquireLeadership() {
            try {
                await navigator.locks.request(LOCK_NAME, { mode: "exclusive" }, () => {
                    if (this.unloading) return;
                    this.isLeader = true;
                    this.startIfEnabled();
                    return new Promise((resolve) => {
                        this.releaseLock = () => {
                            this.releaseLock = null;
                            resolve();
                        };
                    });
                });
            } catch {}
        },
        // Kill switch: a static (quota-free) flag file lets presence be turned
        // off for new page loads without touching the Worker. Fails open.
        async startIfEnabled() {
            try {
                const res = await fetch(CONFIG_URL, { cache: "no-store" });
                if (res.ok) {
                    const cfg = await res.json();
                    if (cfg && cfg.enabled === false) return;
                }
            } catch {}
            this.connect();
        },
        connect() {
            if (this.unloading || this.ws || this.gaveUpAt !== null) return;

            const proto = location.protocol === "https:" ? "wss:" : "ws:";
            const url = `${proto}//${location.host}/api/presence`;

            let ws;
            try {
                ws = new WebSocket(url);
            } catch {
                this.scheduleReconnect();
                return;
            }
            this.ws = ws;
            let openedAt = null;

            ws.addEventListener("open", () => {
                openedAt = Date.now();
                this.connected = true;
                this.failStreak = 0;
            });

            ws.addEventListener("message", (e) => {
                let msg;
                try { msg = JSON.parse(e.data); } catch { return; }
                if (msg && msg.type === "count" && typeof msg.value === "number") {
                    this.count = msg.value;
                    if (this.channel) {
                        try { this.channel.postMessage({ type: "count", value: msg.value }); } catch {}
                    }
                }
            });

            const onClose = () => {
                if (this.ws !== ws) return;
                this.ws = null;
                this.connected = false;
                if (this.unloading || !this.isLeader) return;

                if (openedAt === null) {
                    // Never opened: blocked or unreachable.
                    this.failStreak++;
                    if (this.failStreak >= MAX_FAILS) {
                        this.gaveUpAt = Date.now();
                        return;
                    }
                    this.scheduleReconnect();
                } else if (Date.now() - openedAt >= STABLE_MS) {
                    // Healthy socket dropped: reset backoff, spread reconnects out.
                    this.reconnectAttempt = 0;
                    const span = DROP_JITTER_MAX_MS - DROP_JITTER_MIN_MS;
                    this.scheduleReconnect(DROP_JITTER_MIN_MS + Math.floor(Math.random() * span));
                } else {
                    // Opened but died quickly: server unstable, keep backing off.
                    this.scheduleReconnect();
                }
            };
            ws.addEventListener("close", onClose);
            ws.addEventListener("error", onClose);
        },
        scheduleReconnect(fixedDelay) {
            if (this.reconnectTimer || this.unloading) return;
            let delay = fixedDelay;
            if (delay === undefined) {
                this.reconnectAttempt = Math.min(this.reconnectAttempt + 1, 10);
                const base = Math.min(2000 * Math.pow(2, this.reconnectAttempt - 1), BACKOFF_CAP_MS);
                // Jitter between half and full base so retries don't align.
                delay = Math.floor(base / 2 + Math.random() * (base / 2));
            }
            this.reconnectTimer = setTimeout(() => {
                this.reconnectTimer = null;
                this.connect();
            }, delay);
        },
    },
};
</script>

<style scoped>
.online-counter {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    font-size: 13px;
    color: var(--color-text-muted, #9ca3af);
    user-select: none;
    cursor: default;
    outline: none;
    /* Keep the label on one line and don't let the nav squeeze it */
    white-space: nowrap;
    flex-shrink: 0;
}
.online-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: #22c55e;
    box-shadow: 0 0 8px rgba(34, 197, 94, 0.7);
    animation: online-pulse 1.8s ease-in-out infinite;
}
.online-dot--offline {
    background: #6b7280;
    box-shadow: none;
    animation: none;
}
.online-counter-num {
    font-weight: 600;
    color: var(--color-text, #e5e7eb);
}
.online-counter-text--offline {
    opacity: 0.7;
}
@keyframes online-pulse {
    0%, 100% {
        transform: scale(1);
        box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.55);
    }
    50% {
        transform: scale(1.15);
        box-shadow: 0 0 0 4px rgba(34, 197, 94, 0);
    }
}
</style>

<style>
/* Global styles for the teleported popover. Matches the site's hover/popover
   conventions: --card background, accent-tinted border, standard shadow. */
.pda-popover {
    position: fixed;
    z-index: 220;
    width: 22rem;
    max-width: calc(100vw - 1rem);
    background: var(--card);
    border: 1px solid var(--color-accent-tint-20);
    border-radius: 5px;
    padding: 0.5rem 0.6rem;
    box-shadow: 0 4px 16px var(--color-overlay-black-50);
    color: var(--text);
    font-size: 0.75rem;
    line-height: 1.45;
    pointer-events: none;
}
.pda-popover-header {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    margin-bottom: 0.4rem;
    padding-bottom: 0.3rem;
    border-bottom: 1px solid var(--border);
    color: var(--accent);
}
.pda-icon {
    color: var(--accent);
    flex-shrink: 0;
}
.pda-time {
    color: var(--text);
    font-weight: 600;
    letter-spacing: 0.04em;
}
.pda-title {
    font-size: 0.65rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
}
.pda-popover-body {
    list-style: none;
    margin: 0;
    padding: 0;
    color: var(--text-secondary);
}
.pda-popover-body li {
    position: relative;
    padding-left: 0.85rem;
    margin: 0.2rem 0;
}
.pda-popover-body li::before {
    content: "•";
    position: absolute;
    left: 0;
    top: 0;
    color: var(--accent);
    opacity: 0.7;
}
.pda-accent {
    color: var(--accent);
    font-weight: 600;
}
.pda-fade-enter-active,
.pda-fade-leave-active {
    transition: opacity 0.12s ease, transform 0.12s ease;
}
.pda-fade-enter-from,
.pda-fade-leave-to {
    opacity: 0;
    transform: translateY(-4px);
}
</style>
