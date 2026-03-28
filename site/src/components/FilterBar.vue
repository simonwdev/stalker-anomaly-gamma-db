<template>
<div class="filter-bar-wrapper" v-show="!buildPlannerActive && !versionCompareActive">
            <div class="filter-bar">
                <div class="filter-input-group" v-click-outside="closeFilterPanel">
                    <LucideSearch class="filter-input-icon" :size="14" />
                    <input
                        type="text"
                        :placeholder="t('app_label_filter_placeholder')"
                        :value="filterInput"
                        @input="$emit('update:filterInput', $event.target.value)"
                    >
                    <button v-if="filterInput" class="filter-input-clear" @click="$emit('clearFilterInput')">&times;</button>
                    <button v-if="availableFilters.length > 0" class="filter-btn" @click.stop="toggleFilterPanel()" v-tooltip="t('app_label_filters')">
                        <LucideSlidersHorizontal :size="14" />
                        <span v-if="activeFilterCount > 0" class="filter-badge">{{ activeFilterCount }}</span>
                    </button>
                    <div class="filter-panel" v-show="filterPanelOpen" @click.stop>
                        <div class="filter-panel-header">
                            <span>{{ t('app_label_filters') }}</span>
                            <a v-if="activeFilterCount > 0" href="#" class="filter-clear" @click.prevent="$emit('clearAllFilters')">{{ t('app_label_clear_all') }}</a>
                            <button class="filter-panel-close" @click="filterPanelOpen = false">&times;</button>
                        </div>
                        <template v-for="def in availableFilters" :key="def.key">
                            <div v-if="def.type !== 'range'" class="filter-group">
                                <div class="filter-group-label">{{ t(def.label) }}</div>
                                <div v-if="def.type === 'discrete'" class="filter-chips">
                                    <button
                                        v-if="def.key === 'ui_ammo_types'"
                                        class="filter-chip filter-chip-alt"
                                        :class="{ active: includeAltAmmo }"
                                        @click="$emit('toggleIncludeAltAmmo')"
                                    >{{ t('app_filter_include_alt_ammo') }}</button>
                                    <button
                                        v-for="v in def.values"
                                        :key="v"
                                        class="filter-chip"
                                        :class="{ active: isDiscreteActive(def.key, v) }"
                                        :style="filterChipStyle(def.key, v)"
                                        @click="$emit('toggleDiscreteFilter', def.key, v)"
                                    >{{ filterValueLabel(def, v) }}</button>
                                </div>
                                <div v-else-if="def.type === 'has-effect'" class="filter-chips">
                                    <button
                                        v-for="v in def.values"
                                        :key="v"
                                        class="filter-chip"
                                        :class="{ active: isDiscreteActive(def.key, v) }"
                                        @click="$emit('toggleDiscreteFilter', def.key, v)"
                                    >{{ t(v) }}</button>
                                </div>
                                <div v-else-if="def.type === 'flag'" class="filter-chips">
                                    <button
                                        class="filter-chip"
                                        :class="{ active: activeFilters[def.key] === true }"
                                        @click="$emit('toggleFlagFilter', def.key, true)"
                                    >{{ t('app_label_yes') }}</button>
                                    <button
                                        class="filter-chip"
                                        :class="{ active: activeFilters[def.key] === false }"
                                        @click="$emit('toggleFlagFilter', def.key, false)"
                                    >{{ t('app_label_no') }}</button>
                                </div>
                            </div>
                        </template>
                        <div v-if="rangeFilters.length > 0" class="range-filters-grid">
                            <div class="range-filters-col">
                                <div v-for="def in rangeFiltersLeft" :key="def.key" class="range-filter-cell">
                                    <div class="filter-group-label">{{ t(def.label) }}</div>
                                    <div class="range-inputs">
                                        <div class="range-input-wrap">
                                            <input type="number" class="range-input"
                                                   :placeholder="def.dataMin" :step="def.step"
                                                   :value="activeFilters[def.key]?.[0] ?? ''"
                                                   @input="$emit('setRangeMin', def.key, $event.target.value)">
                                            <div class="range-spinners">
                                                <button class="range-spin-btn" tabindex="-1" @click="$emit('stepRange', def.key, 'min', 1)">&#x25B2;</button>
                                                <button class="range-spin-btn" tabindex="-1" @click="$emit('stepRange', def.key, 'min', -1)">&#x25BC;</button>
                                            </div>
                                        </div>
                                        <span class="range-sep">&ndash;</span>
                                        <div class="range-input-wrap">
                                            <input type="number" class="range-input"
                                                   :placeholder="def.dataMax" :step="def.step"
                                                   :value="activeFilters[def.key]?.[1] ?? ''"
                                                   @input="$emit('setRangeMax', def.key, $event.target.value)">
                                            <div class="range-spinners">
                                                <button class="range-spin-btn" tabindex="-1" @click="$emit('stepRange', def.key, 'max', 1)">&#x25B2;</button>
                                                <button class="range-spin-btn" tabindex="-1" @click="$emit('stepRange', def.key, 'max', -1)">&#x25BC;</button>
                                            </div>
                                        </div>
                                        <span class="range-unit">{{ def.unit || '' }}</span>
                                    </div>
                                </div>
                            </div>
                            <div class="range-filters-divider"></div>
                            <div class="range-filters-col">
                                <div v-for="def in rangeFiltersRight" :key="def.key" class="range-filter-cell">
                                    <div class="filter-group-label">{{ t(def.label) }}</div>
                                    <div class="range-inputs">
                                        <div class="range-input-wrap">
                                            <input type="number" class="range-input"
                                                   :placeholder="def.dataMin" :step="def.step"
                                                   :value="activeFilters[def.key]?.[0] ?? ''"
                                                   @input="$emit('setRangeMin', def.key, $event.target.value)">
                                            <div class="range-spinners">
                                                <button class="range-spin-btn" tabindex="-1" @click="$emit('stepRange', def.key, 'min', 1)">&#x25B2;</button>
                                                <button class="range-spin-btn" tabindex="-1" @click="$emit('stepRange', def.key, 'min', -1)">&#x25BC;</button>
                                            </div>
                                        </div>
                                        <span class="range-sep">&ndash;</span>
                                        <div class="range-input-wrap">
                                            <input type="number" class="range-input"
                                                   :placeholder="def.dataMax" :step="def.step"
                                                   :value="activeFilters[def.key]?.[1] ?? ''"
                                                   @input="$emit('setRangeMax', def.key, $event.target.value)">
                                            <div class="range-spinners">
                                                <button class="range-spin-btn" tabindex="-1" @click="$emit('stepRange', def.key, 'max', 1)">&#x25B2;</button>
                                                <button class="range-spin-btn" tabindex="-1" @click="$emit('stepRange', def.key, 'max', -1)">&#x25BC;</button>
                                            </div>
                                        </div>
                                        <span class="range-unit">{{ def.unit || '' }}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="filter-panel-backdrop" v-show="filterPanelOpen" @click="closeFilterPanel()"></div>
                <div class="sort-wrap" v-show="!favoritesViewActive && !recentViewActive && !isOutfitExchange && !isMaterialsCategory && !isCraftingTrees && !isToolkitRates" v-click-outside="closeSortMenu">
                    <button class="sort-btn" @click.stop="sortMenuOpen = !sortMenuOpen" v-tooltip="t('app_label_sort')">
                        <LucideArrowUpDown :size="14" />
                        <span class="sort-btn-label">{{ headerLabel(sortCol) }}</span>
                        <span class="sort-btn-dir">{{ sortAsc ? '\u25B2' : '\u25BC' }}</span>
                    </button>
                    <div class="sort-menu" v-show="sortMenuOpen" @click.stop>
                        <div class="sort-menu-header">{{ t('app_label_sort_by') }}</div>
                        <button
                            v-for="h in sortableFields"
                            :key="h"
                            class="sort-menu-item"
                            :class="{ active: sortCol === h }"
                            @click="onPickSort(h)"
                        >
                            <span class="sort-menu-check">{{ sortCol === h ? '\u2713' : '' }}</span>
                            <span>{{ headerLabel(h) }}</span>
                        </button>
                        <div class="sort-menu-divider"></div>
                        <button class="sort-menu-item" @click="$emit('toggleSortDir')">
                            <span class="sort-menu-check">{{ sortAsc ? '\u25B2' : '\u25BC' }}</span>
                            <span>{{ sortAsc ? 'Ascending' : 'Descending' }}</span>
                        </button>
                    </div>
                </div>
                <div class="sort-wrap" v-show="isToolkitRates" v-click-outside="closeSortMenu">
                    <button class="sort-btn" @click.stop="sortMenuOpen = !sortMenuOpen" v-tooltip="t('app_label_sort')">
                        <LucideArrowUpDown :size="14" />
                        <span class="sort-btn-label">{{ toolkitSortCol === '_name' ? t('app_label_map') : (toolkitSortCol ? t(toolkitSortCol) : t('app_label_sort')) }}</span>
                        <span class="sort-btn-dir">{{ toolkitSortAsc ? '\u25B2' : '\u25BC' }}</span>
                    </button>
                    <div class="sort-menu" v-show="sortMenuOpen" @click.stop>
                        <div class="sort-menu-header">{{ t('app_label_sort_by') }}</div>
                        <button class="sort-menu-item" :class="{ active: toolkitSortCol === '_name' }" @click="$emit('toggleToolkitSort', '_name'); sortMenuOpen = false">
                            <span class="sort-menu-check">{{ toolkitSortCol === '_name' ? '\u2713' : '' }}</span>
                            <span>{{ t('app_label_map') }}</span>
                        </button>
                        <button v-for="tt in (toolkitRates ? toolkitRates.toolTypes : [])" :key="tt" class="sort-menu-item" :class="{ active: toolkitSortCol === tt }" @click="$emit('toggleToolkitSort', tt); sortMenuOpen = false">
                            <span class="sort-menu-check">{{ toolkitSortCol === tt ? '\u2713' : '' }}</span>
                            <span>{{ t(tt) }}</span>
                        </button>
                        <div class="sort-menu-divider"></div>
                        <button class="sort-menu-item" @click="$emit('toggleToolkitSortDir')">
                            <span class="sort-menu-check">{{ toolkitSortAsc ? '\u25B2' : '\u25BC' }}</span>
                            <span>{{ toolkitSortAsc ? 'Ascending' : 'Descending' }}</span>
                        </button>
                    </div>
                </div>
                <button v-if="!favoritesViewActive && !recentViewActive && !isOutfitExchange && !isCraftingTrees && favoriteIds.length > 0"
                        class="fav-filter-btn" :class="{ active: showFavoritesOnly }"
                        @click="$emit('toggleShowFavoritesOnly')"
                        v-tooltip="showFavoritesOnly ? t('app_tooltip_showing_favs') : t('app_tooltip_show_favs')">
                    <span class="fav-filter-star">&#9733;</span>
                </button>
                <span class="item-count" v-if="!isOutfitExchange && !isCraftingTrees">{{ sortedItems.length }} {{ t('app_label_items') }}</span>
                <span class="item-count" v-if="isOutfitExchange && outfitExchange">{{ filteredExchanges.length }} {{ t('app_label_exchanges') }}</span>
                <div class="view-toggle" v-show="!favoritesViewActive && !recentViewActive && !isOutfitExchange && !isMaterialsCategory && !isCraftingTrees && !isToolkitRates">
                    <button :class="{ active: viewMode === 'table' }" @click="$emit('setViewMode', 'table')" v-tooltip="t('app_label_table_view')">
                        <LucideList :size="16" />
                    </button>
                    <button :class="{ active: viewMode === 'tiles' }" @click="$emit('setViewMode', 'tiles')" v-tooltip="t('app_label_tile_view')">
                        <LucideLayoutGrid :size="16" />
                    </button>
                </div>
                <div class="utility-group">
                    <button class="copy-link-btn" :class="{ copied: copyLinkFeedback }" @click="$emit('copyLink')" v-tooltip="copyLinkFeedback ? t('app_label_copied') : t('app_label_copy_link_view')">
                        <LucideLink v-show="!copyLinkFeedback" :size="16" />
                        <svg v-show="copyLinkFeedback" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    </button>
                    <div class="download-wrap" v-show="(!isOutfitExchange && !isMaterialsCategory && !isCraftingTrees) || isToolkitRates"
                         v-click-outside="closeDownloadMenu">
                        <button class="download-btn" @click.stop="downloadMenuOpen = !downloadMenuOpen" v-tooltip="t('app_label_download')">
                            <LucideDownload :size="16" />
                        </button>
                        <div class="download-menu" v-show="downloadMenuOpen">
                            <button class="download-menu-item" @click="onDownload('csv')">{{ t('app_label_download_csv') }}</button>
                            <button class="download-menu-item" @click="onDownload('json')">{{ t('app_label_download_json') }}</button>
                        </div>
                    </div>
                    <div class="settings-wrap" v-show="!isToolkitRates" v-click-outside="closeSettings">
                        <button class="settings-btn" @click.stop="settingsOpen = !settingsOpen" v-tooltip="t('app_label_settings')">
                            <LucideSettings :size="16" />
                        </button>
                        <div class="settings-menu" v-show="settingsOpen">
                            <div class="settings-header">{{ t('app_label_display') }}</div>
                            <div class="settings-item" @click.stop="$emit('toggleHideNoDrop')">
                                <span class="toggle-switch" :class="{ on: hideNoDrop }"><span class="toggle-knob"></span></span>
                                <span>{{ t('app_label_hide_no_drop') }}</span>
                            </div>
                            <div class="settings-item" @click.stop="$emit('toggleHideUnusedAmmo')">
                                <span class="toggle-switch" :class="{ on: hideUnusedAmmo }"><span class="toggle-knob"></span></span>
                                <span>{{ t('app_label_hide_unused_ammo') }}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="active-filters" v-if="activeFilterChips.length > 0">
                <span v-for="(chip, idx) in activeFilterChips" :key="idx" class="active-filter-chip">
                    <span class="active-filter-label">{{ t(chip.label) }}<template v-if="chip.display">: {{ chip.display }}</template></span>
                    <button class="active-filter-remove" @click="$emit('removeFilter', chip)">&times;</button>
                </span>
                <a href="#" class="filter-clear-inline" @click.prevent="$emit('clearAllFilters')">{{ t('app_label_clear_all') }}</a>
            </div>
