<template>
<span
    ref="trigger"
    class="online-counter"
    @mouseenter="hovered = true"
    @mouseleave="hovered = false"
    @focus="hovered = true"
    @blur="hovered = false"
    @click="pinned = !pinned"
    @keydown.enter.prevent="pinned = !pinned"
    @keydown.esc="pinned = false"
    tabindex="0"
    role="button"
    :aria-label="buttonAria"
    :aria-expanded="open ? 'true' : 'false'"
>
    <!-- 24h sparkline whose live end is the pulsing dot; plain dot until
         there's enough history, when offline, or on narrow screens (CSS). -->
    <span v-if="spark" class="online-spark" aria-hidden="true">
        <svg class="online-spark-line" viewBox="0 0 56 18" width="56" height="18">
            <path :d="spark.path" />
        </svg>
        <span class="online-dot online-spark-dot" :style="{ left: `${spark.end.x - 3}px`, top: `${spark.end.y - 3}px` }"></span>
    </span>
    <span v-else class="online-dot" :class="{ 'online-dot--offline': !connected }" aria-hidden="true"></span>
    <span v-if="connected && count !== null" class="online-counter-text">
        <span class="online-counter-num">{{ count }}</span>
        {{ count === 1 ? t('app_online_label_one') : t('app_online_label_other') }}
    </span>
    <span v-else class="online-counter-text online-counter-text--offline">{{ t('app_online_offline') }}</span>

    <Teleport to="body">
        <Transition name="pda-fade">
            <div v-if="open" class="pda-popover" :style="popoverStyle" role="tooltip">
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
                <PresenceChart
                    v-if="connected && history"
                    :history="history"
                    :live-count="count"
                    :clock-offset="clockOffset"
                />
                <p v-else-if="!connected" class="pda-signal-lost">{{ t('app_pda_signal_lost') }}</p>
            </div>
        </Transition>
    </Teleport>
</span>
</template>

<script>
import PresenceChart from "./PresenceChart.vue";
import { currentSlot, buildFilled, daySeries, DAY_SLOTS } from "../presenceSeries.js";

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
const HISTORY_RETAIN_MS = 7 * 24 * 60 * 60_000;
// Header sparkline geometry (CSS px). The line stops short of the right edge
// so the 10px live dot sitting on its end stays inside the box.
const SPARK_W = 56;
const SPARK_H = 18;
const SPARK_DOT_INSET = 3;
const SPARK_PAD_Y = 3;
// ~2 hours of slots before a line is worth drawing.
const SPARK_MIN_POINTS = 8;

