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
                placeholder="Search..."
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
                <span class="quick-nav-item-label">{{ page.label }}</span>
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
    },
    emits: ["close", "select-category", "open-build-planner", "select-favorites", "select-recent"],
    data() {
        return {
            query: "",
            activeIdx: 0,
        };
    },
    computed: {
        allPages() {
            const pages = [];
            const savedGroup = this.t("app_group_saved");
            pages.push({ id: "favorites", label: this.t("app_cat_favorites"), group: savedGroup, action: "favorites" });
            pages.push({ id: "recent",    label: this.t("app_cat_recent"),    group: savedGroup, action: "recent" });
            for (const group of (this.groupedCategories || [])) {
                const groupLabel = this.t(group.name);
                for (const cat of group.categories) {
                    pages.push({ id: cat, label: this.tCat(cat), group: groupLabel, action: "category", cat });
                }
            }
            pages.push({ id: "build-planner", label: this.t("app_cat_build_planner"), group: this.t("app_group_tools"), action: "build-planner" });
            return pages;
        },
        filteredPages() {
            const q = this.query.trim().toLowerCase();
            if (!q) return this.allPages;
            return this.allPages.filter(p =>
                p.label.toLowerCase().includes(q) ||
                (p.group && p.group.toLowerCase().includes(q))
            );
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
            } else if (page.action === "favorites") {
                this.$emit("select-favorites");
            } else if (page.action === "recent") {
                this.$emit("select-recent");
            } else if (page.action === "build-planner") {
                this.$emit("open-build-planner");
            }
            this.$emit("close");
        },
    },
};
</script>

