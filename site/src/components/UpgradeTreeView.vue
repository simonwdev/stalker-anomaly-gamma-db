<template>
<div class="uptree">
    <!-- Summary bar -->
    <div class="uptree-summary">
        <span class="uptree-summary-item">
            <span class="uptree-summary-val">{{ nodes.length }}</span>
            <span class="uptree-summary-lbl">{{ t('app_upgrade_label_upgrades') }}</span>
        </span>
        <span class="uptree-summary-sep">·</span>
        <span class="uptree-summary-item">
            <span class="uptree-summary-val">{{ rows.length }}</span>
            <span class="uptree-summary-lbl">{{ t('app_upgrade_label_tiers') }}</span>
        </span>
        <span class="uptree-summary-sep">·</span>
        <span class="uptree-summary-item">
            <span class="uptree-summary-lbl">{{ t('app_upgrade_label_total_cost') }}</span>
            <span class="uptree-summary-val uptree-summary-cost">{{ totalCostFormatted }}</span>
        </span>
        <span class="uptree-summary-spacer"></span>
        <!-- Category legend -->
        <span v-for="cat in presentCategories" :key="cat" class="uptree-legend-chip" :class="'uptree-legend--' + cat">
            <span class="uptree-legend-dot"></span>{{ catLabel(cat) }}
        </span>
    </div>

    <!-- Tiers -->
    <div class="uptree-grid" :style="{ '--cols': maxCols }">
        <div
            v-for="row in rows"
            :key="row.rowNum"
            class="uptree-tier"
        >
            <!-- Tier gutter label -->
            <div class="uptree-gutter">
                <div class="uptree-tier-badge">T{{ row.rowNum }}</div>
            </div>

            <!-- Cells -->
            <div
                v-for="colNum in maxCols"
                :key="colNum"
                class="uptree-cell"
            >
                <template v-if="getCol(row, colNum)">
                    <div v-for="(node, ni) in getCol(row, colNum).cells" :key="node.section">
                        <div
                            class="uptree-node"
                            :class="'uptree-node--' + propCategory(node.prop)"
                            @mouseenter="showHover(node, $event)"
                            @mousemove="moveHover($event)"
                            @mouseleave="hideHover"
                        >
                            <div class="uptree-node-inner">
                                <div class="uptree-node-row1">
                                    <span class="uptree-node-cat-dot"></span>
                                    <span class="uptree-node-name">{{ nodeName(node) }}</span>
                                    <span class="uptree-node-cost-badge">{{ formatCost(node.cost) }}</span>
                                </div>
                                <div class="uptree-node-row2">
                                    <span class="uptree-node-stat uptree-node-stat--primary">{{ nodeStatLine(node) }}</span>
                                    <template v-for="[key, val] in sideEffectStats(node)" :key="key">
                                        <span class="uptree-node-sep">·</span>
                                        <span
                                            class="uptree-node-stat"
                                            :class="statSignClass(key, val)"
                                        >{{ statLabel(key) }} {{ formatStatVal(val) }}</span>
                                    </template>
                                </div>
                            </div>
                        </div>
                        <div v-if="getCol(row, colNum).cells.length > 1 && ni === 0" class="uptree-or">
                            <span class="uptree-or-line"></span>
                            <span class="uptree-or-text">{{ t('app_upgrade_label_or') }}</span>
                            <span class="uptree-or-line"></span>
                        </div>
                    </div>
                </template>
            </div>
        </div>
    </div>

    <!-- Hover popover -->
    <div v-if="hoverNode" class="uptree-hover" :style="hoverStyle">
        <div class="uptree-hover-card" :class="'uptree-hover-card--' + propCategory(hoverNode.prop)">
            <div class="uptree-hover-head">
                <span class="uptree-hover-cat-dot"></span>
                <span class="uptree-hover-name">{{ nodeName(hoverNode) }}</span>
                <span class="uptree-hover-cost">{{ formatCost(hoverNode.cost) }}</span>
            </div>
            <p v-if="t(hoverNode.desc)" class="uptree-hover-desc">{{ t(hoverNode.desc) }}</p>
            <div class="uptree-hover-stats">
                <div class="uptree-hover-stat-row uptree-hover-stat-row--primary">
                    <span class="uptree-hover-stat-label uptree-hover-stat-label--primary">{{ t(hoverNode.prop) || hoverNode.prop }}</span>
                    <span class="uptree-hover-stat-value uptree-stat-pos">{{ hoverPrimaryVal(hoverNode) }}</span>
                </div>
                <div v-for="[key, val] in sideEffectStats(hoverNode)" :key="key" class="uptree-hover-stat-row">
                    <span class="uptree-hover-stat-label">{{ statLabel(key) }}</span>
                    <span class="uptree-hover-stat-value" :class="statSignClass(key, val)">{{ formatStatVal(val) }}</span>
                </div>
            </div>
        </div>
    </div>
