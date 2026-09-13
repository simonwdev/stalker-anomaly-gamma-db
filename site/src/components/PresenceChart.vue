<template>
<div class="pda-history">
    <div class="pda-history-head">
        <span class="pda-history-title">{{ t('app_pda_history_title') }}</span>
        <span v-if="hasChart" class="pda-history-peak">{{ fill(t('app_pda_history_peak'), { count: dayPeak }) }}</span>
    </div>

    <template v-if="hasChart">
        <svg
            class="pda-history-chart"
            :viewBox="`0 0 ${W} ${H}`"
            role="img"
            :aria-label="fill(t('app_pda_history_aria'), { count: liveCount ?? '—', peak: dayPeak })"
        >
            <line class="pda-history-base" :x1="0" :x2="W" :y1="H - PAD_BOTTOM" :y2="H - PAD_BOTTOM" />
            <path class="pda-history-area" :d="areaPath" />
            <path class="pda-history-line" :d="linePath" />
            <circle class="pda-history-dot" :cx="endPoint.x" :cy="endPoint.y" r="4" />
        </svg>
        <div class="pda-history-axis">
            <span>{{ startLabel }}</span>
            <span>{{ t('app_pda_history_now') }}</span>
        </div>
        <ul class="pda-history-notes">
            <li v-if="comparisonKey">{{ t(comparisonKey) }}</li>
            <li v-if="usualPeakLabel">{{ fill(t('app_pda_history_usual_peak'), { time: usualPeakLabel }) }}</li>
            <li v-if="recordLabel">
                {{ fill(t('app_pda_history_record'), { count: history.record.peak, date: recordLabel }) }}
            </li>
        </ul>
    </template>
    <p v-else class="pda-history-empty">{{ t('app_pda_history_collecting') }}</p>
</div>
</template>

<script>
import { DAY_MS, currentSlot, buildFilled, daySeries } from "../presenceSeries.js";

const W = 300;
const H = 56;
const PAD_TOP = 6;
const PAD_BOTTOM = 2;
// Minimum drawn points before the sparkline is worth showing.
const MIN_POINTS = 8;
// Same-slot samples from previous days needed before comparing to "usual".
const MIN_COMPARE_DAYS = 3;
const BUSIER_RATIO = 1.2;
const QUIETER_RATIO = 0.8;

