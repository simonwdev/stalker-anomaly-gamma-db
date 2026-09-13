// Shared series helpers for the online-presence history sent by the presence
// Durable Object: { slotMs, points: [[slotStartMs, peak], ...], record }.
// Slot times are in server time; clockOffset = server clock - local clock.

export const DAY_MS = 24 * 60 * 60_000;
export const DAY_SLOTS = 96;

export function currentSlot(slotMs, clockOffset) {
    const now = Date.now() + clockOffset;
    return Math.floor(now / slotMs) * slotMs;
}

// Slot -> value for the last 7 days up to `endSlot`, carrying the last known
// peak forward across slots with no connect/close events (the count can't
// change without one). Slots before recording began are absent. When
// `liveCount` is given it is folded into the end slot.
export function buildFilled(history, endSlot, liveCount = null) {
    const map = new Map();
    const points = history?.points || [];
    if (!points.length) return map;
    const slotMs = history.slotMs;
    const start = Math.max(points[0][0], endSlot - 7 * DAY_MS);
    let i = 0;
    let carry = null;
    for (let slot = points[0][0]; slot <= endSlot; slot += slotMs) {
        while (i < points.length && points[i][0] <= slot) {
            carry = points[i][1];
            i++;
        }
        if (slot >= start && carry !== null) map.set(slot, carry);
    }
    if (liveCount !== null) {
        map.set(endSlot, Math.max(map.get(endSlot) ?? 0, liveCount));
    }
    return map;
}

// The 24 hours ending at `endSlot`, oldest first; null where nothing is recorded.
export function daySeries(filled, endSlot, slotMs) {
    const out = [];
    for (let k = DAY_SLOTS - 1; k >= 0; k--) {
        const v = filled.get(endSlot - k * slotMs);
        out.push(v === undefined ? null : v);
    }
    return out;
}
