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

        if ("locks" in navigator) {
            this.acquireLeadership();
        } else {
            this.isLeader = true;
            this.connect();
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
                    this.connect();
                    return new Promise((resolve) => {
                        this.releaseLock = () => {
                            this.releaseLock = null;
                            resolve();
                        };
                    });
                });
            } catch {}
        },
        connect() {
            if (this.unloading || this.ws) return;

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

            ws.addEventListener("open", () => {
                this.connected = true;
                this.reconnectAttempt = 0;
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
                if (!this.unloading && this.isLeader) this.scheduleReconnect();
            };
            ws.addEventListener("close", onClose);
            ws.addEventListener("error", onClose);
        },
        scheduleReconnect() {
            if (this.reconnectTimer || this.unloading) return;
            this.reconnectAttempt = Math.min(this.reconnectAttempt + 1, 6);
            const base = 1000 * Math.pow(2, this.reconnectAttempt - 1);
            const delay = Math.min(base, 30000) + Math.floor(Math.random() * 1000);
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