</div>
</template>

<script>
const STAT_DISPLAY_MAP = {
    rpm: "RPM",
};

const STAT_LABEL_MAP = {
    inv_weight: "st_prop_weight",
    wound_protection: "ui_inv_outfit_wound_protection",
    fire_wound_protection: "ui_inv_outfit_fire_wound_protection",
    burn_protection: "ui_inv_outfit_burn_protection",
    chemical_burn_protection: "ui_inv_outfit_chemical_burn_protection",
    radiation_protection: "ui_inv_outfit_radiation_protection",
    telepatic_protection: "ui_inv_outfit_telepatic_protection",
    shock_protection: "ui_inv_outfit_shock_protection",
    explosion_protection: "ui_inv_outfit_explosion_protection",
    artefact_count: "ui_inv_outfit_artefact_count",
    power_restore_speed: "ui_inv_outfit_power_restore",
    health_restore_speed: "st_prop_restore_health",
    hit_power: "st_data_export_hit_power",
    sprint_allowed: "st_prop_sprint",
    additional_inventory_weight: "ui_inv_outfit_additional_weight",
    additional_inventory_weight2: "ui_inv_outfit_additional_weight",
    rpm: "unit_rpm",
};

const CAT_LABEL_KEYS = {
    combat: "app_upgrade_cat_combat",
    fire: "app_upgrade_cat_fire",
    hazard: "app_upgrade_cat_hazard",
    psi: "app_upgrade_cat_psi",
    weight: "app_upgrade_cat_weight",
    gun: "app_upgrade_cat_gun",
    artifact: "app_upgrade_cat_artifact",
    medic: "app_upgrade_cat_medic",
    repair: "app_upgrade_cat_repair",
    default: "app_upgrade_cat_default",
};

// Maps a prop key to a design category for color coding
function getPropCategory(prop) {
    if (!prop) return "default";
    const p = prop.toLowerCase();
    if (p.includes("wound_protection") || p.includes("hit_power") || p.includes("damage")) return "combat";
    if (p.includes("fire_wound") || p.includes("burn") || p.includes("explosion")) return "fire";
    if (p.includes("radiation") || p.includes("chemical")) return "hazard";
    if (p.includes("telepat") || p.includes("shock_protection")) return "psi";
    if (p.includes("weight") || p.includes("inv_weight")) return "weight";
    if (p.includes("rate_of_fire") || p.includes("rpm") || p.includes("accuracy") || p.includes("handling")
        || p.includes("calibre") || p.includes("recoil") || p.includes("scope")) return "gun";
    if (p.includes("artefact") || p.includes("artifact") || p.includes("power_restore")) return "artifact";
    if (p.includes("health") || p.includes("bleed") || p.includes("restore")) return "medic";
    if (p.includes("durability") || p.includes("repair")) return "repair";
    return "default";
}

