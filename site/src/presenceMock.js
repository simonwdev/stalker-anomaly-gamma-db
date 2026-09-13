// Dev-only placeholder presence data, used when the presence socket can't
// connect locally (e.g. plain `npm run dev` with no API). Only imported behind
// `import.meta.env.DEV`, so it never ships in production builds.

const SLOT_MS = 15 * 60_000;
const DAY_SLOTS = 96;

// Deterministic noise so the fake chart looks the same between reloads.
function noise(seed) {
    const x = Math.sin(seed * 12.9898) * 43758.5453;
    return x - Math.floor(x);
}

// Busy evenings (~21:00 local), quiet early mornings, a little day-to-day drift.
function fakeCount(slotMs) {
    const d = new Date(slotMs);
    const hour = d.getHours() + d.getMinutes() / 60;
    const daily = Math.cos(((hour - 21) / 24) * 2 * Math.PI);
    const dayDrift = (noise(Math.floor(slotMs / 86_400_000)) - 0.5) * 60;
    const jitter = (noise(slotMs / SLOT_MS) - 0.5) * 40;
    return Math.max(40, Math.round(360 + 220 * daily + dayDrift + jitter));
}

export function buildMockPresence() {
    const end = Math.floor(Date.now() / SLOT_MS) * SLOT_MS;
    const points = [];
    for (let k = 7 * DAY_SLOTS; k >= 0; k--) {
        const slot = end - k * SLOT_MS;
        points.push([slot, fakeCount(slot)]);
    }
    const peak = points.reduce((best, p) => (p[1] > best[1] ? p : best), points[0]);
    return {
        count: points[points.length - 1][1],
        history: {
            type: "history",
            now: Date.now(),
            slotMs: SLOT_MS,
            points,
            record: { peak: peak[1] + 37, at: end - 3 * 86_400_000 },
        },
    };
}

// Small random walk around the current count for a "live" feel.
export function nextMockCount(count) {
    const step = Math.round((Math.random() - 0.5) * 8);
    return Math.max(1, count + step);
}
