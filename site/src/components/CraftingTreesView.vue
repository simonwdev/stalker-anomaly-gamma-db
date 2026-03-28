<template>
    <div v-if="isCraftingTrees" class="crafting-trees-view">
        <div class="crafting-trees-toolbar">
            <button class="filter-chip" @click="craftingTreeExpandAll ? $emit('collapseAllTrees') : $emit('expandAllTrees')">
                {{ craftingTreeExpandAll ? t('app_label_collapse_all') : t('app_label_expand_all') }}
            </button>
            <button class="filter-chip" @click="openGraphDialog">Graph Trees</button>
            <span class="item-count">{{ filteredCraftingTrees.length }} {{ t('app_label_recipes') }}</span>
        </div>
        <div class="tile-grid">
            <div v-for="tree in filteredCraftingTrees" :key="tree.id" class="tile-card crafting-tree-card">
                <div class="tile-card-header">
                    <a href="#" @click.prevent.stop="$emit('navigateToItem', tree.id)" class="tile-card-name">{{ t(tree.name) }}</a>
                </div>
                <div class="crafting-tree-body">
                    <div
                        v-for="row in flattenTree(tree)"
                        :key="row.path"
                        class="tree-row"
                        :style="{ paddingLeft: (row.depth * 1.2 + 0.3) + 'rem' }"
                    >
                        <span
                            v-if="row.hasChildren"
                            class="tree-toggle"
                            @click.stop="$emit('toggleTreeNode', row.path)"
                        >{{ row.isExpanded ? '\u25BC' : '\u25B6' }}</span>
                        <span v-else class="tree-leaf-dot">&bull;</span>
                        <template v-if="row.itemRef">
                            <a href="#" @click.prevent.stop="$emit('navigateToItem', row.itemRef.id)">{{ t(row.name) }}</a>
                        </template>
                        <template v-else>
                            <span class="tree-raw">{{ t(row.name) }}</span>
                        </template>
                        <span class="recipe-ing-amount">{{ row.amount }}</span>
                    </div>
                </div>
            </div>
        </div>

        <Transition name="fade">
            <div v-if="graphDialogOpen" class="modal-backdrop" style="z-index: 230;" @click.self="closeGraphDialog">
                <Transition name="modal" appear>
                    <div v-if="graphDialogOpen" class="modal crafting-graph-modal">
                        <button class="modal-close" @click="closeGraphDialog">&times;</button>
                        <div class="modal-body crafting-graph-modal-body">
                            <div class="crafting-graph-modal-toolbar">
                                <h2 class="crafting-graph-title">Crafting Trees</h2>
                                <span class="item-count">{{ dialogFilteredTrees.length }} {{ t('app_label_recipes') }}</span>
                            </div>
                            <div class="crafting-graph-controls">
                                <button class="filter-chip" @click="expandAllGraphTrees">{{ t('app_label_expand_all') }}</button>
                                <button class="filter-chip" @click="collapseAllGraphTrees">{{ t('app_label_collapse_all') }}</button>
                                <input
                                    v-model.trim="dialogSearch"
                                    class="crafting-graph-search"
                                    type="text"
                                    :placeholder="t('app_label_filter_placeholder')"
                                >
                            </div>
                            <div class="crafting-graph-list">
                                <div v-for="tree in dialogFilteredTrees" :key="`graph-${tree.id}`" class="crafting-graph-collapsible">
                                    <button class="crafting-graph-collapsible-head" @click="toggleGraphTree(tree.id)">
                                        <span class="crafting-graph-caret">{{ isGraphTreeExpanded(tree.id) ? '\u25BC' : '\u25B6' }}</span>
                                        <span class="crafting-graph-collapsible-name">{{ t(tree.name) }}</span>
                                    </button>
                                    <div v-if="isGraphTreeExpanded(tree.id)" class="crafting-graph-body">
                                        <div class="crafting-graph-layout">
                                            <div class="crafting-graph-root-wrap">
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
                                                            <div class="crafting-graph-node-amount">x1</div>
                                                        </div>
                                                    </div>
                                                    <div class="crafting-graph-stats" v-if="resolveNodeItem(tree)">
                                                        <span
                                                            v-for="stat in nodeStats(resolveNodeItem(tree))"
                                                            :key="`${resolveNodeItem(tree).id}-${stat.key}`"
                                                            class="crafting-graph-stat"
                                                            :class="stat.signClass"
                                                        >{{ stat.label }}: {{ stat.value }}</span>
                                                    </div>
                                                    <div v-if="resolveNodeItem(tree)" class="crafting-graph-tooltip">
                                                        <div class="crafting-graph-tooltip-title">{{ t(tree.name) }}</div>
                                                        <img
                                                            v-if="hasNodeImage(resolveNodeItem(tree))"
                                                            class="crafting-graph-tooltip-img"
                                                            :src="itemImageUrl(resolveNodeItem(tree))"
                                                            :alt="t(tree.name)"
                                                            @error="onNodeImageError(resolveNodeItem(tree))"
                                                        >
                                                        <div v-if="nodeDescription(resolveNodeItem(tree))" class="crafting-graph-tooltip-desc">
                                                            {{ nodeDescription(resolveNodeItem(tree)) }}
                                                        </div>
                                                        <div class="crafting-graph-tooltip-stats" v-if="nodeStats(resolveNodeItem(tree)).length">
                                                            <span
                                                                v-for="stat in nodeStats(resolveNodeItem(tree))"
                                                                :key="`tip-${resolveNodeItem(tree).id}-${stat.key}`"
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
                                                                <div class="crafting-graph-node-amount">{{ child.amount || 'x1' }}</div>
                                                            </div>
                                                        </div>
                                                        <div class="crafting-graph-stats" v-if="resolveNodeItem(child)">
                                                            <span
                                                                v-for="stat in nodeStats(resolveNodeItem(child))"
                                                                :key="`${resolveNodeItem(child).id}-${stat.key}`"
                                                                class="crafting-graph-stat"
                                                                :class="stat.signClass"
                                                            >{{ stat.label }}: {{ stat.value }}</span>
                                                        </div>
                                                        <div v-if="resolveNodeItem(child)" class="crafting-graph-tooltip">
                                                            <div class="crafting-graph-tooltip-title">{{ t(child.name) }}</div>
                                                            <img
                                                                v-if="hasNodeImage(resolveNodeItem(child))"
                                                                class="crafting-graph-tooltip-img"
                                                                :src="itemImageUrl(resolveNodeItem(child))"
                                                                :alt="t(child.name)"
                                                                @error="onNodeImageError(resolveNodeItem(child))"
                                                            >
                                                            <div v-if="nodeDescription(resolveNodeItem(child))" class="crafting-graph-tooltip-desc">
                                                                {{ nodeDescription(resolveNodeItem(child)) }}
                                                            </div>
                                                            <div class="crafting-graph-tooltip-stats" v-if="nodeStats(resolveNodeItem(child)).length">
                                                                <span
                                                                    v-for="stat in nodeStats(resolveNodeItem(child))"
                                                                    :key="`tip-${resolveNodeItem(child).id}-${stat.key}`"
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
                    </div>
                </Transition>
            </div>
        </Transition>
    </div>