export default {
    name: "UpgradeTreeView",
    inject: ["t", "headerLabel"],
    props: {
        nodes: { type: Array, default: () => [] },
    },
    data() {
        return {
            hoverNode: null,
            hoverPos: null,
            _hoverTimeout: null,
        };
    },
    computed: {
        rows() {
            const rowMap = new Map();
            for (const node of this.nodes) {
                if (!rowMap.has(node.row)) rowMap.set(node.row, new Map());
                const colMap = rowMap.get(node.row);
                if (!colMap.has(node.col)) colMap.set(node.col, []);
                colMap.get(node.col).push(node);
            }
            return [...rowMap.entries()]
                .sort(([a], [b]) => a - b)
                .map(([rowNum, colMap]) => ({
                    rowNum,
                    cols: [...colMap.entries()]
                        .sort(([a], [b]) => a - b)
                        .map(([colNum, cells]) => ({
                            colNum,
                            cells: cells.sort((a, b) => a.cell - b.cell),
                        })),
                }));
        },
        maxCols() {
            let max = 0;
            for (const node of this.nodes) {
                if (node.col > max) max = node.col;
            }
            return max || 1;
        },
        totalCost() {
            return this.nodes.reduce((sum, n) => sum + (n.cost || 0), 0);
        },
        totalCostFormatted() {
            return this.totalCost.toLocaleString() + " ₽";
        },
        hoverStyle() {
            if (!this.hoverPos) return { display: 'none' };
            return { top: this.hoverPos.top + 'px', left: this.hoverPos.left + 'px' };
        },
        presentCategories() {
            const seen = new Set();
            for (const node of this.nodes) {
                seen.add(getPropCategory(node.prop));
            }
            const order = ["combat","fire","hazard","psi","weight","gun","artifact","medic","repair","default"];
            return order.filter(c => seen.has(c));
        },
    },
    watch: {
        nodes() {
            this.hoverNode = null;
            this.hoverPos = null;
        },
    },
    methods: {
        propCategory(prop) {
            return getPropCategory(prop);
        },
        catLabel(cat) {
            const key = CAT_LABEL_KEYS[cat];
            return key ? this.t(key) : cat;
        },
        getCol(row, colNum) {
            return row.cols.find((c) => c.colNum === colNum) || null;
        },
        showHover(node, event) {
            clearTimeout(this._hoverTimeout);
            this._hoverTimeout = setTimeout(() => {
                this.hoverNode = node;
                this.$nextTick(() => this.positionHover(event));
            }, 200);
        },
        moveHover(event) {
            if (this.hoverNode) this.positionHover(event);
        },
        hideHover() {
            clearTimeout(this._hoverTimeout);
            this.hoverNode = null;
            this.hoverPos = null;
        },
        positionHover(event) {
            const el = this.$el.querySelector('.uptree-hover');
            if (!el) return;
            const rect = el.getBoundingClientRect();
            const vw = window.innerWidth;
            const vh = window.innerHeight;
            let x = event.clientX + 12;
            let y = event.clientY + 12;
            if (x + rect.width > vw - 8) x = event.clientX - rect.width - 12;
            if (y + rect.height > vh - 8) y = event.clientY - rect.height - 12;
            this.hoverPos = { top: y, left: x };
        },
        statLabel(key) {
            if (STAT_DISPLAY_MAP[key]) return STAT_DISPLAY_MAP[key];
            const mapped = STAT_LABEL_MAP[key];
            if (mapped) {
                const translated = this.t(mapped);
                if (translated && translated !== mapped) return translated;
            }
            const hl = this.headerLabel(key);
            if (hl && hl !== key) return hl;
            return key.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
        },
        nodeName(node) {
            if (node.name) {
                const translated = this.t(node.name);
                if (translated && translated !== node.name) return translated;
            }
            return this.t(node.prop) || node.prop;
        },
        combinedKeys(node) {
            const combined = new Set();
            if (node.prop === "ui_inv_rate_of_fire" && node.stats?.rpm) {
                combined.add("rpm");
            }
            return combined;
        },
        nodeStatLine(node) {
            if (node.prop === "st_prop_calibre" && node.val) {
                return this.t("app_upgrade_label_change_to") + " " + node.val;
            }
            const prop = this.t(node.prop) || node.prop;
            const val = node.val ? this.formatVal(node.val) : "";
            let line = val ? prop + " " + val : prop;
            if (node.stats) {
                const related = [];
                for (const key of this.combinedKeys(node)) {
                    related.push(this.statLabel(key) + " " + this.formatStatVal(node.stats[key]));
                }
                if (related.length) line += " (" + related.join(", ") + ")";
            }
            return line;
        },
        sideEffectStats(node) {
            if (!node.stats) return [];
            const combined = this.combinedKeys(node);
            const hide = new Set(["cost", "ammo_class", "hit_power", "ammo_elapsed"]);
            return Object.entries(node.stats).filter(([key]) => !combined.has(key) && !hide.has(key));
        },
        hoverPrimaryVal(node) {
            if (!node.val) return "";
            if (node.prop === "st_prop_calibre") return this.t("app_upgrade_label_change_to") + " " + node.val;
            return this.formatVal(node.val);
        },
        formatVal(val) {
            if (!val) return "";
            const num = parseFloat(val);
            if (isNaN(num)) return val;
            const prefix = num > 0 && !val.startsWith("+") ? "+" : "";
            const suffix = val.includes("kg") || val.includes("%") ? "" : "%";
            return prefix + val + suffix;
        },
        formatCost(cost) {
            if (!cost) return "";
            return cost.toLocaleString() + " ₽";
        },
        formatStatVal(val) {
            const num = parseFloat(val);
            if (isNaN(num)) return val;
            return num > 0 ? "+" + val : val;
        },
        statSignClass(key, val) {
            const num = parseFloat(val);
            if (isNaN(num) || num === 0) return "";
            const invertedKeys = new Set(["inv_weight", "cam_dispersion", "cam_step_angle_horz", "cam_max_angle", "cam_max_angle_horz"]);
            const isGood = invertedKeys.has(key) ? num < 0 : num > 0;
            return isGood ? "uptree-stat-pos" : "uptree-stat-neg";
        },
    },
};
</script>

