<template>
<Transition name="fade">
<div class="modal-backdrop quick-nav-backdrop" v-if="open" @click.self="$emit('close')" style="z-index: 230;">
    <Transition name="modal" appear>
    <div class="modal quick-nav-modal" v-if="open">
        <div class="quick-nav-search">
            <svg class="quick-nav-search-icon" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            <input
                ref="searchInput"
                type="text"
                v-model="query"
                :placeholder="t('app_quick_nav_placeholder')"
                class="quick-nav-input"
                @keydown.escape.stop="$emit('close')"
                @keydown.up.prevent="moveUp"
                @keydown.down.prevent="moveDown"
                @keydown.enter.prevent="confirmSelection"
            />
        </div>
        <div class="quick-nav-list" ref="listEl">
            <button
                v-for="(page, idx) in filteredPages"
                :key="page.id"
                class="quick-nav-item"
                :class="{ active: idx === activeIdx }"
                @click="selectPage(page)"
                @mouseenter="activeIdx = idx"
            >
                <span class="quick-nav-item-label">
                    <template v-for="(part, pi) in highlightLabel(page.label)" :key="pi">
                        <mark v-if="part.match" class="quick-nav-highlight">{{ part.text }}</mark><template v-else>{{ part.text }}</template>
                    </template>
                </span>
                <span class="quick-nav-item-group">{{ page.group }}</span>
            </button>
            <div v-if="filteredPages.length === 0" class="quick-nav-empty">{{ t('app_label_no_results') }}</div>
        </div>
        <div class="quick-nav-footer">
            <span><kbd>↑</kbd><kbd>↓</kbd> {{ t('app_quick_nav_hint_navigate') }}</span>
            <span><kbd>↵</kbd> {{ t('app_quick_nav_hint_select') }}</span>
            <span><kbd>Esc</kbd> {{ t('app_quick_nav_hint_close') }}</span>
        </div>
    </div>
    </Transition>
</div>
</Transition>
</template>

