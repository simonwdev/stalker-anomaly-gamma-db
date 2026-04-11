<template>
<div class="uptree" :style="{ '--cols': maxCols }">
    <div
        v-for="(row, rowIdx) in rows"
        :key="row.rowNum"
        class="uptree-tier"
    >
        <div class="uptree-gutter">{{ row.rowNum }}</div>

        <div
            v-for="colNum in maxCols"
            :key="colNum"
            class="uptree-cell"
        >
            <template v-if="getCol(row, colNum)">
                <div v-for="(node, ni) in getCol(row, colNum).cells" :key="node.section">
                    <div
                        class="uptree-node"
                        @mouseenter="showHover(node, $event)"
                        @mousemove="moveHover($event)"
                        @mouseleave="hideHover"
                    >
                        <div class="uptree-node-row1">
                            <span class="uptree-node-name">{{ nodeName(node) }}</span>
                            <span class="uptree-node-cost">{{ formatCost(node.cost) }}</span>
                        </div>
                        <div class="uptree-node-row2">
                            <span class="uptree-node-stat uptree-node-stat--primary">{{ nodeStatLine(node) }}</span>
                            <span
                                v-for="[key, val] in sideEffectStats(node)"
                                :key="key"
                                class="uptree-node-stat"
                                :class="statSignClass(key, val)"
                            >{{ statLabel(key) }} {{ formatStatVal(val) }}</span>
                        </div>
                    </div>
                    <div v-if="getCol(row, colNum).cells.length > 1 && ni === 0" class="uptree-or">or</div>
                </div>
            </template>
        </div>
    </div>

    <!-- Hover popover -->
    <div v-if="hoverNode" class="uptree-hover" :style="hoverStyle">
        <div class="uptree-hover-card">
            <div class="uptree-hover-head">
                <span class="uptree-hover-name">{{ nodeName(hoverNode) }}</span>
                <span class="uptree-hover-cost">{{ formatCost(hoverNode.cost) }}</span>
            </div>
            <p v-if="t(hoverNode.desc)" class="uptree-hover-desc">{{ t(hoverNode.desc) }}</p>
            <div class="uptree-hover-stats">
                <div class="uptree-hover-stat-row">
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
        hoverStyle() {
            if (!this.hoverPos) return { display: 'none' };
            return { top: this.hoverPos.top + 'px', left: this.hoverPos.left + 'px' };
        },
    },
    watch: {
        nodes() {
            this.hoverNode = null;
            this.hoverPos = null;
        },
    },
    methods: {
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
            // Flip left if overflows right
            if (x + rect.width > vw - 8) x = event.clientX - rect.width - 12;
            // Flip up if overflows bottom
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
            // Prefer the specific upgrade name, fall back to stat category
            if (node.name) {
                const translated = this.t(node.name);
                if (translated && translated !== node.name) return translated;
            }
            return this.t(node.prop) || node.prop;
        },
        // Keys that get combined into the primary stat line (not shown separately)
        combinedKeys(node) {
            const combined = new Set();
            // Only combine rpm with fire rate
            if (node.prop === "ui_inv_rate_of_fire" && node.stats?.rpm) {
                combined.add("rpm");
            }
            return combined;
        },
        nodeStatLine(node) {
            // Special case: calibre change
            if (node.prop === "st_prop_calibre" && node.val) {
                return "Change to " + node.val;
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
            if (node.prop === "st_prop_calibre") return "Change to " + node.val;
            return this.formatVal(node.val);
        },
        formatVal(val) {
            if (!val) return "";
            const num = parseFloat(val);
            if (isNaN(num)) return val;
            const prefix = num > 0 && !val.startsWith("+") ? "+" : "";
            // Append % for values that look like percentages (no unit suffix already)
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
.uptree {
    --ut-gutter: 1.3rem;
}

/* ── Tier row ────────────────────────────────────────────── */
.uptree-tier {
    display: grid;
    grid-template-columns: var(--ut-gutter) repeat(var(--cols), 1fr);
    gap: 0 0.4rem;
    padding: 0.4rem 0;
    align-items: start;
}

.uptree-tier + .uptree-tier {
    border-top: 1px dashed var(--color-elevated-3);
}

/* ── Gutter ──────────────────────────────────────────────── */
.uptree-gutter {
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.65rem;
    font-weight: 800;
    color: var(--color-accent-dim);
}

/* ── Cell ────────────────────────────────────────────────── */
.uptree-cell {
    min-width: 0;
}

/* ── Node ────────────────────────────────────────────────── */
.uptree-node {
    display: flex;
    flex-direction: column;
    gap: 0.1rem;
    padding: 0.25rem 0.5rem;
    background: var(--color-surface-5);
    border: 1px solid var(--color-elevated-4);
    border-radius: 3px;
    cursor: default;
    transition: border-color 0.15s;
}

.uptree-node:hover {
    border-color: var(--color-accent-muted);
}

.uptree-node-row1 {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 0.3rem;
}

.uptree-node-name {
    font-size: 0.72rem;
    font-weight: 700;
    color: var(--color-accent);
    line-height: 1.3;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    min-width: 0;
}

.uptree-node-cost {
    font-size: 0.62rem;
    font-weight: 700;
    color: var(--color-accent-lighter);
    white-space: nowrap;
    flex-shrink: 0;
}

.uptree-node-row2 {
    display: flex;
    flex-wrap: nowrap;
    gap: 0.4rem;
    min-height: 0.85rem;
    align-items: baseline;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.uptree-node-stat {
    font-size: 0.58rem;
    white-space: nowrap;
    color: var(--color-text-secondary);
}

.uptree-node-stat--primary {
    font-weight: 600;
    color: var(--color-green-positive);
}

.uptree-node-stat.uptree-stat-pos { color: var(--color-green-positive); }
.uptree-node-stat.uptree-stat-neg { color: var(--color-red-muted, #c05050); }

/* ── OR divider ──────────────────────────────────────────── */
.uptree-or {
    text-align: center;
    font-size: 0.5rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--color-accent-dim);
    padding: 0.25rem 0;
    line-height: 1;
}

/* ── Hover popover ───────────────────────────────────────── */
.uptree-hover {
    position: fixed;
    z-index: 220;
    pointer-events: none;
}

.uptree-hover-card {
    background: var(--card, var(--color-card));
    border: 1px solid var(--color-accent-tint-20);
    border-radius: 5px;
    padding: 0.5rem 0.6rem;
    box-shadow: 0 4px 16px var(--color-overlay-black-50);
    min-width: 14rem;
    max-width: 22rem;
}

.uptree-hover-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 0.4rem;
    margin-bottom: 0.3rem;
    padding-bottom: 0.3rem;
    border-bottom: 1px solid var(--border, var(--color-border));
}

.uptree-hover-name {
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--accent, var(--color-accent));
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    min-width: 0;
}

.uptree-hover-val {
    color: var(--color-text-secondary);
    font-weight: 400;
}

.uptree-hover-cost {
    font-size: 0.7rem;
    font-weight: 700;
    color: var(--color-accent-lighter);
    white-space: nowrap;
    flex-shrink: 0;
}

.uptree-hover-desc {
    font-size: 0.65rem;
    color: var(--text-secondary, var(--color-text-secondary));
    line-height: 1.4;
    margin: 0 0 0.3rem;
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
}

.uptree-hover-stat-label--primary {
    font-weight: 600;
    color: var(--color-text, var(--color-text-bright));
    text-transform: uppercase;
}

.uptree-hover-stat-label {
    color: var(--text-secondary, var(--color-text-secondary));
    font-size: 0.6rem;
    text-transform: uppercase;
    letter-spacing: 0.03em;
}

.uptree-hover-stat-value {
    font-family: var(--mono, monospace);
    font-size: 0.7rem;
    text-align: right;
    white-space: nowrap;
}

.uptree-stat-pos { color: var(--color-green-positive); }
.uptree-stat-neg { color: var(--color-red-muted, #c05050); }
</style>
