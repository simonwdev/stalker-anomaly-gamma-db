<template>
<div class="crafting-graph-view">
    <div class="crafting-graph-list">
        <div v-for="tree in dialogFilteredTrees" :key="`graph-${tree.id}`" class="crafting-graph-collapsible">
            <button class="crafting-graph-collapsible-head" type="button" @click="toggleGraphTree(tree.id)">
                <span class="crafting-graph-caret">{{ isGraphTreeExpanded(tree.id) ? '\u25BC' : '\u25B6' }}</span>
                <span class="crafting-graph-collapsible-name">{{ t(tree.name) }}</span>
            </button>
            <div v-if="isGraphTreeExpanded(tree.id)" class="crafting-graph-body">
                <div class="crafting-graph-layout">
                    <div class="crafting-graph-root-wrap">
                        <div class="crafting-graph-node-stack">
                            <div
                                class="crafting-graph-node"
                                :class="{ clickable: !!resolveNodeItem(tree) }"
                                @click.stop="openNode(resolveNodeItem(tree))"
                            >
                                <div class="crafting-graph-node-main">
                                    <img
                                        v-if="hasNodeImage(resolveNodeItem(tree))"
                                        class="crafting-graph-node-img"
                                        :src="itemImageUrl(resolveNodeItem(tree))"
                                        :alt="t(tree.name)"
                                        @error="onNodeImageError(resolveNodeItem(tree))"
                                    >
                                    <div class="crafting-graph-node-text">
                                        <div class="crafting-graph-node-title">{{ t(tree.name) }}</div>
                                        <div class="crafting-graph-node-amount">
                                            <span class="crafting-graph-amount-label">Need</span>
                                            <span class="crafting-graph-amount-value">{{ amountValue('x1') }}</span>
                                        </div>
                                    </div>
                                </div>
                                <div class="crafting-graph-stats" v-if="resolveNodeItem(tree) && nodeStats(resolveNodeItem(tree)).length">
                                    <span
                                        v-for="stat in nodeStats(resolveNodeItem(tree))"
                                        :key="`${resolveNodeItem(tree).id}-${stat.key}`"
                                        class="crafting-graph-stat"
                                        :class="stat.signClass"
                                    >{{ stat.label }}: {{ stat.value }}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="crafting-graph-ingredients-wrap" v-if="tree.children && tree.children.length">
                        <div
                            v-for="(child, idx) in tree.children"
                            :key="`${tree.id}-${child.name}-${idx}`"
                            class="crafting-graph-ingredient-row"
                        >
                            <div class="crafting-graph-connector" aria-hidden="true"></div>
                            <div class="crafting-graph-node-stack">
                                <div
                                    class="crafting-graph-node"
                                    :class="{ clickable: !!resolveNodeItem(child) }"
                                    @click.stop="openNode(resolveNodeItem(child))"
                                >
                                    <div class="crafting-graph-node-main">
                                        <img
                                            v-if="hasNodeImage(resolveNodeItem(child))"
                                            class="crafting-graph-node-img"
                                            :src="itemImageUrl(resolveNodeItem(child))"
                                            :alt="t(child.name)"
                                            @error="onNodeImageError(resolveNodeItem(child))"
                                        >
                                        <div class="crafting-graph-node-text">
                                            <div class="crafting-graph-node-title">{{ t(child.name) }}</div>
                                            <div class="crafting-graph-node-amount">
                                                <span class="crafting-graph-amount-label">Need</span>
                                                <span class="crafting-graph-amount-value">{{ amountValue(child.amount || 'x1') }}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="crafting-graph-stats" v-if="resolveNodeItem(child) && nodeStats(resolveNodeItem(child)).length">
                                        <span
                                            v-for="stat in nodeStats(resolveNodeItem(child))"
                                            :key="`${resolveNodeItem(child).id}-${stat.key}`"
                                            class="crafting-graph-stat"
                                            :class="stat.signClass"
                                        >{{ stat.label }}: {{ stat.value }}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>
</template>

<script>
const GRAPH_STAT_PRIORITY = [
    "ui_inv_outfit_chemical_burn_protection",
    "ui_inv_outfit_radiation_protection",
    "ui_inv_outfit_burn_protection",
    "ui_inv_outfit_fire_wound_protection",
    "ui_inv_outfit_wound_protection",
    "ui_inv_outfit_shock_protection",
    "ui_inv_outfit_telepatic_protection",
    "ui_inv_outfit_strike_protection",
    "ui_inv_outfit_explosion_protection",
    "gamma_chemical_burn_cap",
    "gamma_fire_wound_cap",
    "gamma_wound_cap",
    "gamma_burn_cap",
    "gamma_shock_cap",
    "gamma_telepatic_cap",
    "gamma_strike_cap",
    "gamma_explosion_cap",
    "st_prop_restore_health",
    "st_prop_restore_bleeding",
    "st_data_export_restore_radiation",
    "ui_inv_outfit_power_restore",
    "ui_inv_satiety",
    "pda_encyclopedia_tier",
    "st_upgr_cost",
];