</template>

<script>
export default {
    name: "CraftingTreesView",
    inject: ["t", "findItemByName", "getItemFields", "headerLabel", "formatValue", "parseDescription"],
    props: {
        isCraftingTrees: Boolean,
        allCraftingTrees: { type: Array, default: () => [] },
        filteredCraftingTrees: { type: Array, default: () => [] },
        craftingTreeExpandAll: { type: Boolean, default: false },
        craftingTreeExpanded: { type: Set, default: () => new Set() },
    },
    emits: ["expandAllTrees", "collapseAllTrees", "toggleTreeNode", "navigateToItem"],
    data() {
        return {
            graphDialogOpen: false,
            dialogSearch: "",
            graphExpandedIds: new Set(),
            imageLoadFailed: {},
        };
    },
    computed: {
        artefactTrees() {
            const source = this.allCraftingTrees.length ? this.allCraftingTrees : this.filteredCraftingTrees;
            const filtered = source.filter((tree) => {
                const item = this.resolveNodeItem(tree);
                return item && item.category === "Artefacts";
            });
            return filtered.slice(0, 36);
        },

        dialogFilteredTrees() {
            if (!this.dialogSearch) return this.artefactTrees;
            const q = this.dialogSearch.toLowerCase();
            return this.artefactTrees.filter((tree) => {
                if (this.t(tree.name).toLowerCase().includes(q)) return true;
                return (tree.children || []).some((child) => this.t(child.name).toLowerCase().includes(q));
            });
        },
    },
    watch: {
        graphDialogOpen(isOpen) {
            if (!isOpen) {
                this.dialogSearch = "";
            }
        },
    },
    methods: {
        flattenTree(tree) {
            const rows = [];
            const walk = (node, depth, parentPath) => {
                const path = parentPath ? `${parentPath}/${node.name}` : node.name;
                const hasChildren = node.children && node.children.length > 0;
                const isExpanded = this.craftingTreeExpandAll || this.craftingTreeExpanded.has(path);
                rows.push({
                    name: node.name,
                    id: node.id || null,
                    amount: node.amount,
                    depth,
                    hasChildren,
                    isExpanded,
                    path,
                    isRaw: node.isRaw,
                    itemRef: this.findItemByName(node.name),
                });
                if (hasChildren && isExpanded) {
                    for (const child of node.children) {
                        walk(child, depth + 1, path);
                    }
                }
            };
            if (tree.children) {
                for (const child of tree.children) {
                    walk(child, 0, "");
                }
            }
            return rows;
        },

        openGraphDialog() {
            this.graphDialogOpen = true;
            this.expandAllGraphTrees();
        },

        closeGraphDialog() {
            this.graphDialogOpen = false;
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

        parseNumeric(rawValue) {
            const raw = String(rawValue ?? "").trim();
            if (!raw) return null;
            const normalized = raw.replace(/%/g, "").replace(/,/g, ".");
            const num = parseFloat(normalized);
            if (Number.isNaN(num)) return null;
            return num;
        },

        nodeStats(item) {
            if (!item) return [];
            const fields = this.getItemFields(item);
            const stats = [];
            for (const key of fields) {
                const raw = item[key];
                const num = this.parseNumeric(raw);
                if (num === null || num === 0) continue;
                stats.push({
                    key,
                    label: this.headerLabel(key),
                    value: this.formatValue(key, raw),
                    signClass: num > 0 ? "stat-positive" : "stat-negative",
                });
            }
            return stats;
        },

        nodeDescription(item) {
            if (!item) return "";
            const parsed = this.parseDescription(item);
            return parsed?.text || "";
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