</div>
</template>

<script>
export default {
    name: 'FilterBar',
    inject: ['t', 'headerLabel', 'filterChipStyle', 'filterValueLabel', 'isDiscreteActive'],
    props: {
        filterInput: { type: String, default: '' },
        filterQuery: { type: String, default: '' },
        availableFilters: { type: Array, default: () => [] },
        rangeFilters: { type: Array, default: () => [] },
        rangeFiltersLeft: { type: Array, default: () => [] },
        rangeFiltersRight: { type: Array, default: () => [] },
        activeFilters: { type: Object, default: () => ({}) },
        activeFilterCount: { type: Number, default: 0 },
        activeFilterChips: { type: Array, default: () => [] },
        includeAltAmmo: { type: Boolean, default: false },
        sortCol: { type: String, default: '' },
        sortAsc: { type: Boolean, default: true },
        sortableFields: { type: Array, default: () => [] },
        viewMode: { type: String, default: 'table' },
        sortedItems: { type: Array, default: () => [] },
        favoriteIds: { type: Array, default: () => [] },
        showFavoritesOnly: { type: Boolean, default: false },
        copyLinkFeedback: { type: Boolean, default: false },
        favoritesViewActive: { type: Boolean, default: false },
        recentViewActive: { type: Boolean, default: false },
        isOutfitExchange: { type: Boolean, default: false },
        isMaterialsCategory: { type: Boolean, default: false },
        isCraftingTrees: { type: Boolean, default: false },
        isToolkitRates: { type: Boolean, default: false },
        outfitExchange: { type: Object, default: null },
        filteredExchanges: { type: Array, default: () => [] },
        hideNoDrop: { type: Boolean, default: false },
        hideUnusedAmmo: { type: Boolean, default: false },
        toolkitRates: { type: Object, default: null },
        toolkitSortCol: { type: String, default: '' },
        toolkitSortAsc: { type: Boolean, default: true },
        buildPlannerActive: { type: Boolean, default: false },
        versionCompareActive: { type: Boolean, default: false },
    },
    emits: [
        'update:filterInput',
        'clearFilterInput',
        'clearAllFilters',
        'toggleDiscreteFilter',
        'toggleFlagFilter',
        'setRangeMin',
        'setRangeMax',
        'stepRange',
        'removeFilter',
        'toggleIncludeAltAmmo',
        'pickSort',
        'toggleSortDir',
        'toggleToolkitSort',
        'toggleToolkitSortDir',
        'toggleShowFavoritesOnly',
        'setViewMode',
        'copyLink',
        'downloadData',
        'toggleHideNoDrop',
        'toggleHideUnusedAmmo',
    ],
    data() {
        return {
            filterPanelOpen: false,
            sortMenuOpen: false,
            downloadMenuOpen: false,
            settingsOpen: false,
            _filterPanelCleanup: null,
        };
    },
    methods: {
        toggleFilterPanel() {
            if (this.filterPanelOpen) {
                this.closeFilterPanel();
                return;
            }
            this.filterPanelOpen = true;
            this.$nextTick(() => {
                const btn = this.$el.querySelector('.filter-btn');
                const panel = this.$el.querySelector('.filter-panel');
                if (!btn || !panel) return;
                const isMobile = window.matchMedia('(max-width: 768px)').matches;
                const contentWidth = this.$el.querySelector('.filter-bar')?.offsetWidth || window.innerWidth;
                if (isMobile || contentWidth < 600) {
                    panel.classList.add('filter-panel-fullscreen');
                    document.body.classList.add('filter-fullscreen-active');
                    return;
                }
                panel.classList.remove('filter-panel-fullscreen');
                document.body.classList.remove('filter-fullscreen-active');
                this._filterPanelCleanup = FloatingUIDOM.autoUpdate(btn, panel, () => {
                    FloatingUIDOM.computePosition(btn, panel, {
                        strategy: 'fixed',
                        placement: 'bottom-start',
                        middleware: [
                            FloatingUIDOM.offset(6),
                            FloatingUIDOM.flip(),
                            FloatingUIDOM.shift({
                                padding: 8,
                                crossAxis: false,
                                boundary: {
                                    x: 0, y: 0,
                                    width: window.innerWidth,
                                    height: window.innerHeight,
                                },
                            }),
                        ],
                    }).then(({ x, y }) => {
                        Object.assign(panel.style, { position: 'fixed', left: `${x}px`, top: `${y}px` });
                    });
                });
            });
        },
        closeFilterPanel() {
            this.filterPanelOpen = false;
            if (this._filterPanelCleanup) {
                this._filterPanelCleanup();
                this._filterPanelCleanup = null;
            }
            const panel = this.$el.querySelector('.filter-panel');
            if (panel) {
                panel.style.left = ''; panel.style.top = '';
                panel.classList.remove('filter-panel-fullscreen');
            }
            document.body.classList.remove('filter-fullscreen-active');
        },
        closeSortMenu() {
            this.sortMenuOpen = false;
        },
        closeDownloadMenu() {
            this.downloadMenuOpen = false;
        },
        closeSettings() {
            this.settingsOpen = false;
        },
        onPickSort(col) {
            this.sortMenuOpen = false;
            this.$emit('pickSort', col);
        },
        onDownload(format) {
            this.downloadMenuOpen = false;
            this.$emit('downloadData', format);
        },
        /** Called by parent (via ref) to close all open panels — used by handleEscape */
        closeAllPanels() {
            if (this.sortMenuOpen) {
                this.sortMenuOpen = false;
                return true;
            }
            if (this.downloadMenuOpen) {
                this.downloadMenuOpen = false;
                return true;
            }
            if (this.settingsOpen) {
                this.settingsOpen = false;
                return true;
            }
            if (this.filterPanelOpen) {
                this.closeFilterPanel();
                return true;
            }
            return false;
        },
        /** Returns true if any panel is currently open */
        hasOpenPanel() {
            return this.filterPanelOpen || this.sortMenuOpen || this.downloadMenuOpen || this.settingsOpen;
        },
    },
};
</script>