const GRAPH_LABEL_OVERRIDES = {
    pda_encyclopedia_tier: "Tier",
    st_upgr_cost: "Cost",
    gamma_fire_wound_cap: "Fire Cap",
    gamma_wound_cap: "Physical Cap",
    gamma_burn_cap: "Burn Cap",
    gamma_shock_cap: "Shock Cap",
    gamma_chemical_burn_cap: "Chemical Cap",
    gamma_telepatic_cap: "Psy Cap",
    gamma_strike_cap: "Impact Cap",
    gamma_explosion_cap: "Explosion Cap",
};

export default {
    name: "CraftingTreesTreeView",
    inject: ["t", "findItemByName", "getItemFields", "headerLabel", "formatValue"],
    props: {
        allCraftingTrees: { type: Array, default: () => [] },
        filteredCraftingTrees: { type: Array, default: () => [] },
        expandAll: { type: Boolean, default: true },
    },
    emits: ["navigateToItem"],
    data() {
        return {
            graphExpandedIds: new Set(),
            imageLoadFailed: {},
        };
    },
    computed: {
        dialogFilteredTrees() {
            const source = this.filteredCraftingTrees;
            const filtered = source.filter((tree) => {
                const item = this.resolveNodeItem(tree);
                return item && item.category === "Artefacts";
            });
            return filtered.slice(0, 36);
        },
    },
    watch: {
        expandAll: {
            immediate: true,
            handler(next) {
                if (next) this.expandAllGraphTrees();
                else this.collapseAllGraphTrees();
            },
        },
        dialogFilteredTrees() {
            if (this.expandAll) {
                this.expandAllGraphTrees();
            }
        },
    },
    methods: {
        graphStatLabel(key) {
            return GRAPH_LABEL_OVERRIDES[key] || this.headerLabel(key);
        },

        parseNumeric(rawValue) {
            const raw = String(rawValue ?? "").trim();
            if (!raw) return null;
            const normalized = raw.replace(/%/g, "").replace(/,/g, ".");
            const num = parseFloat(normalized);
            if (Number.isNaN(num)) return null;
            return num;
        },

        amountValue(rawAmount) {
            const text = String(rawAmount || "x1").trim();
            const match = text.match(/-?\d+(?:[.,]\d+)?/);
            return match ? match[0] : "1";
        },

        expandAllGraphTrees() {
            this.graphExpandedIds = new Set(this.dialogFilteredTrees.map((tree) => tree.id));
        },

        collapseAllGraphTrees() {
            this.graphExpandedIds = new Set();
        },

        toggleGraphTree(treeId) {
            const next = new Set(this.graphExpandedIds);
            if (next.has(treeId)) next.delete(treeId);
            else next.add(treeId);
            this.graphExpandedIds = next;
        },

        isGraphTreeExpanded(treeId) {
            return this.graphExpandedIds.has(treeId);
        },

        resolveNodeItem(node) {
            return this.findItemByName(node?.name || "");
        },

        openNode(item) {
            if (!item?.id) return;
            this.$emit("navigateToItem", item.id);
        },

        nodeStats(item) {
            if (!item) return [];
            const baseFields = this.getItemFields(item);
            const fields = [...new Set([...GRAPH_STAT_PRIORITY, ...baseFields])];
            const stats = [];
            for (const key of fields) {
                if (!(key in item)) continue;
                const raw = item[key];
                const num = this.parseNumeric(raw);
                if (num === null || num === 0) continue;
                stats.push({
                    key,
                    label: this.graphStatLabel(key),
                    value: this.formatValue(key, raw),
                    signClass: num > 0 ? "stat-positive" : "stat-negative",
                });
            }
            return stats;
        },


        itemImageUrl(item) {
            if (!item?.id) return "";
            return `img/icons/${item.id}.png`;
        },

        hasNodeImage(item) {
            if (!item?.id) return false;
            return !this.imageLoadFailed[item.id];
        },

        onNodeImageError(item) {
            if (!item?.id || this.imageLoadFailed[item.id]) return;
            this.imageLoadFailed = { ...this.imageLoadFailed, [item.id]: true };
        },
    },
};
</script>



