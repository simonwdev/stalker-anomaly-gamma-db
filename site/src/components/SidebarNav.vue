<template>
<aside class="sidebar" :class="{ open: sidebarOpen }" v-show="translations">
    <div class="sidebar-scroll">
    <div class="sidebar-group">
        <div class="sidebar-group-label" @click="$emit('toggleGroup', 'saved')">
            <svg class="sidebar-chevron" :class="{ collapsed: collapsedGroups['saved'] }" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
            {{ t('app_group_saved') }}
        </div>
        <div class="sidebar-group-items" v-show="!collapsedGroups['saved']">
            <a :href="navHref('favorites')" :class="{ active: favoritesViewActive }" @click.prevent="$emit('selectFavorites')">
                <span class="cat-label">{{ t('app_cat_favorites') }}</span>
                <span v-if="favoriteIds.length" class="cat-count">{{ favoriteIds.length }}</span>
            </a>
            <a :href="navHref('recent')" :class="{ active: recentViewActive }" @click.prevent="$emit('selectRecent')">
                <span class="cat-label">{{ t('app_cat_recent') }}</span>
                <span v-if="recentIds.length" class="cat-count">{{ recentIds.length }}</span>
            </a>
        </div>
    </div>
    <div class="sidebar-group">
        <div class="sidebar-group-label" @click="$emit('toggleGroup', 'tools')">
            <svg class="sidebar-chevron" :class="{ collapsed: collapsedGroups['tools'] }" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
            {{ t('app_group_tools') }}
        </div>
        <div class="sidebar-group-items" v-show="!collapsedGroups['tools']">
            <a :href="navHref('version-compare')" :class="{ active: versionCompareActive }" @click.prevent="$emit('openVersionCompare')">
                <span class="cat-label">{{ t('app_cat_version_compare') }}</span>
            </a>
            <a v-if="hasStartingLoadouts" :href="navHref('starting-loadouts')" :class="{ active: startingLoadoutsActive }" @click.prevent="$emit('openStartingLoadouts')">
                <span class="cat-label">{{ t('app_cat_starting_loadouts') }}</span>
            </a>
            <a v-if="hasToolkitRates" :href="categoryHref(toolkitRatesCategory)" :class="{ active: activeCategory === toolkitRatesCategory && !favoritesViewActive && !recentViewActive && !versionCompareActive && !startingLoadoutsActive }" @click.prevent="$emit('selectCategory', toolkitRatesCategory)">
                <span class="cat-label">{{ t('app_cat_toolkit_rates') }}</span>
            </a>
        </div>
    </div>
    <div v-for="group in groupedCategories" :key="group.name" class="sidebar-group" :class="'sidebar-group--' + group.name.replace(/\s+/g, '-').toLowerCase()">
        <div class="sidebar-group-label" @click="$emit('toggleGroup', group.name)">
            <svg class="sidebar-chevron" :class="{ collapsed: collapsedGroups[group.name] }" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
            {{ t(group.name) }}
        </div>
        <div class="sidebar-group-items" v-show="!collapsedGroups[group.name]">
            <a
                v-for="cat in group.categories"
                :key="cat"
                :href="categoryHref(cat)"
                :class="{ active: activeCategory === cat && !favoritesViewActive && !recentViewActive && !buildPlannerActive && !versionCompareActive && !startingLoadoutsActive }"
                @click.prevent="$emit('selectCategory', cat)"
            ><span class="cat-label" :title="tCat(cat)">{{ tCat(cat) }}</span> <span v-if="categoryCounts[cat]" class="cat-count">{{ categoryCounts[cat] }}</span></a>
        </div>
    </div>
    </div>
    <button class="sidebar-collapse-btn" @click="$emit('toggleSidebarCollapse')" v-tooltip="t('app_shortcuts_toggle_sidebar')">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="11 17 6 12 11 7"/><polyline points="18 17 13 12 18 7"/></svg>
    </button>
</aside>
</template>

<script>
export default {
    props: {
        translations: { type: Object, default: null },
        sidebarOpen: { type: Boolean, default: false },
        collapsedGroups: { type: Object, default: () => ({}) },
        groupedCategories: { type: Array, default: () => [] },
        activeCategory: { type: String, default: null },
        categoryCounts: { type: Object, default: () => ({}) },
        favoriteIds: { type: Array, default: () => [] },
        recentIds: { type: Array, default: () => [] },
        buildPlannerActive: { type: Boolean, default: false },
        versionCompareActive: { type: Boolean, default: false },
        startingLoadoutsActive: { type: Boolean, default: false },
        hasStartingLoadouts: { type: Boolean, default: false },
        hasToolkitRates: { type: Boolean, default: false },
        toolkitRatesCategory: { type: String, default: null },
        favoritesViewActive: { type: Boolean, default: false },
        recentViewActive: { type: Boolean, default: false },
    },
    emits: [
        'toggleGroup', 'selectFavorites', 'selectRecent', 'openVersionCompare',
        'openStartingLoadouts', 'selectCategory', 'toggleSidebarCollapse',
    ],
    inject: ['t', 'tCat', 'categoryHref', 'navHref'],
};
</script>