export default {
    name: "OnlineCounter",
    components: { PresenceChart },
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
            pinned: false,
            // { slotMs, points: [[slotStartMs, peak], ...], record } from the DO.
            history: null,
            clockOffset: 0,
            // Dev-only: placeholder data when the socket can't connect locally.
            mockTimer: null,
            nowHHMM: "",
            clockTimer: null,
            popoverStyle: {},
        };
    },
    computed: {
        open() {
            return this.hovered || this.pinned;
        },
        // Completed slots only, so the header line holds still within a slot
        // and only shifts when a 15-minute slot closes.
        sparkSeries() {
            if (!this.connected || !this.history) return null;
            void this.count; // re-evaluate as time passes with incoming counts
            const slotMs = this.history.slotMs;
            const end = currentSlot(slotMs, this.clockOffset) - slotMs;
            const values = daySeries(buildFilled(this.history, end), end, slotMs);
            const drawn = values.map((v, idx) => ({ v, idx })).filter((p) => p.v !== null);
            return drawn.length >= SPARK_MIN_POINTS ? drawn : null;
        },
        // Scaled to its own 24h range (not zero) so daily swings stay visible
        // at 16px tall; the popover chart keeps a zero baseline for detail.
        spark() {
            const drawn = this.sparkSeries;
            if (!drawn) return null;
            let min = Infinity;
            let max = -Infinity;
            for (const p of drawn) {
                min = Math.min(min, p.v);
                max = Math.max(max, p.v);
            }
            const span = SPARK_H - SPARK_PAD_Y * 2;
            const coords = drawn.map((p) => ({
                x: (p.idx / (DAY_SLOTS - 1)) * (SPARK_W - SPARK_DOT_INSET),
                y: max === min ? SPARK_H / 2 : SPARK_H - SPARK_PAD_Y - ((p.v - min) / (max - min)) * span,
            }));
            const path = coords.map((c, i) => `${i ? "L" : "M"}${c.x.toFixed(1)},${c.y.toFixed(1)}`).join("");
            return { path, end: coords[coords.length - 1] };
        },
        buttonAria() {
            if (!this.connected || this.count === null) return this.t("app_online_offline");
            if (!this.sparkSeries) return this.t("app_online_tooltip");
            const peak = this.sparkSeries.reduce((m, p) => Math.max(m, p.v), this.count);
            return this.t("app_online_button_aria")
                .replace("{count}", String(this.count))
                .replace("{peak}", String(peak));
        },
        line2Html() {
            const tmpl = this.t("app_pda_line_2");
            const value = this.connected && this.count !== null ? String(this.count) : "—";
            const safe = value.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
            return tmpl.replace("{count}", `<span class="pda-accent">${safe}</span>`);
        },
    },
    watch: {
        open(isOpen) {
            if (isOpen) {
                this.updateClock();
                this.clockTimer = setInterval(this.updateClock, 30000);
                this.$nextTick(this.positionPopover);
            } else if (this.clockTimer) {
                clearInterval(this.clockTimer);
                this.clockTimer = null;
            }
        },
    },
    mounted() {
        if (typeof window === "undefined") return;

        if ("BroadcastChannel" in window) {
            this.channel = new BroadcastChannel(CHANNEL_NAME);
            this.channel.onmessage = (e) => {
                const msg = e.data;
                if (!msg) return;
                if (msg.type === "count" && !this.isLeader) {
                    this.count = msg.value;
                    this.connected = true;
                    this.mergeLive(msg.value);
                    // Ask again if the first request went out before the
                    // leader had history (throttled; channel traffic is local).
                    if (!this.history && Date.now() - (this.lastHistoryRequest || 0) > 10_000) {
                        this.lastHistoryRequest = Date.now();
                        try { this.channel.postMessage({ type: "history-request" }); } catch {}
                    }
                } else if (msg.type === "history" && !this.isLeader) {
                    this.applyHistory(msg);
                } else if (msg.type === "history-request" && this.isLeader) {
                    this.postHistory();
                }
            };
            // A tab that isn't the socket leader asks the leader for history.
            try { this.channel.postMessage({ type: "history-request" }); } catch {}
        }

        // Tap/click to pin the popover open (hover never fires on touch);
        // any tap outside the counter closes it again.
        this.handleOutsideClick = (e) => {
            if (this.pinned && this.$refs.trigger && !this.$refs.trigger.contains(e.target)) {
                this.pinned = false;
            }
        };
        document.addEventListener("click", this.handleOutsideClick);

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
        if (this.mockTimer) clearInterval(this.mockTimer);
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
            document.removeEventListener("click", this.handleOutsideClick);
        }
    },
    methods: {
        async startMock() {
            // Constant-folded in production, so the mock chunk is never emitted.
            if (!import.meta.env.DEV) return;
            if (this.mockTimer || this.unloading) return;
            const { buildMockPresence, nextMockCount } = await import("../presenceMock.js");
            const mock = buildMockPresence();
            this.connected = true;
            this.count = mock.count;
            this.applyHistory(mock.history);
            this.postHistory();
            this.mockTimer = setInterval(() => {
                this.count = nextMockCount(this.count);
                this.mergeLive(this.count);
                try { this.channel?.postMessage({ type: "count", value: this.count }); } catch {}
            }, 4000);
        },
        applyHistory(msg) {
            if (!Array.isArray(msg.points) || typeof msg.slotMs !== "number") return;
            this.clockOffset = typeof msg.now === "number" ? msg.now - Date.now() : 0;
            this.history = {
                slotMs: msg.slotMs,
                points: msg.points.map((p) => [p[0], p[1]]),
                record: msg.record || null,
            };
            if (this.count !== null) this.mergeLive(this.count);
        },
        postHistory() {
            if (!this.channel || !this.history) return;
            try {
                this.channel.postMessage({
                    type: "history",
                    now: Date.now() + this.clockOffset,
                    slotMs: this.history.slotMs,
                    points: this.history.points,
                    record: this.history.record,
                });
            } catch {}
        },
        // Folds live counts into the current slot so the sparkline stays
        // current between connects (the DO only sends history on connect).
        mergeLive(value) {
            const history = this.history;
            if (!history || typeof value !== "number") return;
            const now = Date.now() + this.clockOffset;
            const slot = Math.floor(now / history.slotMs) * history.slotMs;
            const points = history.points;
            const last = points[points.length - 1];
            if (!last || last[0] < slot) {
                points.push([slot, value]);
                const cutoff = slot - HISTORY_RETAIN_MS;
                while (points.length && points[0][0] < cutoff) points.shift();
            } else if (value > last[1]) {
                last[1] = value;
            }
            if (!history.record || value > history.record.peak) {
                history.record = { peak: value, at: now };
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

            if (import.meta.env.DEV) {
                // A dev server may leave the upgrade hanging rather than closing it.
                setTimeout(() => {
                    if (openedAt === null && this.ws === ws) {
                        this.ws = null;
                        try { ws.close(); } catch {}
                        this.startMock();
                    }
                }, 3000);
            }

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
                    this.mergeLive(msg.value);
                    if (this.channel) {
                        try { this.channel.postMessage({ type: "count", value: msg.value }); } catch {}
                    }
                } else if (msg && msg.type === "history") {
                    this.applyHistory(msg);
                    this.postHistory();
                }
            });

            const onClose = () => {
                if (this.ws !== ws) return;
                this.ws = null;
                this.connected = false;
                if (this.unloading || !this.isLeader) return;

                if (openedAt === null) {
                    // Locally there's usually no presence API: show placeholder
                    // data instead of retrying (stripped from production builds).
                    if (import.meta.env.DEV) {
                        this.startMock();
                        return;
                    }
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
    cursor: pointer;
    outline: none;
    position: relative;
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

/* Button affordance drawn outside the box so the nav layout doesn't shift */
.online-counter::before {
    content: "";
    position: absolute;
    inset: -3px -8px;
    border-radius: 4px;
    background: transparent;
    transition: background-color 0.15s ease;
    pointer-events: none;
}
.online-counter:hover::before,
.online-counter:focus-visible::before,
.online-counter[aria-expanded="true"]::before {
    background: var(--color-accent-tint-10);
}
.online-counter:focus-visible::before {
    outline: 1px solid var(--accent);
}

/* Header sparkline: a small live dot marks the end of the line */
.online-spark {
    position: relative;
    flex-shrink: 0;
    width: 56px;
    height: 18px;
}
.online-spark-line {
    display: block;
    overflow: visible;
}
.online-spark-line path {
    fill: none;
    stroke: var(--color-text-muted, #9ca3af);
    stroke-opacity: 0.85;
    stroke-width: 1.75;
    stroke-linejoin: round;
    stroke-linecap: round;
}
/* End dot stays small and still (~3x line weight); liveness comes from a
   faint halo expanding outward instead of the dot itself growing. */
.online-spark-dot {
    position: absolute;
    width: 6px;
    height: 6px;
    animation: none;
    box-shadow: none;
}
.online-spark-dot::after {
    content: "";
    position: absolute;
    inset: 0;
    border-radius: 50%;
    border: 1.5px solid rgba(34, 197, 94, 0.7);
    animation: online-halo 2.4s ease-out infinite;
    pointer-events: none;
}
@keyframes online-halo {
    0% {
        transform: scale(1);
        opacity: 0.8;
    }
    100% {
        transform: scale(2.8);
        opacity: 0;
    }
}
@media (max-width: 640px) {
    /* No room for the line: fall back to the standard pulsing dot */
    .online-spark {
        width: 10px;
        height: 10px;
    }
    .online-spark-line {
        display: none;
    }
    .online-spark-dot {
        left: 0 !important;
        top: 0 !important;
        width: 10px;
        height: 10px;
        box-shadow: 0 0 8px rgba(34, 197, 94, 0.7);
        animation: online-pulse 1.8s ease-in-out infinite;
    }
    .online-spark-dot::after {
        display: none;
    }
}
@media (prefers-reduced-motion: reduce) {
    .online-dot,
    .online-spark-dot {
        animation: none;
    }
    .online-spark-dot::after {
        display: none;
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
.pda-signal-lost {
    margin: 0.5rem 0 0;
    padding-top: 0.4rem;
    border-top: 1px solid var(--border);
    color: var(--text-secondary);
    font-style: italic;
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
