<template>
    <div v-if="isCrafting" class="crafting-view">

        <!-- Inner view mode tabs (only for non-materials categories) -->
        <div v-if="craftingCategory !== 'materials'" class="crafting-inner-tabs">
            <button :class="{ active: craftingViewMode === 'list' }" @click="setInnerTab('list')">
                <LucideLayoutGrid :size="13" />
                <span>{{ t('app_label_list_view') }}</span>
            </button>
            <button :class="{ active: craftingViewMode === 'tree' }" @click="setInnerTab('tree')">
                <LucideList :size="13" />
                <span>{{ t('app_label_tree_view') }}</span>
            </button>
        </div>

        <!-- Tree view -->
        <CraftingInnerTreeView
            v-if="craftingViewMode === 'tree'"
            :filtered-crafting-trees="filteredCraftingTrees"
            @navigate-to-item="(id) => $emit('navigateToItem', id)"
            @hover-enter="(name, ev) => showHover(name, ev)"
            @hover-move="moveHover"
            @hover-leave="hideHover"
        />

        <!-- List view content -->
        <template v-else>
            <!-- Materials view -->
            <div v-if="craftingCategory === 'materials'" class="tile-grid">
                <div v-for="item in filteredMaterials" :key="item.id" class="tile-card recipe-card">
                    <div class="tile-card-header">
                        <span class="tile-card-name">{{ tName(item) }}</span>
                    </div>
                    <div class="material-sources" v-if="item.sources">
                        <div v-for="(src, idx) in item.sources" :key="idx" class="material-source">
                            <span class="recipe-ing-amount">x{{ src.amount }}</span>
                            <span class="material-from">{{ t('app_label_from') }}</span>
                            <template v-if="findItemByName(src.name)">
                                <a href="#" @click.prevent.stop="$emit('navigateToItem', findItemByName(src.name).id)">{{ t(src.name) }}</a>
                            </template>
                            <template v-else>
                                <span>{{ t(src.name) }}</span>
                            </template>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Tile card view (all categories including artefacts) -->
            <div v-else class="tile-grid" ref="tileGrid">
                <CraftingRecipeCard
                    v-for="tree in visibleTrees"
                    :key="tree.id"
                    :title="t(tree.name)"
                    :title-clickable="true"
                    :tier-label="tree.toolTier ? t('app_craft_toolkit_' + tree.toolTier) : ''"
                    :tier-tooltip="t('app_craft_tool_tier')"
                    :tier-class="tree.toolTier ? 'tier-' + tree.toolTier : ''"
                    :rows="treeRows(tree)"
                    :footer="tree.recipeReqName ? t(tree.recipeReqName) : ''"
                    @click-title="$emit('navigateToItem', tree.id)"
                    @click-row="(row) => row.itemId && $emit('navigateToItem', row.itemId)"
                    @toggle-expand="(path) => $emit('toggleTreeNode', path)"
                    @hover-enter="(ev, row) => showHover(row ? row.hoverName : tree.name, ev)"
                    @hover-move="moveHover"
                    @hover-leave="hideHover"
                />
                <!-- Infinite scroll sentinel -->
                <div class="infinite-scroll-sentinel" ref="scrollSentinel"></div>
            </div>
        </template>

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
import CraftingInnerTreeView from "./crafting-trees-page/CraftingInnerTreeView.vue";
import CraftingRecipeCard from "./CraftingRecipeCard.vue";

const HOVER_SKIP = new Set([
    "id", "name", "displayName", "pda_encyclopedia_name", "category", "localeName",
    "hasNpcWeaponDrop", "hasStashDrop", "hasDisassemble", "st_data_export_description",
    "st_data_export_is_junk", "st_data_export_has_perk", "st_data_export_can_be_crafted",
    "st_data_export_used_in_crafting",
]);

const PAGE_SIZE = 30;