<style scoped>
/* ── Category accent colors ──────────────────────────────── */
.uptree-node--combat    { --node-accent: var(--color-red-muted);       --node-accent-bg: var(--color-red-tint-12); }
.uptree-node--fire      { --node-accent: var(--color-orange);          --node-accent-bg: var(--color-orange-tint-12); }
.uptree-node--hazard    { --node-accent: var(--color-green-muted);     --node-accent-bg: var(--color-green-tint-12); }
.uptree-node--psi       { --node-accent: var(--color-purple-mid);      --node-accent-bg: var(--color-purple-tint-12); }
.uptree-node--weight    { --node-accent: var(--color-blue-muted);      --node-accent-bg: var(--color-blue-tint-12); }
.uptree-node--gun       { --node-accent: var(--color-accent);          --node-accent-bg: var(--color-accent-tint-10); }
.uptree-node--artifact  { --node-accent: var(--color-teal);            --node-accent-bg: var(--color-teal-tint-12); }
.uptree-node--medic     { --node-accent: var(--color-green-positive);  --node-accent-bg: var(--color-green-positive-tint-10); }
.uptree-node--repair    { --node-accent: var(--color-accent-tan);      --node-accent-bg: var(--color-accent-tan-tint-12); }
.uptree-node--default   { --node-accent: var(--color-accent-dim);      --node-accent-bg: var(--color-overlay-white-3); }

/* Hover card & legend category colors */
.uptree-hover-card--combat,  .uptree-legend--combat  { --card-accent: var(--color-red-muted); }
.uptree-hover-card--fire,    .uptree-legend--fire     { --card-accent: var(--color-orange); }
.uptree-hover-card--hazard,  .uptree-legend--hazard   { --card-accent: var(--color-green-muted); }
.uptree-hover-card--psi,     .uptree-legend--psi      { --card-accent: var(--color-purple-mid); }
.uptree-hover-card--weight,  .uptree-legend--weight   { --card-accent: var(--color-blue-muted); }
.uptree-hover-card--gun,     .uptree-legend--gun      { --card-accent: var(--color-accent); }
.uptree-hover-card--artifact,.uptree-legend--artifact { --card-accent: var(--color-teal); }
.uptree-hover-card--medic,   .uptree-legend--medic    { --card-accent: var(--color-green-positive); }
.uptree-hover-card--repair,  .uptree-legend--repair   { --card-accent: var(--color-accent-tan); }
.uptree-hover-card--default, .uptree-legend--default  { --card-accent: var(--color-accent-dim); }

/* ── Root ────────────────────────────────────────────────── */
.uptree {
    display: flex;
    flex-direction: column;
    gap: 0.45rem;
}