// 24-hour HH:MM, matching the PDA header clock regardless of browser locale.
function formatPdaTime(d) {
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export default {
    name: "PresenceChart",
    inject: ["t"],
    props: {
        // { slotMs, points: [[slotStartMs, peak], ...], record: { peak, at } | null }
        history: { type: Object, required: true },
        liveCount: { type: Number, default: null },
        // Server clock minus local clock, so slot boundaries match the DO's.
        clockOffset: { type: Number, default: 0 },
    },
    data() {
        return { W, H, PAD_BOTTOM };
    },
    computed: {
        slotMs() {
            return this.history.slotMs;
        },
        currentSlot() {
            // liveCount is read so the chart re-evaluates as counts arrive.
            void this.liveCount;
            return currentSlot(this.slotMs, this.clockOffset);
        },
        filled() {
            return buildFilled(this.history, this.currentSlot, this.liveCount);
        },
        daySeries() {
            return daySeries(this.filled, this.currentSlot, this.slotMs);
        },
        drawn() {
            return this.daySeries
                .map((v, idx) => ({ v, idx }))
                .filter((p) => p.v !== null);
        },
        hasChart() {
            return this.drawn.length >= MIN_POINTS;
        },
        dayPeak() {
            return this.drawn.reduce((m, p) => Math.max(m, p.v), 0);
        },
        coords() {
            const maxY = Math.max(1, this.dayPeak) * 1.1;
            const span = H - PAD_TOP - PAD_BOTTOM;
            return this.drawn.map((p) => ({
                x: (p.idx / 95) * W,
                y: H - PAD_BOTTOM - (p.v / maxY) * span,
            }));
        },
        linePath() {
            return this.coords.map((c, i) => `${i ? "L" : "M"}${c.x.toFixed(1)},${c.y.toFixed(1)}`).join("");
        },
        areaPath() {
            if (!this.coords.length) return "";
            const first = this.coords[0];
            const last = this.coords[this.coords.length - 1];
            const base = H - PAD_BOTTOM;
            return `${this.linePath}L${last.x.toFixed(1)},${base}L${first.x.toFixed(1)},${base}Z`;
        },
        endPoint() {
            return this.coords[this.coords.length - 1] || { x: 0, y: 0 };
        },
        startLabel() {
            const d = new Date(this.currentSlot - 95 * this.slotMs - this.clockOffset);
            return formatPdaTime(d);
        },
        // Compares now against the same slot on previous days.
        comparisonKey() {
            if (this.liveCount === null) return null;
            const samples = [];
            for (let d = 1; d <= 7; d++) {
                const v = this.filled.get(this.currentSlot - d * DAY_MS);
                if (v !== undefined) samples.push(v);
            }
            if (samples.length < MIN_COMPARE_DAYS) return null;
            samples.sort((a, b) => a - b);
            const mid = Math.floor(samples.length / 2);
            const usual = samples.length % 2 ? samples[mid] : (samples[mid - 1] + samples[mid]) / 2;
            if (usual <= 0) return null;
            const ratio = this.liveCount / usual;
            if (ratio >= BUSIER_RATIO) return "app_pda_history_busier";
            if (ratio <= QUIETER_RATIO) return "app_pda_history_quieter";
            return "app_pda_history_typical";
        },
        // Local hour with the highest average count, once 2+ days are recorded.
        usualPeakLabel() {
            const points = this.history.points || [];
            if (!points.length || points[0][0] > this.currentSlot - 2 * DAY_MS) return null;
            const sums = new Array(24).fill(0);
            const counts = new Array(24).fill(0);
            for (const [slot, v] of this.filled) {
                if (slot === this.currentSlot) continue;
                const hour = new Date(slot - this.clockOffset).getHours();
                sums[hour] += v;
                counts[hour]++;
            }
            let best = -1;
            let bestAvg = -1;
            for (let h = 0; h < 24; h++) {
                if (!counts[h]) continue;
                const avg = sums[h] / counts[h];
                if (avg > bestAvg) {
                    bestAvg = avg;
                    best = h;
                }
            }
            if (best < 0) return null;
            const d = new Date();
            d.setHours(best, 0, 0, 0);
            return formatPdaTime(d);
        },
        recordLabel() {
            const record = this.history.record;
            if (!record) return null;
            return new Date(record.at - this.clockOffset).toLocaleDateString(undefined, { day: "numeric", month: "short" });
        },
    },
    methods: {
        fill(template, values) {
            return template.replace(/\{(\w+)\}/g, (m, key) => (key in values ? String(values[key]) : m));
        },
    },
};
</script>

<style scoped>
.pda-history {
    margin-top: 0.5rem;
    padding-top: 0.4rem;
    border-top: 1px solid var(--border);
}
.pda-history-head {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 0.5rem;
    margin-bottom: 0.3rem;
}
.pda-history-title {
    font-size: 0.65rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--accent);
}
.pda-history-peak {
    color: var(--text-secondary);
    font-variant-numeric: tabular-nums;
}
.pda-history-chart {
    display: block;
    width: 100%;
    height: auto;
    overflow: visible;
}
.pda-history-base {
    stroke: var(--border);
    stroke-width: 1;
}
.pda-history-area {
    fill: var(--accent);
    fill-opacity: 0.16;
    stroke: none;
}
.pda-history-line {
    fill: none;
    stroke: var(--accent);
    stroke-width: 2;
    stroke-linejoin: round;
    stroke-linecap: round;
}
.pda-history-dot {
    fill: var(--accent);
    stroke: var(--card);
    stroke-width: 2;
}
.pda-history-axis {
    display: flex;
    justify-content: space-between;
    margin-top: 0.15rem;
    font-size: 0.65rem;
    color: var(--text-secondary);
    opacity: 0.8;
    font-variant-numeric: tabular-nums;
}
.pda-history-notes {
    list-style: none;
    margin: 0.35rem 0 0;
    padding: 0;
    color: var(--text-secondary);
}
.pda-history-notes li {
    margin: 0.15rem 0;
}
.pda-history-empty {
    margin: 0;
    color: var(--text-secondary);
    font-style: italic;
}
</style>
