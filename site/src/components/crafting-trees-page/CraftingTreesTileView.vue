<template>
    <div v-if="isCraftingTrees" class="crafting-trees-view">
        <div class="crafting-trees-toolbar">
            <div class="view-toggle">
                <button :class="{ active: !graphViewOpen }" @click="graphViewOpen = false" v-tooltip="t('app_label_tile_view')">
                    <LucideLayoutGrid :size="14" />
                    <span class="view-toggle-label">{{ t('app_label_tile_view') }}</span>
                </button>
                <button class="crafting-tree-view-btn" :class="{ active: graphViewOpen }" @click="graphViewOpen = true" v-tooltip="t('app_label_tree_view')">
                    <LucideList :size="14" />
                    <span class="view-toggle-label">{{ t('app_label_tree_view') }}</span>
                </button>
            </div>
            <button class="crafting-expand-toggle-btn" @click="toggleExpandCollapse()">
                {{ currentExpandLabel }}
            </button>
            <span class="item-count">{{ filteredCraftingTrees.length }} {{ t('app_label_recipes') }}</span>
        </div>

        <div v-if="!graphViewOpen" class="tile-grid">
            <div v-for="tree in filteredCraftingTrees" :key="tree.id" class="tile-card crafting-tree-card">
                <div class="tile-card-header">
                    <a
                        href="#"
                        @click.prevent.stop="$emit('navigateToItem', tree.id)"
                        class="tile-card-name"
                        @mouseenter="showHover(tree.name, $event)"
                        @mousemove="moveHover($event)"
                        @mouseleave="hideHover()"
                    >{{ t(tree.name) }}</a>
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
                            <a
                                href="#"
                                @click.prevent.stop="$emit('navigateToItem', row.itemRef.id)"
                                @mouseenter="showHover(row.name, $event)"
                                @mousemove="moveHover($event)"
                                @mouseleave="hideHover()"
                            >{{ t(row.name) }}</a>
                        </template>
                        <template v-else>
                            <span class="tree-raw">{{ t(row.name) }}</span>
                        </template>
                        <span class="recipe-ing-amount">{{ row.amount }}</span>
                    </div>
                </div>
            </div>
        </div>

        <CraftingTreesTreeView
            v-else
            :all-crafting-trees="allCraftingTrees"
            :filtered-crafting-trees="filteredCraftingTrees"
            :expand-all="treeViewExpandAll"
            @navigate-to-item="(id) => $emit('navigateToItem', id)"
        />

        <!-- Hover tooltip -->
        <Teleport to="body">
            <div
                v-if="hoverItem"
                class="build-hover-popover"
                :style="hoverPos"
            >
                <div class="tile-card build-hover-tile">
                    <div class="tile-card-header">
                        <span class="tile-card-name">{{ tItemName(hoverItem) }}</span>
                    </div>
                    <div class="tile-card-stats">
                        <div
                            v-for="field in hoverFields"
                            :key="field"
                            class="tile-stat-row"
                        >
                            <span class="stat-label">{{ headerLabel(field) }}</span>
                            <span
                                class="stat-value"
                                :class="statClass(field, cellValue(hoverItem, field))"
                            >{{ formatValue(field, cellValue(hoverItem, field)) }}</span>
                        </div>
                    </div>
                    <div class="build-hover-desc">
                        <img
                            v-if="hoverItem.id"
                            class="build-hover-icon"
                            :src="'img/icons/' + hoverItem.id + '.png'"
                            alt=""
                            @error="$event.target.style.display = 'none'"
                        >
                    </div>
                </div>
            </div>
        </Teleport>
    </div>
</template>

<script>
import CraftingTreesTreeView from "./CraftingTreesTreeView.vue";

const HOVER_SKIP = new Set([
    "id", "name", "displayName", "pda_encyclopedia_name", "category", "localeName",
    "hasNpcWeaponDrop", "hasStashDrop", "hasDisassemble", "st_data_export_description",
    "st_data_export_is_junk", "st_data_export_has_perk", "st_data_export_can_be_crafted",
    "st_data_export_used_in_crafting",
]);

export default {
    name: "CraftingTreesTileView",
    components: { CraftingTreesTreeView },
    inject: ["t", "findItemByName", "findFullItemByName", "tItemName", "headerLabel", "formatValue", "cellValue", "statClass", "getItemFields"],
    props: {
        isCraftingTrees: Boolean,
        allCraftingTrees: { type: Array, default: () => [] },
        filteredCraftingTrees: { type: Array, default: () => [] },
        craftingTreeExpandAll: { type: Boolean, default: false },
        craftingTreeExpanded: { type: Set, default: () => new Set() },
    },
    emits: ["expandAllTrees", "collapseAllTrees", "toggleTreeNode", "navigateToItem"],
    data() {
        let graphViewOpen = false;
        try {
            const stored = localStorage.getItem("craftingTreesView");
            if (stored === "tree") graphViewOpen = true;
        } catch {}
        return {
            graphViewOpen,
            treeViewExpandAll: true,
            hoverItem: null,
            hoverPos: {},
            _hoverTimeout: null,
        };
    },
    watch: {
        graphViewOpen(v) {
            try { localStorage.setItem("craftingTreesView", v ? "tree" : "tile"); } catch {}
        },
    },
    computed: {
        currentExpandLabel() {
            if (this.graphViewOpen) {
                return this.treeViewExpandAll ? this.t("app_label_collapse_all") : this.t("app_label_expand_all");
            }
            return this.craftingTreeExpandAll ? this.t("app_label_collapse_all") : this.t("app_label_expand_all");
        },
        hoverFields() {
            if (!this.hoverItem) return [];
            return this.getItemFields(this.hoverItem).filter(
                (f) => !HOVER_SKIP.has(f) && this.cellValue(this.hoverItem, f) !== null && this.cellValue(this.hoverItem, f) !== "" && this.cellValue(this.hoverItem, f) !== "0" && this.cellValue(this.hoverItem, f) !== "0%"
            );
        },
    },
    methods: {
        toggleExpandCollapse() {
            if (this.graphViewOpen) {
                this.treeViewExpandAll = !this.treeViewExpandAll;
                return;
            }
            if (this.craftingTreeExpandAll) this.$emit("collapseAllTrees");
            else this.$emit("expandAllTrees");
        },

        showHover(name, event) {
            clearTimeout(this._hoverTimeout);
            const item = this.findFullItemByName(name);
            if (!item) return;
            this._hoverTimeout = setTimeout(() => {
                this.hoverItem = item;
                this._positionHover(event.clientX, event.clientY);
            }, 220);
        },

        moveHover(event) {
            if (!this.hoverItem) return;
            this._positionHover(event.clientX, event.clientY);
        },

        hideHover() {
            clearTimeout(this._hoverTimeout);
            this.hoverItem = null;
        },

        _positionHover(x, y) {
            const offset = 14;
            const pw = 260;
            const left = x + offset + pw > window.innerWidth ? x - pw - offset : x + offset;
            const top = Math.min(y + offset, window.innerHeight - 32);
            this.hoverPos = { position: "fixed", top: top + "px", left: left + "px", zIndex: 400 };
        },

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
    },
};
</script>