/* ── Summary bar ─────────────────────────────────────────── */
.uptree-summary {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.3rem 0.55rem;
    background: var(--color-surface-5);
    border: 1px solid var(--color-border);
    border-radius: 4px;
    font-size: 0.6rem;
    flex-wrap: wrap;
}

.uptree-summary-item {
    display: flex;
    align-items: baseline;
    gap: 0.25rem;
}

.uptree-summary-val {
    font-weight: 700;
    color: var(--color-accent-lighter);
}

.uptree-summary-lbl {
    color: var(--color-text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.04em;
}

.uptree-summary-cost {
    color: var(--color-accent-lighter);
}

.uptree-summary-sep {
    color: var(--color-elevated-3);
    font-size: 0.55rem;
}

.uptree-summary-spacer {
    flex: 1;
}

/* ── Category legend chips ───────────────────────────────── */
.uptree-legend-chip {
    display: inline-flex;
    align-items: center;
    gap: 0.2rem;
    font-size: 0.5rem;
    font-weight: 600;
    letter-spacing: 0.03em;
    color: var(--card-accent);
    text-transform: uppercase;
    opacity: 0.75;
}

.uptree-legend-dot {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: var(--card-accent);
    flex-shrink: 0;
    opacity: 0.9;
}

/* ── Grid ────────────────────────────────────────────────── */
.uptree-grid {
    --ut-gutter: 1.6rem;
    display: flex;
    flex-direction: column;
    gap: 0;
    background: var(--color-surface-4);
    border: 1px solid var(--color-border);
    border-radius: 5px;
    overflow: hidden;
}

/* ── Tier row ────────────────────────────────────────────── */
.uptree-tier {
    display: grid;
    grid-template-columns: var(--ut-gutter) repeat(var(--cols), 1fr);
    gap: 0 0.4rem;
    padding: 0.5rem 0.5rem 0.5rem 0;
    align-items: start;
    position: relative;
}

.uptree-tier + .uptree-tier {
    border-top: 1px solid var(--color-border);
}

/* Alternate tier background for visual rhythm */
.uptree-tier:nth-child(even) {
    background: var(--color-overlay-white-2);
}

/* ── Gutter ──────────────────────────────────────────────── */
.uptree-gutter {
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding-top: 0.2rem;
    border-right: 1px solid var(--color-border);
    margin-right: 0.15rem;
    align-self: stretch;
}

.uptree-tier-badge {
    font-size: 0.48rem;
    font-weight: 900;
    letter-spacing: 0.06em;
    color: var(--color-accent-dim);
    writing-mode: vertical-rl;
    text-orientation: mixed;
    transform: rotate(180deg);
    padding: 0.25rem 0;
    line-height: 1;
    text-transform: uppercase;
}

/* ── Cell ────────────────────────────────────────────────── */
.uptree-cell {
    min-width: 0;
}

/* ── Node ────────────────────────────────────────────────── */
.uptree-node {
    display: flex;
    flex-direction: row;
    background: var(--node-accent-bg, var(--color-surface-5));
    border: 1px solid var(--color-elevated-3);
    border-left: 3px solid var(--node-accent, var(--color-accent-dim));
    border-radius: 4px;
    cursor: default;
    transition: border-color 0.12s, box-shadow 0.12s, background 0.12s;
    overflow: hidden;
}

.uptree-node:hover {
    border-color: var(--node-accent, var(--color-accent-muted));
    box-shadow: 0 0 0 1px var(--node-accent, var(--color-accent-dim)), 0 2px 8px var(--color-overlay-black-40);
    background: var(--color-overlay-white-4);
}

.uptree-node-inner {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 0.12rem;
    padding: 0.25rem 0.45rem 0.22rem;
}

.uptree-node-row1 {
    display: flex;
    align-items: center;
    gap: 0.3rem;
}

/* Colored category dot */
.uptree-node-cat-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--node-accent, var(--color-accent-dim));
    flex-shrink: 0;
    opacity: 0.85;
}

.uptree-node-name {
    flex: 1;
    font-size: 0.68rem;
    font-weight: 700;
    color: var(--color-text-bright);
    line-height: 1.3;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    min-width: 0;
}