<script>
export default {
    name: "QuickNavModal",
    inject: ["t", "tCat"],
    props: {
        open: Boolean,
        groupedCategories: Array,
        categoryCounts: Object,
        favoriteIds: Array,
        recentIds: Array,
        hasStartingLoadouts: { type: Boolean, default: false },
        hasToolkitRates: { type: Boolean, default: false },
        craftingRecipeCategories: { type: Array, default: () => [] },
        craftingDisassemblyCategories: { type: Array, default: () => [] },
    },
    emits: [
        "close",
        "select-category",
        "select-crafting-category",
        "open-build-planner",
        "open-maps",
        "open-ballistics",
        "open-trading",
        "open-starting-loadouts",
        "open-version-compare",
        "select-favorites",
        "select-recent",
    ],
    data() {
        return {
            query: "",
            activeIdx: 0,
        };
    },
    computed: {
        allPages() {
            const pages = [];
            const savedGroup   = this.t("app_group_saved");
            const toolsGroup   = this.t("app_group_tools");
            const craftGroup   = this.t("app_group_crafting");

            // Saved
            pages.push({ id: "favorites", label: this.t("app_cat_favorites"), group: savedGroup, action: "favorites" });
            pages.push({ id: "recent",    label: this.t("app_cat_recent"),    group: savedGroup, action: "recent" });

            // Item DB categories
            for (const group of (this.groupedCategories || [])) {
                const groupLabel = this.t(group.name);
                for (const cat of group.categories) {
                    pages.push({ id: cat, label: this.tCat(cat), group: groupLabel, action: "category", cat });
                }
            }

            // Crafting main entry
            pages.push({ id: "crafting", label: this.t("app_cat_crafting"), group: craftGroup, action: "category", cat: "Crafting" });
            // Crafting recipe sub-categories
            for (const c of (this.craftingRecipeCategories || [])) {
                pages.push({ id: "craft-" + c.key, label: this.t(c.label), group: craftGroup, action: "crafting-category", cat: c.key });
            }
            // Crafting disassembly sub-categories
            for (const c of (this.craftingDisassemblyCategories || [])) {
                pages.push({ id: "craft-dis-" + c.key, label: this.t(c.label), group: craftGroup, action: "crafting-category", cat: c.key });
            }

            // Tools
            pages.push({ id: "build-planner",   label: this.t("app_cat_build_planner"),    group: toolsGroup, action: "build-planner" });
            pages.push({ id: "ballistics",       label: this.t("app_nav_damage_sim"),       group: toolsGroup, action: "ballistics" });
            pages.push({ id: "maps",             label: this.t("app_nav_maps"),             group: toolsGroup, action: "maps" });
            pages.push({ id: "trading",          label: this.t("app_nav_trading"),          group: toolsGroup, action: "trading" });
            pages.push({ id: "version-compare",  label: this.t("app_cat_version_compare"),  group: toolsGroup, action: "version-compare" });
            if (this.hasStartingLoadouts) {
                pages.push({ id: "starting-loadouts", label: this.t("app_cat_starting_loadouts"), group: toolsGroup, action: "starting-loadouts" });
            }
            if (this.hasToolkitRates) {
                pages.push({ id: "toolkit-rates", label: this.t("app_cat_toolkit_rates"), group: toolsGroup, action: "category", cat: "Toolkit Rates" });
            }

            return pages;
        },

        filteredPages() {
            const q = this.query.trim().toLowerCase();
            if (!q) return this.allPages;
            const qNorm = q.replace(/\s+/g, '');
            return this.allPages.filter(p => {
                const labelNorm = p.label.toLowerCase().replace(/\s+/g, '');
                const groupNorm = (p.group || '').toLowerCase().replace(/\s+/g, '');
                return labelNorm.includes(qNorm) || groupNorm.includes(qNorm);
            });
        },
    },
    watch: {
        open(val) {
            if (val) {
                this.query = "";
                this.activeIdx = 0;
                this.$nextTick(() => this.$refs.searchInput?.focus());
            }
        },
        filteredPages() {
            this.activeIdx = 0;
        },
    },
    methods: {
        moveUp() {
            if (this.activeIdx > 0) this.activeIdx--;
            this.scrollActiveIntoView();
        },
        moveDown() {
            if (this.activeIdx < this.filteredPages.length - 1) this.activeIdx++;
            this.scrollActiveIntoView();
        },
        scrollActiveIntoView() {
            this.$nextTick(() => {
                const list = this.$refs.listEl;
                if (!list) return;
                const active = list.children[this.activeIdx];
                if (active) active.scrollIntoView({ block: "nearest" });
            });
        },
        confirmSelection() {
            const page = this.filteredPages[this.activeIdx];
            if (page) this.selectPage(page);
        },
        selectPage(page) {
            if (page.action === "category") {
                this.$emit("select-category", page.cat);
            } else if (page.action === "crafting-category") {
                this.$emit("select-category", "Crafting");
                this.$emit("select-crafting-category", page.cat);
            } else if (page.action === "favorites") {
                this.$emit("select-favorites");
            } else if (page.action === "recent") {
                this.$emit("select-recent");
            } else if (page.action === "build-planner") {
                this.$emit("open-build-planner");
            } else if (page.action === "maps") {
                this.$emit("open-maps");
            } else if (page.action === "ballistics") {
                this.$emit("open-ballistics");
            } else if (page.action === "trading") {
                this.$emit("open-trading");
            } else if (page.action === "version-compare") {
                this.$emit("open-version-compare");
            } else if (page.action === "starting-loadouts") {
                this.$emit("open-starting-loadouts");
            }
            this.$emit("close");
        },

        /**
         * Returns [{text, match}] parts for a label given current query.
         * Matching ignores spaces so "allwe" matches "All Weapons".
         * Spaces that fall within the matched span are included as matched.
         */
        highlightLabel(label) {
            const q = this.query.trim().toLowerCase();
            if (!q) return [{ text: label, match: false }];

            const qNorm = q.replace(/\s+/g, '');
            const labelNorm = label.toLowerCase().replace(/\s+/g, '');
            const matchStart = labelNorm.indexOf(qNorm);
            if (matchStart === -1) return [{ text: label, match: false }];
            const matchEnd = matchStart + qNorm.length; // exclusive

            // Find the original-string indices that correspond to matchStart and matchEnd-1
            let firstOrig = -1, lastOrig = -1;
            let normIdx = 0;
            for (let i = 0; i < label.length; i++) {
                if (label[i] !== ' ') {
                    if (normIdx === matchStart) firstOrig = i;
                    if (normIdx === matchEnd - 1) lastOrig = i;
                    normIdx++;
                }
            }
            if (firstOrig === -1 || lastOrig === -1) return [{ text: label, match: false }];

            // Everything from firstOrig..lastOrig (inclusive) is the highlight span
            const parts = [];
            if (firstOrig > 0)   parts.push({ text: label.slice(0, firstOrig),        match: false });
            parts.push(          { text: label.slice(firstOrig, lastOrig + 1),         match: true  });
            if (lastOrig < label.length - 1) parts.push({ text: label.slice(lastOrig + 1), match: false });
            return parts;
        },
    },
};
</script>

<style scoped>
.quick-nav-highlight {
    background: transparent;
    color: var(--accent);
    font-weight: 600;
}
</style>
