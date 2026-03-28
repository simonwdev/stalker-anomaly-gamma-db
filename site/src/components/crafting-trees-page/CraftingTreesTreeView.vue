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
                                <ul class="crafting-graph-stats" v-if="resolveNodeItem(tree) && nodeStats(resolveNodeItem(tree)).length">
                                    <li
                                        v-for="stat in nodeStats(resolveNodeItem(tree))"
                                        :key="`${resolveNodeItem(tree).id}-${stat.key}`"
                                        class="crafting-graph-stat"
                                        :class="stat.signClass"
                                    >
                                        <span class="crafting-graph-stat-label">{{ stat.label }}</span>
                                        <span class="crafting-graph-stat-value">{{ stat.value }}</span>
                                    </li>
                                </ul>
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
                                    <ul class="crafting-graph-stats" v-if="resolveNodeItem(child) && nodeStats(resolveNodeItem(child)).length">
                                        <li
                                            v-for="stat in nodeStats(resolveNodeItem(child))"
                                            :key="`${resolveNodeItem(child).id}-${stat.key}`"
                                            class="crafting-graph-stat"
                                            :class="stat.signClass"
                                        >
                                            <span class="crafting-graph-stat-label">{{ stat.label }}</span>
                                            <span class="crafting-graph-stat-value">{{ stat.value }}</span>
                                        </li>
                                    </ul>
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
    inject: ["t", "findItemByName", "findFullItemByName", "headerLabel", "formatValue"],
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
                const indexEntry = this.findItemByName(tree.name || "");
                return indexEntry && indexEntry.category === "Artefacts";
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
        isEmptyPropValue(rawValue) {
            if (rawValue === null || rawValue === undefined) return true;
            if (typeof rawValue === "number") return rawValue === 0;
            const text = String(rawValue).trim();
            if (!text || text === "--") return true;
            if (text === "0" || text === "0%") return true;
            const parsed = parseFloat(text.replace(/%/g, "").replace(/,/g, "."));
            if (!Number.isNaN(parsed) && parsed === 0) return true;
            return false;
        },

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
            return this.findFullItemByName(node?.name || "");
        },

        openNode(item) {
            if (!item?.id) return;
            this.$emit("navigateToItem", item.id);
        },

        nodeStats(item) {
            if (!item) return [];
            const SKIP = new Set([
                "id", "name", "displayName", "pda_encyclopedia_name", "category",
                "hasNpcWeaponDrop", "hasStashDrop", "hasDisassemble",
                "st_data_export_description", "localeName", "displayLabel",
                "st_data_export_is_junk", "st_data_export_has_perk",
                "st_data_export_can_be_crafted", "st_data_export_used_in_crafting",
                "st_data_export_can_be_cooked", "st_data_export_used_in_cooking",
                "st_data_export_cuts_thick_skin", "st_data_export_is_backpack",
                "st_data_export_single_handed", "ui_mcm_menu_exo",
                "ui_st_rank",
            ]);
            const stats = [];
            for (const key in item) {
                if (SKIP.has(key)) continue;
                const raw = item[key];
                if (this.isEmptyPropValue(raw)) continue;
                // Skip string flag values like "Y"/"N"
                if (raw === "Y" || raw === "N") continue;
                stats.push({
                    key,
                    label: this.graphStatLabel(key),
                    value: this.formatValue(key, raw),
                    signClass: this.getStatSignClass(key, raw),
                });
            }
            stats.sort((a, b) => a.label.localeCompare(b.label));
            return stats;
        },

        getStatSignClass(key, rawValue) {
            const num = this.parseNumeric(rawValue);
            if (num === null) return "";
            return num > 0 ? "stat-positive" : num < 0 ? "stat-negative" : "";
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