/* Cost as a badge pill */
.uptree-node-cost-badge {
    font-size: 0.52rem;
    font-weight: 700;
    color: var(--color-accent-dim);
    background: var(--color-accent-tint-8);
    border: 1px solid var(--color-accent-tint-20);
    border-radius: 10px;
    padding: 0.05rem 0.3rem;
    white-space: nowrap;
    flex-shrink: 0;
    line-height: 1.4;
}

.uptree-node-row2 {
    display: flex;
    flex-wrap: nowrap;
    gap: 0.2rem;
    min-height: 0.8rem;
    align-items: baseline;
    overflow: hidden;
    white-space: nowrap;
}

.uptree-node-stat {
    font-size: 0.57rem;
    white-space: nowrap;
    color: var(--color-text-secondary);
}

.uptree-node-stat--primary {
    font-weight: 600;
    color: var(--node-accent, var(--color-green-positive));
}

.uptree-node-sep {
    font-size: 0.5rem;
    color: var(--color-elevated-3);
    flex-shrink: 0;
}

.uptree-node-stat.uptree-stat-pos { color: var(--color-green-positive); }
.uptree-node-stat.uptree-stat-neg { color: var(--color-red-muted); }

/* ── OR divider ──────────────────────────────────────────── */
.uptree-or {
    display: flex;
    align-items: center;
    gap: 0.3rem;
    padding: 0.15rem 0.3rem;
}

.uptree-or-line {
    flex: 1;
    height: 1px;
    background: var(--color-elevated-3);
}

.uptree-or-text {
    font-size: 0.44rem;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--color-elevated-4);
    flex-shrink: 0;
}

/* ── Hover popover ───────────────────────────────────────── */
.uptree-hover {
    position: fixed;
    z-index: 220;
    pointer-events: none;
}

.uptree-hover-card {
    background: var(--color-card);
    border: 1px solid var(--color-border);
    border-left: 3px solid var(--card-accent, var(--color-accent));
    border-radius: 5px;
    padding: 0.5rem 0.6rem;
    box-shadow: 0 4px 24px var(--color-overlay-black-55);
    min-width: 14rem;
    max-width: 22rem;
}

.uptree-hover-head {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    margin-bottom: 0.3rem;
    padding-bottom: 0.3rem;
    border-bottom: 1px solid var(--color-border);
}

.uptree-hover-cat-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--card-accent, var(--color-accent));
    flex-shrink: 0;
}

.uptree-hover-name {
    flex: 1;
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--color-text-bright);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    min-width: 0;
}

.uptree-hover-cost {
    font-size: 0.65rem;
    font-weight: 700;
    color: var(--color-accent-lighter);
    white-space: nowrap;
    flex-shrink: 0;
    background: var(--color-accent-tint-8);
    border: 1px solid var(--color-accent-tint-20);
    border-radius: 8px;
    padding: 0.05rem 0.3rem;
}

.uptree-hover-desc {
    font-size: 0.63rem;
    color: var(--color-text-secondary);
    line-height: 1.4;
    margin: 0 0 0.35rem;
    font-style: italic;
}

.uptree-hover-stats {
    display: flex;
    flex-direction: column;
    gap: 0.1rem;
}

.uptree-hover-stat-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 0.5rem;
    padding: 0.08rem 0;
}

.uptree-hover-stat-row--primary {
    border-bottom: 1px solid var(--color-border);
    padding-bottom: 0.2rem;
    margin-bottom: 0.05rem;
}

.uptree-hover-stat-label {
    color: var(--color-text-secondary);
    font-size: 0.6rem;
    text-transform: uppercase;
    letter-spacing: 0.03em;
}

.uptree-hover-stat-label--primary {
    font-weight: 700;
    color: var(--color-text-bright);
    font-size: 0.65rem;
    text-transform: none;
    letter-spacing: 0;
}

.uptree-hover-stat-value {
    font-size: 0.68rem;
    text-align: right;
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
}

.uptree-stat-pos { color: var(--color-green-positive); }
.uptree-stat-neg { color: var(--color-red-muted); }
</style>