export default {
    name: "CraftingView",
    components: { CraftingInnerTreeView, CraftingRecipeCard },
    inject: ["t", "tName", "tItemName", "findItemByName", "findFullItemByName", "headerLabel", "formatValue", "cellValue", "statClass", "getItemFields"],
    props: {
        isCrafting: Boolean,
        craftingCategory: { type: String, default: "all" },
        filterQuery: { type: String, default: "" },
        materialsItems: { type: Array, default: () => [] },
        allCraftingTrees: { type: Array, default: () => [] },
        filteredCraftingTrees: { type: Array, default: () => [] },
        craftingTreeExpandAll: { type: Boolean, default: false },
        craftingTreeExpanded: { type: Set, default: () => new Set() },
    },
    emits: ["navigateToItem", "expandAllTrees", "collapseAllTrees", "toggleTreeNode"],
    data() {
        let craftingViewMode = 'list';
        try {
            const stored = localStorage.getItem('craftingInnerViewMode');
            if (stored === 'tree') craftingViewMode = 'tree';
        } catch {}
        return {
            hoverItem: null,
            hoverPos: {},
            _hoverTimeout: null,
            craftingViewMode,
            visibleCount: PAGE_SIZE,
            _observer: null,
            _observingSentinel: null,
        };
    },
    computed: {
        filteredMaterials() {
            if (!this.filterQuery.trim()) return this.materialsItems;
            const q = this.filterQuery.toLowerCase();
            return this.materialsItems.filter(item => {
                if (this.tName(item).toLowerCase().includes(q)) return true;
                return item.sources && item.sources.some(s => this.t(s.name).toLowerCase().includes(q));
            });
        },
        hoverFields() {
            if (!this.hoverItem) return [];
            return this.getItemFields(this.hoverItem).filter(
                (f) => !HOVER_SKIP.has(f) && this.cellValue(this.hoverItem, f) !== null && this.cellValue(this.hoverItem, f) !== "" && this.cellValue(this.hoverItem, f) !== "0" && this.cellValue(this.hoverItem, f) !== "0%"
            );
        },
        visibleTrees() {
            return this.filteredCraftingTrees.slice(0, this.visibleCount);
        },
    },
    watch: {
        filteredCraftingTrees() {
            this.visibleCount = PAGE_SIZE;
        },
        craftingCategory() {
            this.visibleCount = PAGE_SIZE;
            // Reset to list view when switching to materials (no tree tab there)
            if (this.craftingCategory === 'materials') {
                this.craftingViewMode = 'list';
            }
        },
        craftingViewMode() {
            this.$nextTick(() => this._setupObserver());
        },
    },
    mounted() {
        this.$nextTick(() => this._setupObserver());
    },
    updated() {
        this._setupObserver();
    },
    beforeUnmount() {
        if (this._observer) {
            this._observer.disconnect();
            this._observer = null;
        }
    },
    methods: {
        setInnerTab(mode) {
            this.craftingViewMode = mode;
            this.visibleCount = PAGE_SIZE;
            try { localStorage.setItem('craftingInnerViewMode', mode); } catch {}
        },

        _setupObserver() {
            const sentinel = this.$refs.scrollSentinel;
            const root = this.$refs.tileGrid;
            if (!sentinel || !root) {
                if (this._observer) {
                    this._observer.disconnect();
                    this._observer = null;
                    this._observingSentinel = null;
                }
                return;
            }
            if (this._observingSentinel === sentinel) return;
            if (this._observer) {
                this._observer.disconnect();
                this._observer = null;
            }
            this._observingSentinel = sentinel;
            this._observer = new IntersectionObserver((entries) => {
                if (entries[0].isIntersecting && this.visibleCount < this.filteredCraftingTrees.length) {
                    this.visibleCount += PAGE_SIZE;
                }
            }, { root, threshold: 0 });
            this._observer.observe(sentinel);
        },

        treeRows(tree) {
            const rows = [];
            const walk = (node, depth, parentPath) => {
                const path = parentPath ? `${parentPath}/${node.name}` : node.name;
                const hasChildren = node.children && node.children.length > 0;
                const isExpanded = this.craftingTreeExpandAll || this.craftingTreeExpanded.has(path);
                const itemRef = this.findItemByName(node.name);
                rows.push({
                    key: path,
                    path,
                    depth,
                    expandable: hasChildren,
                    expanded: isExpanded,
                    showPlus: !hasChildren,
                    label: this.t(node.name),
                    amount: node.amount,
                    href: !!itemRef,
                    itemId: itemRef?.id,
                    hoverName: node.name,
                    raw: !itemRef,
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
    },
};
</script>

<style scoped>
.crafting-view {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
    overflow: hidden;
}

.crafting-inner-tabs {
    display: flex;
    flex-shrink: 0;
    padding-bottom: 0.4rem;
    margin-bottom: 0.3rem;
    border-bottom: 1px solid var(--border);
}

.crafting-inner-tabs button {
    background: var(--card);
    border: 1px solid var(--border);
    color: var(--text-secondary);
    height: 1.75rem;
    padding: 0 0.65rem;
    font-size: 0.72rem;
    font-family: inherit;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 0.35rem;
    transition: color 0.15s, border-color 0.15s;
}

.crafting-inner-tabs button:first-child {
    border-radius: 4px 0 0 4px;
}

.crafting-inner-tabs button + button {
    margin-left: -1px;
}

.crafting-inner-tabs button:last-child {
    border-radius: 0 4px 4px 0;
}

.crafting-inner-tabs button:hover {
    color: var(--text);
    border-color: var(--accent-dim);
    z-index: 1;
}

.crafting-inner-tabs button.active {
    color: var(--accent);
    border-color: var(--accent-dim);
    background: var(--color-accent-tint-8);
    z-index: 2;
}
</style>
