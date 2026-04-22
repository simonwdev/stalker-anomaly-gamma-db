// ─── Pure utility / helper functions ─────────────────────────────────────────
import { SKIP_KEYS, HEAL_FIELDS, FACTION_ICONS } from './constants.js';

export function malfunctionChance(reliabilityPct) {
    const condShotDec = 0.01 - (reliabilityPct / 10000);
    return (2 * condShotDec * 2000) / 10;
}

export function isNonZero(val) {
    if (val == null || val === "" || val === 0 || val === "0" || val === "0%") return false;
    if (typeof val === "string") {
        const n = parseFloat(val);
        if (!isNaN(n) && n === 0) return false;
    }
    return true;
}

export function buildStatRows(item, headers) {
    if (!item || !headers.length) return [];
    const rows = [];
    for (const h of headers) {
        if (SKIP_KEYS.has(h)) continue;
        rows.push({ key: h, value: item[h], isSection: false });
    }
    return rows;
}

export function buildDropFactions(drops) {
    if (!drops) return [];
    return Object.entries(drops).map(([name, ranks]) => ({
        name,
        ranks,
        icon: FACTION_ICONS[name] || FACTION_ICONS[name.toLowerCase()] || null,
    })).sort((a, b) => a.name.localeCompare(b.name));
}

export function categorySlug(category) {
    return category.toLowerCase().replace(/ /g, "-");
}

export function buildPathUrl(state) {
    if (state.buildPlanner && state.pack) return `/db/${state.pack}/build-planner`;
    if (state.damageSim && state.pack) return `/db/${state.pack}/ballistics`;
    if (state.maps && state.pack) return `/db/${state.pack}/maps`;
    if (state.trading && state.pack) return `/db/${state.pack}/trading`;
    if (state.versionCompare && state.pack) return `/db/${state.pack}/version-compare`;
    if (state.startingLoadouts && state.pack) return `/db/${state.pack}/starting-loadouts`;
    if (state.favorites && state.pack) return `/db/${state.pack}/favorites`;
    if (state.recent && state.pack) return `/db/${state.pack}/recent`;
    if (state.cat && state.pack) {
        return `/db/${state.pack}/${categorySlug(state.cat)}`;
    }
    return "/";
}

export function parsePathUrl(pathname) {
    const result = { pack: null, cat: null, buildPlanner: false, damageSim: false, maps: false, trading: false, favorites: false, recent: false, versionCompare: false, startingLoadouts: false };
    const path = pathname.replace(/\/+$/, "") || "/";
    if (path === "/build-planner") { result.buildPlanner = true; return result; }
    if (path === "/version-compare") { result.versionCompare = true; return result; }
    const m = path.match(/^\/db\/([^/]+)(?:\/([^/]+))?$/);
    if (m) {
        result.pack = m[1];
        if (m[2] === "build-planner") result.buildPlanner = true;
        else if (m[2] === "ballistics") result.damageSim = true;
        else if (m[2] === "maps") result.maps = true;
        else if (m[2] === "trading") result.trading = true;
        else if (m[2] === "version-compare") result.versionCompare = true;
        else if (m[2] === "starting-loadouts") result.startingLoadouts = true;
        else if (m[2] === "favorites") result.favorites = true;
        else if (m[2] === "recent") result.recent = true;
        else if (m[2]) result.cat = m[2];
    }
    return result;
}

export function saveCategoryFilters(packId, slug, state) {
    try {
        localStorage.setItem(`catFilters:${packId}:${slug}`, JSON.stringify(state));
    } catch (e) { /* quota or private mode */ }
}

export function loadCategoryFilters(packId, slug) {
    try {
        const raw = localStorage.getItem(`catFilters:${packId}:${slug}`);
        return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
}

export function debounce(fn, ms) {
    let timer;
    return function (...args) {
        clearTimeout(timer);
        timer = setTimeout(() => fn.apply(this, args), ms);
    };
}



