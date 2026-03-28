<template>
    <div v-if="versionCompareActive" class="version-compare-view">
        <div class="version-compare-header">
            <div class="version-compare-picker">
                <span class="version-compare-pack">{{ activePack.name }}</span>
                <span class="diff-arrow">&#9654;</span>
                <div v-if="packs.length > 1" class="compare-wrap" v-click-outside="closeCompareMenu">
                    <button class="version-compare-pack-btn" @click.stop="compareMenuOpen = !compareMenuOpen">
                        {{ crossPackId ? crossPackName : t('app_label_select_pack') }}
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
                    </button>
                    <div class="compare-menu" v-show="compareMenuOpen" @click.stop>
                        <button v-for="p in crossPackOptions" :key="p.id" class="sort-menu-item" :class="{ active: crossPackId === p.id }" @click="$emit('pickComparePack', p.id); compareMenuOpen = false">
                            <span class="sort-menu-check">{{ crossPackId === p.id ? '\u2713' : '' }}</span>
                            <span>{{ p.name }}</span>
                        </button>
                    </div>
                </div>
            </div>
            <template v-if="versionCompareResults.length">
                <div class="filter-input-group">
                    <svg class="filter-input-icon" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                    <input type="text" :value="versionCompareFilter" @input="$emit('update:versionCompareFilter', $event.target.value)" :placeholder="t('app_label_filter_placeholder')" class="filter-input">
                </div>
                <div v-if="categoryKeys.length > 1" class="compare-wrap" v-click-outside="closeCategoryMenu">
                    <button class="version-compare-pack-btn" @click.stop="categoryMenuOpen = !categoryMenuOpen">
                        {{ categoryFilter.length ? categoryFilter.length + ' ' + t('app_label_categories') : t('app_label_all_categories') }}
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
                    </button>
                    <div class="compare-menu version-compare-property-menu" v-show="categoryMenuOpen" @click.stop>
                        <div class="sort-menu-header">{{ t('app_label_filter_by_category') }}</div>
                        <button v-if="categoryFilter.length" class="sort-menu-item" @click="$emit('update:categoryFilter', [])">
                            <span class="sort-menu-check"></span>
                            <span>{{ t('app_label_clear') }}</span>
                        </button>
                        <div class="sort-menu-divider"></div>
                        <div class="version-compare-property-list">
                            <button v-for="cat in categoryKeys" :key="cat" class="sort-menu-item" :class="{ active: categoryFilter.includes(cat) }" @click="toggleCategory(cat)">
                                <span class="sort-menu-check">{{ categoryFilter.includes(cat) ? '\u2713' : '' }}</span>
                                <span>{{ t(singularCategory(cat)) || tCat(cat) }}</span>
                            </button>
                        </div>
                    </div>
                </div>
                <div v-if="propertyKeys.length" class="compare-wrap" v-click-outside="closePropertyMenu">
                    <button class="version-compare-pack-btn" @click.stop="propertyMenuOpen = !propertyMenuOpen">
                        {{ propertyFilter.length ? propertyFilter.length + ' ' + t('app_label_properties') : t('app_label_all_properties') }}
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
                    </button>
                    <div class="compare-menu version-compare-property-menu" v-show="propertyMenuOpen" @click.stop>
                        <div class="sort-menu-header">{{ t('app_label_filter_by_property') }}</div>
                        <button v-if="propertyFilter.length" class="sort-menu-item" @click="$emit('update:propertyFilter', [])">
                            <span class="sort-menu-check"></span>
                            <span>{{ t('app_label_clear') }}</span>
                        </button>
                        <div class="sort-menu-divider"></div>
                        <div class="version-compare-property-list">
                            <button v-for="key in propertyKeys" :key="key" class="sort-menu-item" :class="{ active: propertyFilter.includes(key) }" @click="toggleProperty(key)">
                                <span class="sort-menu-check">{{ propertyFilter.includes(key) ? '\u2713' : '' }}</span>
                                <span>{{ headerLabel(key) }}</span>
                            </button>
                        </div>
                    </div>
                </div>
                <span class="version-compare-count">{{ filteredTotal }} {{ t('app_label_changes') }}</span>
                <span class="version-compare-spacer"></span>
                <div class="utility-group">
                    <button class="copy-link-btn" :class="{ copied: copyLinkFeedback }" @click="$emit('copyLink')" v-tooltip="copyLinkFeedback ? t('app_label_copied') : t('app_label_copy_link')">
                        <svg v-if="copyLinkFeedback" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                        <svg v-else xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                    </button>
                    <button class="copy-link-btn" @click="$emit('exportVersionCompare')" v-tooltip="t('app_label_download')">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    </button>
                </div>
            </template>
        </div>

        <p v-if="versionCompareLoading" class="loading">{{ t('app_label_loading') }}</p>
        <p v-else-if="!crossPackId" class="cross-pack-no-changes">{{ t('app_label_select_pack_prompt') }}</p>
        <p v-else-if="!versionCompareResults.length" class="cross-pack-no-changes">{{ t('app_label_no_changes') }}</p>

        <template v-else>
            <div class="version-compare-list">
                <template v-for="group in filteredVersionCompareResults" :key="group.category">
                    <div v-for="item in group.items" :key="item.id" class="version-compare-item" @click="$emit('navigateToItem', item.id)">
                        <span class="version-compare-cat">{{ t(singularCategory(group.category)) || tCat(group.category) }}</span>
                        <span class="version-compare-name">{{ item.name }}</span>
                        <span class="version-compare-changes">
                            <span v-for="d in item.diffs.slice(0, 2)" :key="d.key" class="version-compare-stat">
                                <span class="version-compare-stat-label">{{ headerLabel(d.key) }}</span>
                                <span class="diff-old">{{ formatValue(d.key, d.oldVal) }}</span><span class="diff-arrow">&#9654;</span><span class="diff-new" :class="d.type === 'higher' ? 'diff-up' : 'diff-down'">{{ formatValue(d.key, d.newVal) }}</span>
                            </span>
                            <span v-if="item.diffs.length > 2" class="version-compare-more">+{{ item.diffs.length - 2 }} more</span>
                        </span>
                    </div>
                </template>
            </div>
        </template>
    </div>
</template>

<script>
export default {
    name: "VersionCompareView",
    inject: ["t", "tCat", "headerLabel", "formatValue", "singularCategory"],
    props: {
        versionCompareActive: Boolean,
        activePack: { type: Object, default: () => ({}) },
        packs: { type: Array, default: () => [] },
        crossPackId: { type: [String, null], default: null },
        crossPackName: { type: String, default: "" },
        crossPackOptions: { type: Array, default: () => [] },
        versionCompareResults: { type: Array, default: () => [] },
        filteredVersionCompareResults: { type: Array, default: () => [] },
        versionCompareTotal: { type: Number, default: 0 },
        versionCompareLoading: { type: Boolean, default: false },
        versionCompareFilter: { type: String, default: "" },
        propertyKeys: { type: Array, default: () => [] },
        propertyFilter: { type: Array, default: () => [] },
        categoryKeys: { type: Array, default: () => [] },
        categoryFilter: { type: Array, default: () => [] },
        copyLinkFeedback: { type: Boolean, default: false },
    },
    emits: ["update:versionCompareFilter", "update:propertyFilter", "update:categoryFilter", "pickComparePack", "copyLink", "exportVersionCompare", "navigateToItem"],
    data() {
        return {
            compareMenuOpen: false,
            propertyMenuOpen: false,
            categoryMenuOpen: false,
        };
    },
    computed: {
        filteredTotal() {
            return this.filteredVersionCompareResults.reduce((sum, g) => sum + g.items.length, 0);
        },
    },
    methods: {
        closeCompareMenu() {
            this.compareMenuOpen = false;
        },
        closePropertyMenu() {
            this.propertyMenuOpen = false;
        },
        closeCategoryMenu() {
            this.categoryMenuOpen = false;
        },
        toggleCategory(cat) {
            const current = [...this.categoryFilter];
            const idx = current.indexOf(cat);
            if (idx >= 0) {
                current.splice(idx, 1);
            } else {
                current.push(cat);
            }
            this.$emit('update:categoryFilter', current);
        },
        toggleProperty(key) {
            const current = [...this.propertyFilter];
            const idx = current.indexOf(key);
            if (idx >= 0) {
                current.splice(idx, 1);
            } else {
                current.push(key);
            }
            this.$emit('update:propertyFilter', current);
        },
    },
};
</script>
