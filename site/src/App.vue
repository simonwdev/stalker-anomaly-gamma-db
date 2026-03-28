<template>
<div id="app" @keydown.escape.window="handleEscape()">
<transition name="toast-fade">
    <div v-if="toastMessage" class="toast" :class="'toast--' + toastType" @click="toastMessage = ''">{{ toastMessage }}</div>
</transition>

<!-- What's New banner -->
<transition name="whats-new">
    <div v-if="whatsNewVisible" class="whats-new-banner">
        <div class="whats-new-header">
            <span>{{ t('app_whats_new') }}</span>
            <button class="whats-new-close" @click="dismissWhatsNew()">&times;</button>
        </div>
        <div class="whats-new-entries">
            <div v-for="(entry, i) in whatsNewEntries" :key="i" class="whats-new-entry" :class="{ clickable: entry.action }" @click="whatsNewAction(entry)">
                <span class="whats-new-emoji">{{ whatsNewEmoji(entry.type) }}</span>
                <span class="whats-new-text">{{ entry.summaryKey ? t(entry.summaryKey) : (entry.summary || entry.text) }}</span>
                <svg v-if="entry.action" class="whats-new-arrow" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
            </div>
        </div>
        <div class="whats-new-footer">
            <a href="release-notes/" @click="dismissWhatsNew()">{{ t('app_whats_new_view_all') }}</a>
            <button class="whats-new-dismiss" @click="dismissWhatsNew()">{{ t('app_whats_new_dismiss') }}</button>
        </div>
    </div>
</transition>

<!-- Feature callout spotlight -->
<div v-if="calloutActive" class="callout-overlay" @click.self="dismissCallout()">
    <div class="callout-spotlight" :style="calloutSpotlightStyle"></div>
    <div class="callout-popover" ref="calloutPopover" :style="calloutPopoverStyle">
        <div class="callout-arrow" ref="calloutArrow" :data-side="calloutArrowSide" :style="calloutArrowStyle"></div>
        <div class="callout-popover-title">{{ calloutTitle }}</div>
        <div class="callout-popover-desc">{{ calloutDesc }}</div>
        <div class="callout-popover-actions">
            <button class="callout-popover-next" @click="dismissCallout()">{{ t('app_callout_done') }}</button>
        </div>
    </div>
</div>

<HeaderBar
    :translations="translations"
    :active-pack="activePack"
    :packs="packs"
    :locale="locale"
    :LOCALES="LOCALES"
    :global-query="globalQuery"
    :global-results="globalResults"
    :has-unseen-release-notes="hasUnseenReleaseNotes"
    :sidebar-collapsed="sidebarCollapsed"
    :sidebar-open="sidebarOpen"
    @toggle-sidebar-collapse="toggleSidebarCollapse()"
    @toggle-sidebar="toggleSidebar()"
    @switch-pack="(p) => { activePack = p; switchPack() }"
    @change-locale="(id) => { locale = id; onLocaleChange() }"
    @open-shortcut-help="shortcutHelpOpen = true"
    @clear-global-query="clearGlobalQuery()"
    @update:global-query="(v) => globalQuery = v"
    @search="debouncedGlobalSearch()"
    @escape-search="if (globalQuery.trim()) lastGlobalQuery = globalQuery; globalQuery = ''"
    @select-search-result="(id) => { lastGlobalQuery = globalQuery; globalQuery = ''; navigateToItem(id) }"
/>

<div class="layout" :class="{ 'sidebar-collapsed': sidebarCollapsed }">
    <SidebarNav
        :translations="translations"
        :sidebar-open="sidebarOpen"
        :collapsed-groups="collapsedGroups"
        :grouped-categories="groupedCategories"
        :active-category="activeCategory"
        :category-counts="categoryCounts"
        :favorite-ids="favoriteIds"
        :recent-ids="recentIds"
        :build-planner-active="buildPlannerActive"
        :version-compare-active="versionCompareActive"
        :favorites-view-active="favoritesViewActive"
        :recent-view-active="recentViewActive"
        @toggle-group="toggleGroup"
        @open-build-planner="openBuildPlanner()"
        @select-favorites="selectFavorites()"
        @select-recent="selectRecent()"
        @select-category="selectCategory"
        @toggle-sidebar-collapse="toggleSidebarCollapse()"
    />
    <div class="sidebar-backdrop" v-show="sidebarOpen" @click="closeSidebar()"></div>

    <main class="content">
        <div v-show="showContentSpinner" class="loading-screen">
            <div class="loading-spinner"></div>
            <p class="loading-text">{{ t('app_label_loading') }}</p>
        </div>
        <div v-show="!loading" class="content-inner">
            <div class="filter-bar" v-show="!buildPlannerActive && !versionCompareActive">
                <div class="filter-input-group" v-click-outside="closeFilterPanel">
                    <LucideSearch class="filter-input-icon" :size="14" />
                    <input
                        type="text"
                        :placeholder="t('app_label_filter_placeholder')"
                        v-model="filterInput"
                    >
                    <button v-if="filterInput" class="filter-input-clear" @click="filterInput = ''; filterQuery = '';">&times;</button>
                    <button v-if="availableFilters.length > 0" class="filter-btn" @click.stop="toggleFilterPanel()" v-tooltip="t('app_label_filters')">
                        <LucideSlidersHorizontal :size="14" />
                        <span v-if="activeFilterCount > 0" class="filter-badge">{{ activeFilterCount }}</span>
                    </button>
                    <div class="filter-panel" v-show="filterPanelOpen" @click.stop>
                        <div class="filter-panel-header">
                            <span>{{ t('app_label_filters') }}</span>
                            <a v-if="activeFilterCount > 0" href="#" class="filter-clear" @click.prevent="clearAllFilters()">{{ t('app_label_clear_all') }}</a>
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
                                        @click="includeAltAmmo = !includeAltAmmo; pushUrlState()"
                                    >{{ t('app_filter_include_alt_ammo') }}</button>
                                    <button
                                        v-for="v in def.values"
                                        :key="v"
                                        class="filter-chip"
                                        :class="{ active: isDiscreteActive(def.key, v) }"
                                        :style="filterChipStyle(def.key, v)"
                                        @click="toggleDiscreteFilter(def.key, v)"
                                    >{{ filterValueLabel(def, v) }}</button>
                                </div>
                                <div v-else-if="def.type === 'has-effect'" class="filter-chips">
                                    <button
                                        v-for="v in def.values"
                                        :key="v"
                                        class="filter-chip"
                                        :class="{ active: isDiscreteActive(def.key, v) }"
                                        @click="toggleDiscreteFilter(def.key, v)"
                                    >{{ t(v) }}</button>
                                </div>
                                <div v-else-if="def.type === 'flag'" class="filter-chips">
                                    <button
                                        class="filter-chip"
                                        :class="{ active: activeFilters[def.key] === true }"
                                        @click="toggleFlagFilter(def.key, true)"
                                    >{{ t('app_label_yes') }}</button>
                                    <button
                                        class="filter-chip"
                                        :class="{ active: activeFilters[def.key] === false }"
                                        @click="toggleFlagFilter(def.key, false)"
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
                                                   @input="setRangeMin(def.key, $event.target.value)">
                                            <div class="range-spinners">
                                                <button class="range-spin-btn" tabindex="-1" @click="stepRange(def.key, 'min', 1)">&#x25B2;</button>
                                                <button class="range-spin-btn" tabindex="-1" @click="stepRange(def.key, 'min', -1)">&#x25BC;</button>
                                            </div>
                                        </div>
                                        <span class="range-sep">&ndash;</span>
                                        <div class="range-input-wrap">
                                            <input type="number" class="range-input"
                                                   :placeholder="def.dataMax" :step="def.step"
                                                   :value="activeFilters[def.key]?.[1] ?? ''"
                                                   @input="setRangeMax(def.key, $event.target.value)">
                                            <div class="range-spinners">
                                                <button class="range-spin-btn" tabindex="-1" @click="stepRange(def.key, 'max', 1)">&#x25B2;</button>
                                                <button class="range-spin-btn" tabindex="-1" @click="stepRange(def.key, 'max', -1)">&#x25BC;</button>
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
                                                   @input="setRangeMin(def.key, $event.target.value)">
                                            <div class="range-spinners">
                                                <button class="range-spin-btn" tabindex="-1" @click="stepRange(def.key, 'min', 1)">&#x25B2;</button>
                                                <button class="range-spin-btn" tabindex="-1" @click="stepRange(def.key, 'min', -1)">&#x25BC;</button>
                                            </div>
                                        </div>
                                        <span class="range-sep">&ndash;</span>
                                        <div class="range-input-wrap">
                                            <input type="number" class="range-input"
                                                   :placeholder="def.dataMax" :step="def.step"
                                                   :value="activeFilters[def.key]?.[1] ?? ''"
                                                   @input="setRangeMax(def.key, $event.target.value)">
                                            <div class="range-spinners">
                                                <button class="range-spin-btn" tabindex="-1" @click="stepRange(def.key, 'max', 1)">&#x25B2;</button>
                                                <button class="range-spin-btn" tabindex="-1" @click="stepRange(def.key, 'max', -1)">&#x25BC;</button>
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
                            @click="pickSort(h)"
                        >
                            <span class="sort-menu-check">{{ sortCol === h ? '\u2713' : '' }}</span>
                            <span>{{ headerLabel(h) }}</span>
                        </button>
                        <div class="sort-menu-divider"></div>
                        <button class="sort-menu-item" @click="sortAsc = !sortAsc; pushUrlState()">
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
                        <button class="sort-menu-item" :class="{ active: toolkitSortCol === '_name' }" @click="toggleToolkitSort('_name'); sortMenuOpen = false">
                            <span class="sort-menu-check">{{ toolkitSortCol === '_name' ? '\u2713' : '' }}</span>
                            <span>{{ t('app_label_map') }}</span>
                        </button>
                        <button v-for="tt in (toolkitRates ? toolkitRates.toolTypes : [])" :key="tt" class="sort-menu-item" :class="{ active: toolkitSortCol === tt }" @click="toggleToolkitSort(tt); sortMenuOpen = false">
                            <span class="sort-menu-check">{{ toolkitSortCol === tt ? '\u2713' : '' }}</span>
                            <span>{{ t(tt) }}</span>
                        </button>
                        <div class="sort-menu-divider"></div>
                        <button class="sort-menu-item" @click="toolkitSortAsc = !toolkitSortAsc">
                            <span class="sort-menu-check">{{ toolkitSortAsc ? '\u25B2' : '\u25BC' }}</span>
                            <span>{{ toolkitSortAsc ? 'Ascending' : 'Descending' }}</span>
                        </button>
                    </div>
                </div>
                <button v-if="!favoritesViewActive && !recentViewActive && !isOutfitExchange && !isCraftingTrees && favoriteIds.length > 0"
                        class="fav-filter-btn" :class="{ active: showFavoritesOnly }"
                        @click="showFavoritesOnly = !showFavoritesOnly; pushUrlState()"
                        v-tooltip="showFavoritesOnly ? t('app_tooltip_showing_favs') : t('app_tooltip_show_favs')">
                    <span class="fav-filter-star">&#9733;</span>
                </button>
                <span class="item-count" v-if="!isOutfitExchange && !isCraftingTrees">{{ sortedItems.length }} {{ t('app_label_items') }}</span>
                <span class="item-count" v-if="isOutfitExchange && outfitExchange">{{ filteredExchanges.length }} {{ t('app_label_exchanges') }}</span>
                <div class="view-toggle" v-show="!favoritesViewActive && !recentViewActive && !isOutfitExchange && !isMaterialsCategory && !isCraftingTrees && !isToolkitRates">
                    <button :class="{ active: viewMode === 'table' }" @click="setViewMode('table')" v-tooltip="t('app_label_table_view')">
                        <LucideList :size="16" />
                    </button>
                    <button :class="{ active: viewMode === 'tiles' }" @click="setViewMode('tiles')" v-tooltip="t('app_label_tile_view')">
                        <LucideLayoutGrid :size="16" />
                    </button>
                </div>
                <div class="utility-group">
                    <button class="copy-link-btn" :class="{ copied: copyLinkFeedback }" @click="copyLink()" v-tooltip="copyLinkFeedback ? t('app_label_copied') : t('app_label_copy_link_view')">
                        <LucideLink v-show="!copyLinkFeedback" :size="16" />
                        <svg v-show="copyLinkFeedback" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    </button>
                    <div class="download-wrap" v-show="(!isOutfitExchange && !isMaterialsCategory && !isCraftingTrees) || isToolkitRates"
                         v-click-outside="closeDownloadMenu">
                        <button class="download-btn" @click.stop="downloadMenuOpen = !downloadMenuOpen" v-tooltip="t('app_label_download')">
                            <LucideDownload :size="16" />
                        </button>
                        <div class="download-menu" v-show="downloadMenuOpen">
                            <button class="download-menu-item" @click="downloadData('csv')">{{ t('app_label_download_csv') }}</button>
                            <button class="download-menu-item" @click="downloadData('json')">{{ t('app_label_download_json') }}</button>
                        </div>
                    </div>
                    <div class="settings-wrap" v-show="!isToolkitRates" v-click-outside="closeSettings">
                        <button class="settings-btn" @click.stop="settingsOpen = !settingsOpen" v-tooltip="t('app_label_settings')">
                            <LucideSettings :size="16" />
                        </button>
                        <div class="settings-menu" v-show="settingsOpen">
                            <div class="settings-header">{{ t('app_label_display') }}</div>
                            <div class="settings-item" @click.stop="toggleHideNoDrop()">
                                <span class="toggle-switch" :class="{ on: hideNoDrop }"><span class="toggle-knob"></span></span>
                                <span>{{ t('app_label_hide_no_drop') }}</span>
                            </div>
                            <div class="settings-item" @click.stop="toggleHideUnusedAmmo()">
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
                    <button class="active-filter-remove" @click="removeFilter(chip)">&times;</button>
                </span>
                <a href="#" class="filter-clear-inline" @click.prevent="clearAllFilters()">{{ t('app_label_clear_all') }}</a>
            </div>
            <div v-if="favoritesViewActive && favoriteIds.length === 0" class="favorites-empty">
                <p>{{ t('app_label_no_favorites_1') }} <span class="fav-icon-inline">&#9734;</span> {{ t('app_label_no_favorites_2') }}</p>
            </div>
            <div v-if="recentViewActive && recentIds.length === 0" class="favorites-empty">
                <p>{{ t('app_label_no_recent') }}</p>
            </div>
            <!-- Outfit Exchange cards -->
            <div v-if="isOutfitExchange && outfitExchange" class="exchange-view">
                <div class="exchange-faction-chips">
                    <button class="exchange-chip" :class="{ active: !exchangeFactionFilter }" @click="exchangeFactionFilter = null">{{ t('app_label_all') }}</button>
                    <button v-for="f in exchangeFactions" :key="f" class="exchange-chip" :class="{ active: exchangeFactionFilter === f }" @click="exchangeFactionFilter = exchangeFactionFilter === f ? null : f">
                        <img v-if="factionIcon(f)" :src="'img/' + factionIcon(f)" :alt="f" class="exchange-chip-icon">
                        <span>{{ t(f) }}</span>
                    </button>
                </div>
                <div class="tile-grid">
                    <div v-for="ex in filteredExchanges" :key="ex.name + ex.sourceFaction" class="tile-card exchange-card">
                        <div class="tile-card-header">
                            <a v-if="exchangeItemId(ex.name)" href="#" @click.prevent.stop="navigateToItem(exchangeItemId(ex.name))" class="tile-card-name">{{ t(ex.name) }}</a>
                            <span v-else class="tile-card-name">{{ t(ex.name) }}</span>
                            <span v-if="ex.sourceFaction" class="exchange-source-badge">{{ t(ex.sourceFaction) }}</span>
                        </div>
                        <div class="exchange-results">
                            <template v-for="f in exchangeVisibleFactions" :key="f">
                                <div v-if="ex.results[f]" class="exchange-result-row">
                                    <span class="exchange-result-faction">
                                        <img v-if="factionIcon(f)" :src="'img/' + factionIcon(f)" :alt="f" class="exchange-result-icon">
                                        <span>{{ t(f) }}</span>
                                    </span>
                                    <span class="exchange-result-name">
                                        <a v-if="exchangeItemId(ex.results[f])" href="#" @click.prevent.stop="navigateToItem(exchangeItemId(ex.results[f]))">{{ t(ex.results[f]) }}</a>
                                        <span v-else>{{ t(ex.results[f]) }}</span>
                                    </span>
                                </div>
                            </template>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Toolkit Rates heatmap table -->
            <div v-if="isToolkitRates && toolkitRates" class="toolkit-rates-view">
                <div class="table-wrap">
                    <table class="toolkit-rates-table">
                        <thead>
                        <tr>
                            <th class="toolkit-map-col" @click="toggleToolkitSort('_name')">
                                <span>{{ t('app_label_map') }}</span><span class="sort-icon">{{ toolkitSortIcon('_name') }}</span>
                            </th>
                            <th v-for="tt in toolkitRates.toolTypes" :key="tt" @click="toggleToolkitSort(tt)" class="toolkit-rate-col">
                                <span>{{ t(tt) }}</span><span class="sort-icon">{{ toolkitSortIcon(tt) }}</span>
                            </th>
                        </tr>
                        </thead>
                        <tbody>
                        <tr v-for="map in toolkitRatesSorted" :key="map.id">
                            <td class="toolkit-map-col">{{ t(map.id) }}</td>
                            <td v-for="tt in toolkitRates.toolTypes" :key="tt" class="toolkit-rate-col" :style="toolkitHeatBg(map.rates[tt])">
                                {{ map.rates[tt] ? map.rates[tt] + '%' : '--' }}
                            </td>
                        </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- Materials view -->
            <div class="tile-grid" v-if="isMaterialsCategory">
                <div v-for="item in sortedItems" :key="item.id" class="tile-card recipe-card">
                    <div class="tile-card-header">
                        <span class="tile-card-name">{{ tName(item) }}</span>
                    </div>
                    <div class="material-sources" v-if="item.sources">
                        <div v-for="(src, idx) in item.sources" :key="idx" class="material-source">
                            <span class="recipe-ing-amount">x{{ src.amount }}</span>
                            <span class="material-from">{{ t('app_label_from') }}</span>
                            <template v-if="findItemByName(src.name)">
                                <a href="#" @click.prevent.stop="navigateToItem(findItemByName(src.name).id)">{{ t(src.name) }}</a>
                            </template>
                            <template v-else>
                                <span>{{ t(src.name) }}</span>
                            </template>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Crafting Trees view -->
            <div v-if="isCraftingTrees" class="crafting-trees-view">
                <div class="crafting-trees-toolbar">
                    <button class="filter-chip" @click="craftingTreeExpandAll ? collapseAllTrees() : expandAllTrees()">
                        {{ craftingTreeExpandAll ? t('app_label_collapse_all') : t('app_label_expand_all') }}
                    </button>
                    <span class="item-count">{{ filteredCraftingTrees.length }} {{ t('app_label_recipes') }}</span>
                </div>
                <div class="tile-grid">
                    <div v-for="tree in filteredCraftingTrees" :key="tree.id" class="tile-card crafting-tree-card">
                        <div class="tile-card-header">
                            <a href="#" @click.prevent.stop="navigateToItem(tree.id)" class="tile-card-name">{{ t(tree.name) }}</a>
                        </div>
                        <div class="crafting-tree-body">
                            <div
                                v-for="(row, idx) in flattenTree(tree)"
                                :key="row.path"
                                class="tree-row"
                                :style="{ paddingLeft: (row.depth * 1.2 + 0.3) + 'rem' }"
                            >
                                <span
                                    v-if="row.hasChildren"
                                    class="tree-toggle"
                                    @click.stop="toggleTreeNode(row.path)"
                                >{{ row.isExpanded ? '\u25BC' : '\u25B6' }}</span>
                                <span v-else class="tree-leaf-dot">&bull;</span>
                                <template v-if="row.itemRef">
                                    <a href="#" @click.prevent.stop="navigateToItem(row.itemRef.id)">{{ t(row.name) }}</a>
                                </template>
                                <template v-else>
                                    <span class="tree-raw">{{ t(row.name) }}</span>
                                </template>
                                <span class="recipe-ing-amount">{{ row.amount }}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Version Compare view -->
            <div v-if="versionCompareActive" class="version-compare-view">
                <div class="version-compare-header">
                    <div class="version-compare-picker">
                        <span class="version-compare-pack">{{ activePack.name }}</span>
                        <span class="diff-arrow">▶</span>
                        <div v-if="packs.length > 1" class="compare-wrap" v-click-outside="closeCompareMenu">
                            <button class="version-compare-pack-btn" @click.stop="compareMenuOpen = !compareMenuOpen">
                                {{ crossPackId ? crossPackName : t('app_label_select_pack') }}
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
                            </button>
                            <div class="compare-menu" v-show="compareMenuOpen" @click.stop>
                                <button v-for="p in crossPackOptions" :key="p.id" class="sort-menu-item" :class="{ active: crossPackId === p.id }" @click="pickComparePack(p.id)">
                                    <span class="sort-menu-check">{{ crossPackId === p.id ? '\u2713' : '' }}</span>
                                    <span>{{ p.name }}</span>
                                </button>
                            </div>
                        </div>
                    </div>
                    <template v-if="versionCompareResults.length">
                        <div class="filter-input-group">
                            <svg class="filter-input-icon" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                            <input type="text" v-model="versionCompareFilter" :placeholder="t('app_label_filter_placeholder')" class="filter-input">
                        </div>
                        <span class="version-compare-count">{{ versionCompareTotal }} {{ t('app_label_changes') }}</span>
                        <span class="version-compare-spacer"></span>
                        <div class="utility-group">
                            <button class="copy-link-btn" :class="{ copied: copyLinkFeedback }" @click="copyLink()" v-tooltip="copyLinkFeedback ? t('app_label_copied') : t('app_label_copy_link')">
                                <svg v-if="copyLinkFeedback" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                                <svg v-else xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                            </button>
                            <button class="copy-link-btn" @click="exportVersionCompare()" v-tooltip="t('app_label_download')">
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
                            <div v-for="item in group.items" :key="item.id" class="version-compare-item" @click="navigateToItem(item.id)">
                                <span class="version-compare-cat">{{ t(singularCategory(group.category)) || tCat(group.category) }}</span>
                                <span class="version-compare-name">{{ item.name }}</span>
                                <span class="version-compare-changes">
                                    <span v-for="d in item.diffs.slice(0, 2)" :key="d.key" class="version-compare-stat">
                                        <span class="version-compare-stat-label">{{ headerLabel(d.key) }}</span>
                                        <span class="diff-old">{{ formatValue(d.key, d.oldVal) }}</span><span class="diff-arrow">▶</span><span class="diff-new" :class="d.type === 'higher' ? 'diff-up' : 'diff-down'">{{ formatValue(d.key, d.newVal) }}</span>
                                    </span>
                                    <span v-if="item.diffs.length > 2" class="version-compare-more">+{{ item.diffs.length - 2 }} more</span>
                                </span>
                            </div>
                        </template>
                    </div>
                </template>
            </div>

            <!-- Build Planner view -->
            <div v-if="buildPlannerActive" class="build-planner">
                <!-- Player Header -->
                <div class="build-player-header">
                    <div class="build-player-faction" @click="buildFactionPickerOpen = !buildFactionPickerOpen">
                        <img :src="'img/' + factionIcon(buildPlayerFaction)" class="build-player-faction-icon" :alt="buildPlayerFaction">
                        <svg class="build-player-faction-overlay" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m17 1 4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="m7 23-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>
                        <div v-if="buildFactionPickerOpen" class="build-faction-picker" @click.stop>
                            <div v-for="f in factionList" :key="f.id" class="build-faction-option" :class="{ active: buildPlayerFaction === f.id }" @click="buildPlayerFaction = f.id; buildFactionPickerOpen = false">
                                <img :src="'img/' + factionIcon(f.id)" class="build-faction-option-icon">
                                <span>{{ f.label }}</span>
                            </div>
                        </div>
                    </div>
                    <div class="build-player-info">
                        <div class="build-player-name-wrap">
                            <input class="build-player-name" v-model="buildPlayerName" spellcheck="false" maxlength="24">
                            <svg class="build-player-name-edit" xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                        </div>
                    </div>
                    <div class="build-header-actions">
                        <button class="build-header-icon save-import-btn" v-tooltip="t('app_save_import_title') || 'Import Save File'" @click="openSaveImport()">
                            <LucideFileUp :size="16" />
                        </button>
                        <div class="build-saved-dropdown" v-click-outside="() => buildSavedDropdownOpen = false">
                            <button class="build-header-icon" v-tooltip="t('app_build_saved_builds')" @click="buildSavedDropdownOpen = !buildSavedDropdownOpen">
                                <LucideBookmark :size="16" />
                                <span v-if="buildSavedBuilds.length" class="build-header-badge">{{ buildSavedBuilds.length }}</span>
                            </button>
                            <div v-if="buildSavedDropdownOpen" class="build-saved-menu">
                                <div v-if="buildSavedBuilds.length > 0" class="build-saved-list">
                                    <div v-for="(build, idx) in buildSavedBuilds" :key="idx" class="build-saved-item">
                                        <span class="build-saved-name" @click="loadSavedBuild(build); buildSavedDropdownOpen = false">{{ build.name }}</span>
                                        <button class="build-saved-delete" @click="deleteSavedBuild(idx)">&times;</button>
                                    </div>
                                </div>
                                <div v-else class="build-saved-empty">{{ t('app_build_no_saved') }}</div>
                            </div>
                        </div>
                        <button class="build-header-icon" v-tooltip="t('app_build_save')" @click="buildSaveModalOpen = true">
                            <LucideSave :size="16" />
                        </button>
                        <button class="build-header-icon" v-tooltip="t('app_build_clear')" @click="clearBuild()">
                            <LucideTrash2 :size="16" />
                        </button>
                        <button class="build-header-icon" :class="{ copied: copyBuildLinkFeedback }" :disabled="buildSharing" v-tooltip="copyBuildLinkFeedback ? t('app_label_copied') : t('app_label_copy_link')" @click="copyBuildLink()">
                            <span v-if="buildSharing && !copyBuildLinkFeedback" class="loading-spinner loading-spinner-sm"></span>
                            <span v-else-if="copyBuildLinkFeedback"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></span>
                            <span v-else><LucideLink :size="16" /></span>
                        </button>
                        <button class="build-header-icon" :class="{ copied: copyBuildCodeFeedback }" :disabled="buildSharing" v-tooltip="copyBuildCodeFeedback ? t('app_label_copied') : (t('app_build_copy_code') || 'Copy Code')" @click="copyBuildCode()">
                            <span v-if="buildSharing && !copyBuildCodeFeedback" class="loading-spinner loading-spinner-sm"></span>
                            <span v-else-if="copyBuildCodeFeedback"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></span>
                            <span v-else><LucideHash :size="16" /></span>
                        </button>
                        <div class="build-import-inline">
                            <input class="build-import-input" v-model="buildImportCode" :placeholder="t('app_build_import_placeholder') || 'Paste build code'" @keydown.enter="importBuildFromCode()" spellcheck="false">
                            <button class="build-header-icon" v-tooltip="t('app_build_import') || 'Import'" @click="importBuildFromCode()" :disabled="!buildImportCode.trim()">
                                <LucideDownload :size="16" />
                            </button>
                            <span v-if="buildImportError" class="build-import-error">{{ buildImportError }}</span>
                        </div>
                    </div>
                </div>

                <div class="build-columns">
                <!-- Left column: Equipment + Inventory -->
                <div class="build-col-left">
                    <div class="build-loadout-area">
                    <div class="build-loadout-header">
                        <h3 class="build-stats-title" style="margin-bottom:0">{{ t('app_build_loadout') || 'Loadout' }}</h3>
                        <div class="build-loadout-header-actions">
                            <button class="build-expand-all-btn" @click="buildLoadoutCollapsed = !buildLoadoutCollapsed">{{ buildLoadoutCollapsed ? t('app_build_show_loadout') : t('app_build_hide_loadout') }}</button>
                        </div>
                    </div>
                    <div v-if="buildLoadoutCollapsed && buildAllItems.length > 0" class="build-loadout-summary" @click="buildLoadoutCollapsed = false" v-tooltip="buildLoadoutSummary">
                        <span class="build-loadout-summary-text">{{ buildLoadoutSummary }}</span>
                    </div>
                    <div v-show="!buildLoadoutCollapsed" class="build-loadout-content">
                    <div class="build-loadout-box">
                    <div class="build-slots">
                        <!-- Helmet -->
                        <div class="build-slot-group">
                            <div class="build-slot-label">{{ t('app_type_helmet') }}</div>
                            <div v-if="buildHelmet" class="build-slot filled build-slot-helmet" :class="{ 'drag-over': buildDragState && buildDragState.targetSlot === 'helmet' }" @click="openBuildPicker('helmet')" draggable="true" @dragstart="onSlotDragStart($event, 'helmet')" @dragover.prevent="onSlotDragOver($event, 'helmet')" @dragleave="onSlotDragLeave()" @drop.prevent="onSlotDrop($event, 'helmet')" @dragend="onDragEnd()" @mouseenter="showBuildHover(buildHelmet, $event)" @mousemove="moveBuildHover($event)" @mouseleave="hideBuildHover()">
                                <span class="build-slot-name">{{ tName(buildHelmet) }}</span>
                                <span class="build-slot-meta">{{ formatValue('st_prop_weight', buildHelmet['st_prop_weight']) }} &middot; {{ t('ui_inv_ap_res') }} {{ buildHelmet['ui_inv_ap_res'] || '0' }}</span>
                                <button class="build-slot-remove" @click.stop="removeBuildSlot('helmet')">&times;</button>
                            </div>
                            <div v-else class="build-slot empty" :class="{ 'drag-over': buildDragState && buildDragState.targetSlot === 'helmet' }" @click="openBuildPicker('helmet')" @dragover.prevent="onSlotDragOver($event, 'helmet')" @dragleave="onSlotDragLeave()" @drop.prevent="onSlotDrop($event, 'helmet')">
                                <span class="build-slot-add">+ {{ t('app_build_add_helmet') }}</span>
                            </div>
                        </div>

                        <!-- Outfit -->
                        <div class="build-slot-group">
                            <div class="build-slot-label">{{ t('app_type_outfit') }}</div>
                            <div v-if="buildOutfit" class="build-slot filled build-slot-outfit" :class="{ 'drag-over': buildDragState && buildDragState.targetSlot === 'outfit' }" @click="openBuildPicker('outfit')" draggable="true" @dragstart="onSlotDragStart($event, 'outfit')" @dragover.prevent="onSlotDragOver($event, 'outfit')" @dragleave="onSlotDragLeave()" @drop.prevent="onSlotDrop($event, 'outfit')" @dragend="onDragEnd()" @mouseenter="showBuildHover(buildOutfit, $event)" @mousemove="moveBuildHover($event)" @mouseleave="hideBuildHover()">
                                <span class="build-slot-name">{{ tName(buildOutfit) }}</span>
                                <span class="build-slot-meta">{{ formatValue('st_prop_weight', buildOutfit['st_prop_weight']) }} &middot; {{ t('app_build_slots') }}: {{ buildOutfit['ui_inv_outfit_artefact_count'] || '0' }} &middot; {{ t('app_build_slots_max') }}: {{ buildOutfit['st_data_export_outfit_artefact_count_max'] || '0' }}</span>
                                <button class="build-slot-remove" @click.stop="removeBuildSlot('outfit')">&times;</button>
                            </div>
                            <div v-else class="build-slot empty" :class="{ 'drag-over': buildDragState && buildDragState.targetSlot === 'outfit' }" @click="openBuildPicker('outfit')" @dragover.prevent="onSlotDragOver($event, 'outfit')" @dragleave="onSlotDragLeave()" @drop.prevent="onSlotDrop($event, 'outfit')">
                                <span class="build-slot-add">+ {{ t('app_build_add_outfit') }}</span>
                            </div>
                        </div>

                        <!-- Backpack -->
                        <div class="build-slot-group">
                            <div class="build-slot-label">{{ t('app_type_backpack') }}</div>
                            <div v-if="buildBackpack" class="build-slot filled build-slot-backpack" :class="{ 'drag-over': buildDragState && buildDragState.targetSlot === 'backpack' }" @click="openBuildPicker('backpack')" draggable="true" @dragstart="onSlotDragStart($event, 'backpack')" @dragover.prevent="onSlotDragOver($event, 'backpack')" @dragleave="onSlotDragLeave()" @drop.prevent="onSlotDrop($event, 'backpack')" @dragend="onDragEnd()" @mouseenter="showBuildHover(buildBackpack, $event)" @mousemove="moveBuildHover($event)" @mouseleave="hideBuildHover()">
                                <span class="build-slot-name">{{ tName(buildBackpack) }}</span>
                                <span class="build-slot-meta">{{ formatValue('st_prop_weight', buildBackpack['st_prop_weight']) }} &middot; +{{ buildBackpack['ui_inv_outfit_additional_weight'] || '0' }} {{ tUnit('st_prop_weight') }}</span>
                                <button class="build-slot-remove" @click.stop="removeBuildSlot('backpack')">&times;</button>
                            </div>
                            <div v-else class="build-slot empty" :class="{ 'drag-over': buildDragState && buildDragState.targetSlot === 'backpack' }" @click="openBuildPicker('backpack')" @dragover.prevent="onSlotDragOver($event, 'backpack')" @dragleave="onSlotDragLeave()" @drop.prevent="onSlotDrop($event, 'backpack')">
                                <span class="build-slot-add">+ {{ t('app_build_add_backpack') }}</span>
                            </div>
                        </div>

                        <!-- Belt Slots (always show 5) -->
                        <div class="build-slot-group build-slot-group-multi">
                            <div class="build-slot-label">{{ t('app_build_belt_slots') }} <span class="build-slot-counter">{{ buildBeltSlotUsed }}/{{ buildBeltSlotMax }}</span></div>
                            <div class="build-slot-row" :class="{ 'drag-over': buildDragState && buildDragState.targetSlot === 'beltarea' }" @dragover.prevent="onBeltAreaDragOver($event)" @dragleave="onSlotDragLeave()" @drop.prevent="onBeltAreaDrop($event)">
                                <template v-for="(slot, i) in buildBeltSlots" :key="i">
                                    <div v-if="slot.state === 'filled'" class="build-slot filled build-slot-sm" :class="slot.type === 'belt' ? 'build-slot-belt' : 'build-slot-artifact'" @click="openBuildPicker(slot.type, slot.index)" draggable="true" @dragstart="onSlotDragStart($event, slot.type, slot.index)" @dragend="onDragEnd()" @mouseenter="showBuildHover(slot.item, $event)" @mousemove="moveBuildHover($event)" @mouseleave="hideBuildHover()">
                                        <span class="build-slot-name">{{ tName(slot.item) }}</span>
                                        <button class="build-slot-remove" @click.stop="removeBuildSlot(slot.type, slot.index)">&times;</button>
                                    </div>
                                    <div v-else-if="slot.state === 'empty'" class="build-slot empty build-slot-sm" @click="openBuildPicker('belt')">
                                        <span class="build-slot-add">+</span>

                                    </div>
                                    <div v-else class="build-slot empty build-slot-sm build-slot-disabled">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                                    </div>
                                </template>
                            </div>
                        </div>
                    </div>
                    </div>

                    <!-- Primary + Secondary -->
                    <div class="build-weapon-col">
                        <div class="build-slot-group">
                            <div class="build-slot-label">{{ t('app_build_weapon_primary') }}</div>
                            <div v-if="buildWeaponPrimary" class="build-slot filled build-slot-weapon" :class="{ 'drag-over': buildDragState && buildDragState.targetSlot === 'weapon' && buildDragState.targetIndex === 'primary' }" @click="openBuildPicker('weapon', 'primary')" draggable="true" @dragstart="onSlotDragStart($event, 'weapon', 'primary')" @dragover.prevent="onSlotDragOver($event, 'weapon', 'primary')" @dragleave="onSlotDragLeave()" @drop.prevent="onSlotDrop($event, 'weapon', 'primary')" @dragend="onDragEnd()" @mouseenter="showBuildHover(buildWeaponPrimary, $event)" @mousemove="moveBuildHover($event)" @mouseleave="hideBuildHover()">
                                <span class="build-slot-name">{{ tName(buildWeaponPrimary) }}</span>
                                <span class="build-slot-meta">{{ formatValue('st_prop_weight', buildWeaponPrimary['st_prop_weight']) }}</span>
                                <button class="build-slot-remove" @click.stop="removeBuildSlot('weapon', 'primary')">&times;</button>
                            </div>
                            <div v-else class="build-slot empty" :class="{ 'drag-over': buildDragState && buildDragState.targetSlot === 'weapon' && buildDragState.targetIndex === 'primary' }" @click="openBuildPicker('weapon', 'primary')" @dragover.prevent="onSlotDragOver($event, 'weapon', 'primary')" @dragleave="onSlotDragLeave()" @drop.prevent="onSlotDrop($event, 'weapon', 'primary')">
                                <span class="build-slot-add">+ {{ t('app_build_weapon_primary') }}</span>
                            </div>
                            <div class="build-slot-ammo-row">
                                <div v-if="buildAmmoPrimary" class="build-slot filled build-slot-sm build-slot-ammo" @click="openBuildPicker('ammo', 'primary')" draggable="true" @dragstart="onSlotDragStart($event, 'ammo', 'primary')" @dragend="onDragEnd()" @mouseenter="showBuildHover(buildAmmoPrimary, $event)" @mousemove="moveBuildHover($event)" @mouseleave="hideBuildHover()">
                                    <span class="build-slot-name">{{ tItemName(buildAmmoPrimary) }}</span>
                                    <button class="build-slot-remove" @click.stop="removeBuildSlot('ammo', 'primary')">&times;</button>
                                </div>
                                <div v-else-if="buildWeaponPrimary" class="build-slot empty build-slot-sm" @click="openBuildPicker('ammo', 'primary')">
                                    <span class="build-slot-add">+ {{ t('app_build_ammo') }}</span>
                                </div>
                                <div v-else class="build-slot empty build-slot-sm build-slot-disabled">
                                    <span class="build-slot-add">{{ t('app_build_ammo') }}</span>
                                </div>
                            </div>
                            <div class="build-slot-label">{{ t('app_build_weapon_secondary') }}</div>
                            <div v-if="buildWeaponSecondary" class="build-slot filled build-slot-weapon" :class="{ 'drag-over': buildDragState && buildDragState.targetSlot === 'weapon' && buildDragState.targetIndex === 'secondary' }" @click="openBuildPicker('weapon', 'secondary')" draggable="true" @dragstart="onSlotDragStart($event, 'weapon', 'secondary')" @dragover.prevent="onSlotDragOver($event, 'weapon', 'secondary')" @dragleave="onSlotDragLeave()" @drop.prevent="onSlotDrop($event, 'weapon', 'secondary')" @dragend="onDragEnd()" @mouseenter="showBuildHover(buildWeaponSecondary, $event)" @mousemove="moveBuildHover($event)" @mouseleave="hideBuildHover()">
                                <span class="build-slot-name">{{ tName(buildWeaponSecondary) }}</span>
                                <span class="build-slot-meta">{{ formatValue('st_prop_weight', buildWeaponSecondary['st_prop_weight']) }}</span>
                                <button class="build-slot-remove" @click.stop="removeBuildSlot('weapon', 'secondary')">&times;</button>
                            </div>
                            <div v-else class="build-slot empty" :class="{ 'drag-over': buildDragState && buildDragState.targetSlot === 'weapon' && buildDragState.targetIndex === 'secondary' }" @click="openBuildPicker('weapon', 'secondary')" @dragover.prevent="onSlotDragOver($event, 'weapon', 'secondary')" @dragleave="onSlotDragLeave()" @drop.prevent="onSlotDrop($event, 'weapon', 'secondary')">
                                <span class="build-slot-add">+ {{ t('app_build_weapon_secondary') }}</span>
                            </div>
                            <div class="build-slot-ammo-row">
                                <div v-if="buildAmmoSecondary" class="build-slot filled build-slot-sm build-slot-ammo" @click="openBuildPicker('ammo', 'secondary')" draggable="true" @dragstart="onSlotDragStart($event, 'ammo', 'secondary')" @dragend="onDragEnd()" @mouseenter="showBuildHover(buildAmmoSecondary, $event)" @mousemove="moveBuildHover($event)" @mouseleave="hideBuildHover()">
                                    <span class="build-slot-name">{{ tItemName(buildAmmoSecondary) }}</span>
                                    <button class="build-slot-remove" @click.stop="removeBuildSlot('ammo', 'secondary')">&times;</button>
                                </div>
                                <div v-else-if="buildWeaponSecondary" class="build-slot empty build-slot-sm" @click="openBuildPicker('ammo', 'secondary')">
                                    <span class="build-slot-add">+ {{ t('app_build_ammo') }}</span>
                                </div>
                                <div v-else class="build-slot empty build-slot-sm build-slot-disabled">
                                    <span class="build-slot-add">{{ t('app_build_ammo') }}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <!-- Sidearm + Grenade -->
                    <div class="build-weapon-col">
                        <div class="build-slot-group">
                            <div class="build-slot-label">{{ t('app_build_sidearm') }}</div>
                            <div v-if="buildWeaponSidearm" class="build-slot filled build-slot-weapon" :class="{ 'drag-over': buildDragState && buildDragState.targetSlot === 'sidearm' }" @click="openBuildPicker('sidearm')" draggable="true" @dragstart="onSlotDragStart($event, 'sidearm')" @dragover.prevent="onSlotDragOver($event, 'sidearm')" @dragleave="onSlotDragLeave()" @drop.prevent="onSlotDrop($event, 'sidearm')" @dragend="onDragEnd()" @mouseenter="showBuildHover(buildWeaponSidearm, $event)" @mousemove="moveBuildHover($event)" @mouseleave="hideBuildHover()">
                                <span class="build-slot-name">{{ tName(buildWeaponSidearm) }}</span>
                                <span class="build-slot-meta">{{ formatValue('st_prop_weight', buildWeaponSidearm['st_prop_weight']) }}</span>
                                <button class="build-slot-remove" @click.stop="removeBuildSlot('sidearm')">&times;</button>
                            </div>
                            <div v-else class="build-slot empty" :class="{ 'drag-over': buildDragState && buildDragState.targetSlot === 'sidearm' }" @click="openBuildPicker('sidearm')">
                                <span class="build-slot-add">+ {{ t('app_build_sidearm') }}</span>
                            </div>
                            <div v-if="!isWeaponMelee(buildWeaponSidearm)" class="build-slot-ammo-row">
                                <div v-if="buildAmmoSidearm" class="build-slot filled build-slot-sm build-slot-ammo" @click="openBuildPicker('ammo', 'sidearm')" draggable="true" @dragstart="onSlotDragStart($event, 'ammo', 'sidearm')" @dragend="onDragEnd()" @mouseenter="showBuildHover(buildAmmoSidearm, $event)" @mousemove="moveBuildHover($event)" @mouseleave="hideBuildHover()">
                                    <span class="build-slot-name">{{ tItemName(buildAmmoSidearm) }}</span>
                                    <button class="build-slot-remove" @click.stop="removeBuildSlot('ammo', 'sidearm')">&times;</button>
                                </div>
                                <div v-else-if="buildWeaponSidearm" class="build-slot empty build-slot-sm" @click="openBuildPicker('ammo', 'sidearm')">
                                    <span class="build-slot-add">+ {{ t('app_build_ammo') }}</span>
                                </div>
                                <div v-else class="build-slot empty build-slot-sm build-slot-disabled">
                                    <span class="build-slot-add">{{ t('app_build_ammo') }}</span>
                                </div>
                            </div>
                            <div class="build-slot-label">{{ t('app_build_grenade') }}</div>
                            <div v-if="buildWeaponGrenade" class="build-slot filled build-slot-grenade" :class="{ 'drag-over': buildDragState && buildDragState.targetSlot === 'grenade' }" @click="openBuildPicker('grenade')" draggable="true" @dragstart="onSlotDragStart($event, 'grenade')" @dragover.prevent="onSlotDragOver($event, 'grenade')" @dragleave="onSlotDragLeave()" @drop.prevent="onSlotDrop($event, 'grenade')" @dragend="onDragEnd()" @mouseenter="showBuildHover(buildWeaponGrenade, $event)" @mousemove="moveBuildHover($event)" @mouseleave="hideBuildHover()">
                                <span class="build-slot-name">{{ tItemName(buildWeaponGrenade) }}</span>
                                <span class="build-slot-meta">{{ formatValue('st_prop_weight', buildWeaponGrenade['st_prop_weight']) }}</span>
                                <button class="build-slot-remove" @click.stop="removeBuildSlot('grenade')">&times;</button>
                            </div>
                            <div v-else class="build-slot empty" :class="{ 'drag-over': buildDragState && buildDragState.targetSlot === 'grenade' }" @click="openBuildPicker('grenade')">
                                <span class="build-slot-add">+ {{ t('app_build_grenade') }}</span>
                            </div>
                        </div>
                    </div>
                    </div><!-- end build-loadout-content -->
                    </div><!-- end build-loadout-area -->

                    <div class="build-stats">
                    <div class="build-stats-box">
                        <div class="build-stats-header">
                            <h3 class="build-stats-title" style="margin-bottom:0">{{ t('app_build_statistics') }}</h3>
                            <div class="build-stats-header-actions">
                                <button class="build-expand-all-btn" v-if="!buildRadarVisible" @click="buildHideGearStats = !buildHideGearStats">{{ buildHideGearStats ? t('app_build_show_gear') : t('app_build_hide_gear') }}</button>
                                <button class="build-expand-all-btn" v-if="!buildRadarVisible && (buildWeaponPrimary || buildWeaponSecondary || buildWeaponSidearm || buildWeaponGrenade)" @click="buildHideWeaponStats = !buildHideWeaponStats">{{ buildHideWeaponStats ? t('app_build_show_weapons') : t('app_build_hide_weapons') }}</button>
                                <button class="build-expand-all-btn" @click="toggleBuildExpandAll()" v-if="buildAllItems.length > 0 && !buildRadarVisible">{{ buildAllExpanded ? t('app_build_collapse_all') : t('app_build_expand_all') }}</button>
                                <button class="build-expand-all-btn" :class="{ active: buildRadarVisible }" @click="buildRadarVisible = !buildRadarVisible" v-if="buildWeaponPrimary || buildWeaponSecondary || buildWeaponSidearm">{{ t('app_build_weapon_chart') || 'Weapon Chart' }}</button>
                            </div>
                        </div>
                        <div class="build-stats-body">
                        <!-- Radar Charts -->
                        <template v-if="buildRadarVisible">
                            <div class="build-radar-section" v-if="!buildHideWeaponStats && (buildWeaponPrimary || buildWeaponSecondary || buildWeaponSidearm)">
                                <div class="build-radar-wrap">
                                    <canvas ref="buildWeaponRadarCanvas"></canvas>
                                </div>
                            </div>
                        </template>
                        <!-- Gear Stats -->
                        <template v-if="!buildHideGearStats && !buildRadarVisible">

                        <div class="build-tile-wrap">
                            <div class="build-tile-stat build-prot-expandable" :class="{ 'build-prot-low': buildCombinedStats.totalWeight === 0 }" @click="toggleBuildStatExpand('weight')">
                                <span class="build-prot-chevron" :class="{ 'build-prot-chevron-open': buildExpandedStats.weight }"></span>
                                <span class="build-tile-label">{{ t('st_prop_weight') }}</span>
                                <span class="build-tile-value">{{ buildStatFormatted('st_prop_weight', buildCombinedStats.totalWeight) }}</span>
                            </div>
                            <div v-if="buildExpandedStats.weight" class="build-stat-breakdown">
                                <div v-if="buildCombinedStats.weightBreakdown.length === 0" class="build-breakdown-row build-breakdown-none">{{ t('app_build_no_items') }}</div>
                                <div v-for="b in buildCombinedStats.weightBreakdown" :key="b.name" class="build-breakdown-row">
                                    <span><span class="build-breakdown-dot" :style="{ background: buildSlotColor(b.slot) }"></span>{{ t(b.name) }}</span><span>{{ b.value }} {{ tUnit('st_prop_weight') }} <span class="build-breakdown-arrow" :class="b.value > 0 ? 'arrow-up' : 'arrow-down'">{{ b.value > 0 ? '\u25B2' : '\u25BC' }}</span></span>
                                </div>
                            </div>
                        </div>

                        <div class="build-tile-wrap">
                            <div class="build-tile-stat build-prot-expandable" :class="{ 'build-prot-low': buildCombinedStats.carryWeight === 0 }" @click="toggleBuildStatExpand('carry')">
                                <span class="build-prot-chevron" :class="{ 'build-prot-chevron-open': buildExpandedStats.carry }"></span>
                                <span class="build-tile-label">{{ t('ui_inv_outfit_additional_weight') }}</span>
                                <span class="build-tile-value">{{ buildStatFormatted('ui_inv_outfit_additional_weight', buildCombinedStats.totalCarryCapacity) }}</span>
                            </div>
                            <div v-if="buildExpandedStats.carry" class="build-stat-breakdown">
                                <div v-if="buildCombinedStats.baseCarryWeight" class="build-breakdown-row">
                                    <span>{{ t('app_build_base') }}</span><span>{{ buildCombinedStats.baseCarryWeight }} {{ tUnit('ui_inv_outfit_additional_weight') }}</span>
                                </div>
                                <div v-if="buildCombinedStats.carryBreakdown.length === 0 && !buildCombinedStats.baseCarryWeight" class="build-breakdown-row build-breakdown-none">{{ t('app_build_no_items') }}</div>
                                <div v-for="b in buildCombinedStats.carryBreakdown" :key="b.name" class="build-breakdown-row">
                                    <span><span class="build-breakdown-dot" :style="{ background: buildSlotColor(b.slot) }"></span>{{ t(b.name) }}</span><span>+{{ b.value }} <span class="build-breakdown-arrow" :class="b.value > 0 ? 'arrow-up' : 'arrow-down'">{{ b.value > 0 ? '\u25B2' : '\u25BC' }}</span></span>
                                </div>
                            </div>
                        </div>

                        <div class="build-tile-wrap">
                            <div class="build-tile-stat build-prot-expandable" :class="{ 'build-prot-low': buildCombinedStats.armorPoints === 0 }" @click="toggleBuildStatExpand('armor')">
                                <span class="build-prot-chevron" :class="{ 'build-prot-chevron-open': buildExpandedStats.armor }"></span>
                                <span class="build-tile-label">{{ t('ui_inv_ap_res') }}</span>
                                <span class="build-tile-value">{{ buildCombinedStats.armorPoints }}</span>
                            </div>
                            <div v-if="buildExpandedStats.armor" class="build-stat-breakdown">
                                <div v-if="buildCombinedStats.armorBreakdown.length === 0" class="build-breakdown-row build-breakdown-none">{{ t('app_build_no_items') }}</div>
                                <div v-for="b in buildCombinedStats.armorBreakdown" :key="b.name" class="build-breakdown-row">
                                    <span><span class="build-breakdown-dot" :style="{ background: buildSlotColor(b.slot) }"></span>{{ t(b.name) }}</span><span>{{ b.value }} <span class="build-breakdown-arrow" :class="b.value > 0 ? 'arrow-up' : 'arrow-down'">{{ b.value > 0 ? '\u25B2' : '\u25BC' }}</span></span>
                                </div>
                            </div>
                        </div>

                        <div v-if="buildCombinedStats.speed !== null" class="build-tile-wrap">
                            <div class="build-tile-stat build-prot-expandable" :class="{ 'build-prot-low': buildCombinedStats.speed === 0 }" @click="toggleBuildStatExpand('speed')">
                                <span class="build-prot-chevron" :class="{ 'build-prot-chevron-open': buildExpandedStats.speed }"></span>
                                <span class="build-tile-label">{{ t('ui_inv_outfit_speed') }}</span>
                                <span class="build-tile-value" :class="{ 'build-prot-negative': buildCombinedStats.speed < 0 }">{{ buildCombinedStats.speed }}%</span>
                            </div>
                            <div v-if="buildExpandedStats.speed" class="build-stat-breakdown">
                                <div class="build-breakdown-row build-breakdown-none">{{ t('app_build_no_items') }}</div>
                            </div>
                        </div>

                        <!-- Protection -->
                        <template v-for="f in ['ui_inv_outfit_fire_wound_protection','ui_inv_outfit_wound_protection','ui_inv_outfit_burn_protection','ui_inv_outfit_shock_protection','ui_inv_outfit_chemical_burn_protection','ui_inv_outfit_radiation_protection','ui_inv_outfit_telepatic_protection','ui_inv_outfit_strike_protection','ui_inv_outfit_explosion_protection']" :key="f">
                            <div class="build-tile-wrap">
                                <div class="build-tile-stat build-prot-expandable" :class="{ 'build-prot-low': buildCombinedStats.protections[f].total === 0 }" @click="toggleBuildStatExpand(f)">
                                    <span class="build-prot-chevron" :class="{ 'build-prot-chevron-open': buildExpandedStats[f] }"></span>
                                    <span class="build-tile-label">{{ headerLabel(f) }}</span>
                                    <span class="build-tile-value" :class="{ 'build-prot-negative': buildCombinedStats.protections[f].total < 0 }">
                                        <span v-if="buildCombinedStats.protections[f].capped" class="build-capped-badge" v-tooltip="t('app_build_capped')">CAP</span>
                                        {{ buildCombinedStats.protections[f].total.toFixed(1) }}%
                                    </span>
                                </div>
                                <div v-if="buildExpandedStats[f]" class="build-stat-breakdown">
                                    <div v-if="buildCombinedStats.protections[f].breakdown.length === 0" class="build-breakdown-row build-breakdown-none">{{ t('app_build_no_items') }}</div>
                                    <div v-for="b in buildCombinedStats.protections[f].breakdown" :key="b.name" class="build-breakdown-row">
                                        <span><span class="build-breakdown-dot" :style="{ background: buildSlotColor(b.slot) }"></span>{{ t(b.name) }}</span><span>{{ b.value }}% <span class="build-breakdown-arrow" :class="b.value > 0 ? 'arrow-up' : 'arrow-down'">{{ b.value > 0 ? '\u25B2' : '\u25BC' }}</span></span>
                                    </div>
                                </div>
                            </div>
                        </template>

                        <!-- Restoration -->
                        <template v-for="f in ['st_prop_restore_health','st_prop_restore_bleeding','st_data_export_restore_radiation','ui_inv_outfit_power_restore']" :key="f">
                            <div class="build-tile-wrap">
                                <div class="build-tile-stat build-prot-expandable" :class="{ 'build-prot-low': buildCombinedStats.restorations[f].total === 0 }" @click="toggleBuildStatExpand(f)">
                                    <span class="build-prot-chevron" :class="{ 'build-prot-chevron-open': buildExpandedStats[f] }"></span>
                                    <span class="build-tile-label">{{ headerLabel(f) }}</span>
                                    <span class="build-tile-value" :class="{ 'build-prot-negative': buildCombinedStats.restorations[f].total < 0 }">{{ buildStatFormatted(f, buildCombinedStats.restorations[f].total) }}</span>
                                </div>
                                <div v-if="buildExpandedStats[f]" class="build-stat-breakdown">
                                    <div v-if="buildCombinedStats.restorations[f].breakdown.length === 0" class="build-breakdown-row build-breakdown-none">{{ t('app_build_no_items') }}</div>
                                    <div v-for="b in buildCombinedStats.restorations[f].breakdown" :key="b.name" class="build-breakdown-row">
                                        <span><span class="build-breakdown-dot" :style="{ background: buildSlotColor(b.slot) }"></span>{{ t(b.name) }}</span><span>{{ buildStatFormatted(f, b.value) }} <span class="build-breakdown-arrow" :class="b.value > 0 ? 'arrow-up' : 'arrow-down'">{{ b.value > 0 ? '\u25B2' : '\u25BC' }}</span></span>
                                    </div>
                                </div>
                            </div>
                        </template>
                        </template>
                        <!-- Weapon Stats -->
                        <template v-if="!buildHideWeaponStats && !buildRadarVisible && (buildWeaponPrimary || buildWeaponSecondary || buildWeaponSidearm || buildWeaponGrenade)">
                        <div v-if="!buildHideGearStats" class="build-stats-divider"></div>
                        <div class="build-weapon-toggle">
                            <button class="build-weapon-toggle-btn" :class="{ active: buildActiveWeaponTab === 'primary' }" @click="buildActiveWeaponTab = 'primary'" v-if="buildWeaponPrimary">
                                {{ tName(buildWeaponPrimary) }}<template v-if="buildAmmoPrimary"> <span class="build-weapon-toggle-with">with</span> {{ shortAmmoName(tName(buildAmmoPrimary)) }}</template>
                            </button>
                            <button class="build-weapon-toggle-btn" :class="{ active: buildActiveWeaponTab === 'secondary' }" @click="buildActiveWeaponTab = 'secondary'" v-if="buildWeaponSecondary">
                                {{ tName(buildWeaponSecondary) }}<template v-if="buildAmmoSecondary"> <span class="build-weapon-toggle-with">with</span> {{ shortAmmoName(tName(buildAmmoSecondary)) }}</template>
                            </button>
                            <button class="build-weapon-toggle-btn" :class="{ active: buildActiveWeaponTab === 'sidearm' }" @click="buildActiveWeaponTab = 'sidearm'" v-if="buildWeaponSidearm">
                                {{ tName(buildWeaponSidearm) }}<template v-if="buildAmmoSidearm"> <span class="build-weapon-toggle-with">with</span> {{ shortAmmoName(tName(buildAmmoSidearm)) }}</template>
                            </button>
                            <button class="build-weapon-toggle-btn" :class="{ active: buildActiveWeaponTab === 'grenade' }" @click="buildActiveWeaponTab = 'grenade'" v-if="buildWeaponGrenade">
                                {{ tItemName(buildWeaponGrenade) }}
                            </button>
                        </div>
                        <template v-if="buildWeaponStats">
                            <div v-for="s in buildWeaponStats.stats" :key="s.field" class="build-tile-wrap">
                                <div class="build-tile-stat build-prot-expandable" :class="{ 'build-prot-low': s.effective == null || s.effective === 0 }" @click="toggleBuildStatExpand('wpn_' + s.field)">
                                    <span class="build-prot-chevron" :class="{ 'build-prot-chevron-open': buildExpandedStats['wpn_' + s.field] }"></span>
                                    <span class="build-tile-label">{{ headerLabel(s.field) }}</span>
                                    <span class="build-tile-value">{{ s.effective != null ? formatValue(s.field, s.effective) : '--' }}</span>
                                </div>
                                <div v-if="buildExpandedStats['wpn_' + s.field]" class="build-stat-breakdown">
                                    <div class="build-breakdown-row">
                                        <span><span class="build-breakdown-dot" :style="{ background: buildSlotColor('weapon') }"></span>{{ t('app_build_base') }}</span><span>{{ s.base != null ? formatValue(s.field, s.base) : '--' }} <span class="build-breakdown-arrow arrow-up">&#x25B2;</span></span>
                                    </div>
                                    <div v-if="s.modifier != null" class="build-breakdown-row">
                                        <span><span class="build-breakdown-dot" :style="{ background: buildSlotColor('ammo') }"></span>{{ t('app_build_ammo') }}</span><span>x{{ s.modifier }} <span class="build-breakdown-arrow" :class="s.modifier >= 1 ? 'arrow-up' : 'arrow-down'">{{ s.modifier >= 1 ? '&#x25B2;' : '&#x25BC;' }}</span></span>
                                    </div>
                                </div>
                            </div>
                            <div v-for="a in buildWeaponStats.ammoOnly" :key="a.field" class="build-tile-wrap">
                                <div class="build-tile-stat" :class="{ 'build-prot-low': !a.value }">
                                    <span class="build-prot-chevron" style="opacity:0.15"></span>
                                    <span class="build-tile-label">{{ headerLabel(a.field) }}</span>
                                    <span class="build-tile-value">{{ formatValue(a.field, a.value) }}</span>
                                </div>
                            </div>
                        </template>
                        </template>

                        </div>
                    </div>
                    </div>

                </div>

                <!-- Right column: Inventory -->
                <div class="build-col-right">
                    <div class="build-inventory">
                        <div class="build-inventory-header">
                            <h3 class="build-stats-title" style="margin-bottom:0">{{ t('app_build_inventory') }} <span v-if="buildInventory.length" class="build-slot-counter">({{ buildInventory.length }})</span></h3>
                            <div class="build-stats-header-actions">
                                <button class="build-expand-all-btn" @click="openInventoryPicker()"><LucidePlus :size="10" /> {{ t('app_build_add_to_inventory') }}</button>
                                <button class="build-expand-all-btn" @click="addFavoritesToInventory()" :disabled="!favoriteIds.length"><LucideStar :size="10" /> {{ t('app_build_add_favourites') }}</button>
                                <button v-if="buildInventory.length > 0" class="build-expand-all-btn" @click="buildInventory = []; saveInventoryToStorage()"><LucideTrash2 :size="10" /> {{ t('app_build_clear_inventory') }}</button>
                                <button v-if="buildInventory.length > 1" class="build-expand-all-btn" :class="{ active: buildInventorySort !== 'none' }" @click="cycleInventorySort()"><LucideArrowUpDown :size="10" /><span v-if="buildInventorySort !== 'none'"> {{ buildInventorySortLabel }}</span></button>
                            </div>
                        </div>
                        <div v-if="weaponCompareSlotCount > 1" class="build-compare-toggle">
                            <span class="build-compare-toggle-label">{{ t('app_build_weapon_comparison') }}</span>
                            <button v-if="buildWeaponPrimary" class="build-compare-toggle-btn" :class="{ active: buildWeaponCompareSlot === 'primary' }" @click="setWeaponCompareSlot('primary')">{{ t('app_build_weapon_primary') }}</button>
                            <button v-if="buildWeaponSecondary" class="build-compare-toggle-btn" :class="{ active: buildWeaponCompareSlot === 'secondary' }" @click="setWeaponCompareSlot('secondary')">{{ t('app_build_weapon_secondary') }}</button>
                            <button v-if="buildWeaponSidearm" class="build-compare-toggle-btn" :class="{ active: buildWeaponCompareSlot === 'sidearm' }" @click="setWeaponCompareSlot('sidearm')">{{ t('app_build_sidearm') }}</button>
                        </div>
                        <div class="build-inventory-body" :class="{ 'drag-over': buildDragState && buildDragState.targetSlot === 'inventory' }" @dragover.prevent="onInventoryDragOver($event)" @drop.prevent="onInventoryDrop($event)">
                            <div v-if="buildInventory.length > 0" class="build-inventory-items">
                                <div v-for="entry in buildInventorySorted" :key="entry.originalIndex"
                                     class="build-inventory-item"
                                     :class="'build-inv-' + entry.slotType"
                                     draggable="true"
                                     @dragstart="onInventoryDragStart($event, entry.originalIndex)"
                                     @dragend="onDragEnd()"
                                     @click="equipFromInventory(entry.originalIndex)"
                                     @mouseenter="showBuildHover(entry.item, $event)"
                                     @mousemove="moveBuildHover($event)"
                                     @mouseleave="hideBuildHover()">
                                    <span class="build-inventory-item-name">{{ tItemName(entry.item) }}</span>
                                    <span class="build-inventory-item-type">{{ getItemCategoryLabel(entry.item) }}</span>
                                    <button class="build-inventory-item-remove" @click.stop="removeFromInventory(entry.originalIndex)">&times;</button>
                                </div>
                            </div>
                            <div v-else class="build-inventory-empty">
                                <img src="/img/knapsack.svg" class="build-inventory-empty-icon" alt="">
                                <span>{{ t('app_build_inventory_empty') }}</span>
                            </div>
                        </div>
                    </div>
                </div>
                </div>

                <!-- Item hover popover -->
                <div v-if="buildHoverItem" class="build-hover-popover" :style="buildHoverPos ? { top: buildHoverPos.top + 'px', left: buildHoverPos.left + 'px' } : { visibility: 'hidden' }">
                    <!-- Single-item popover (no comparison) -->
                    <div v-if="!buildHoverCompareItem" class="tile-card build-hover-tile">
                        <div class="tile-card-header">
                            <span class="tile-card-name">{{ tItemName(buildHoverItem) }}</span>
                            <span v-if="buildHoverItem['st_data_export_has_perk'] === 'Y'" class="badge-flag badge-perk">{{ t('app_badge_perk') }}</span>
                            <span v-if="buildHoverItem['ui_mcm_menu_exo'] === 'Y'" class="badge-flag badge-powered">{{ t('app_badge_powered') }}</span>
                        </div>
                        <div class="tile-card-stats">
                            <div v-for="field in getItemFields(buildHoverItem)" :key="field" class="tile-stat-row">
                                <span class="stat-label">{{ headerLabel(field) }}</span>
                                <template v-if="field === 'ui_mm_repair'">
                                    <span class="badge" :style="displayStyle(field, buildHoverItem[field])">{{ displayLabel(field, buildHoverItem[field]) }}</span>
                                </template>
                                <template v-else-if="field === 'ui_ammo_types' || field === 'st_data_export_ammo_types_alt'">
                                    <span v-if="buildHoverItem[field]" class="tile-ammo-list">
                                        <span v-for="a in buildHoverItem[field].split(';')" :key="a" :class="field === 'st_data_export_ammo_types_alt' ? 'badge-ammo badge-ammo-alt clickable' : 'badge-ammo clickable'" v-tooltip="ammoTooltipPayload(a.trim())" @click.stop="openAmmoFromCaliber(a.trim())">{{ caliberName(a.trim()) }}</span>
                                    </span>
                                    <span v-else class="stat-value">--</span>
                                </template>
                                <template v-else>
                                    <span class="stat-value" :class="statClass(field, cellValue(buildHoverItem, field))" :style="statStyle(field, cellValue(buildHoverItem, field))">{{ formatValue(field, cellValue(buildHoverItem, field)) }}</span>
                                </template>
                            </div>
                        </div>
                        <div class="build-hover-desc">
                            <img class="build-hover-icon" :src="'img/icons/' + buildHoverItem.id + '.png'" @error="$event.target.style.display='none'">
                            <p v-if="parseDescription(buildHoverItem)" class="modal-description">{{ parseDescription(buildHoverItem).text }}</p>
                            <div v-if="parseDescription(buildHoverItem) && parseDescription(buildHoverItem).sections.length" class="modal-desc-meta">
                                <template v-for="section in parseDescription(buildHoverItem).sections">
                                    <span v-if="section.header === 'WARNING'" v-for="item in section.items" class="desc-chip desc-chip-warning">{{ item }}</span>
                                    <span v-else v-for="item in section.items" class="desc-chip">{{ item }}</span>
                                </template>
                            </div>
                        </div>
                    </div>
                    <!-- Comparison popover -->
                    <div v-else class="tile-card build-hover-tile build-hover-tile--compare">
                        <div class="build-compare-header">
                            {{ tItemName(buildHoverCompareItem) }} <span class="build-compare-vs">vs</span> {{ tItemName(buildHoverItem) }}
                        </div>
                        <div class="build-compare-grid">
                            <span class="build-compare-sublabel"></span>
                            <span class="build-compare-sublabel">{{ t('app_build_equipped') }}</span>
                            <span class="build-compare-sublabel">{{ t('app_build_inventory') }}</span>
                            <span class="build-compare-sublabel"></span>
                            <template v-for="field in buildHoverCompareFields()" :key="field">
                                <span class="stat-label">{{ headerLabel(field) }}</span>
                                <span class="stat-value build-compare-val">{{ formatValue(field, cellValue(buildHoverCompareItem, field)) }}</span>
                                <span class="stat-value build-compare-val">{{ formatValue(field, cellValue(buildHoverItem, field)) }}</span>
                                <span class="build-compare-diff"
                                      :class="buildHoverDiff(field, buildHoverItem, buildHoverCompareItem).value === null ? 'diff-dash'
                                             : buildHoverDiff(field, buildHoverItem, buildHoverCompareItem).value === 0 ? 'diff-zero'
                                             : buildHoverDiff(field, buildHoverItem, buildHoverCompareItem).positive ? 'diff-positive'
                                             : 'diff-negative'">
                                    {{ buildHoverDiff(field, buildHoverItem, buildHoverCompareItem).value === null ? '—'
                                       : buildHoverDiff(field, buildHoverItem, buildHoverCompareItem).value === 0 ? '='
                                       : (buildHoverDiff(field, buildHoverItem, buildHoverCompareItem).value > 0 ? '+' : '') + formatValue(field, buildHoverDiff(field, buildHoverItem, buildHoverCompareItem).value) }}
                                </span>
                            </template>
                        </div>
                        <div class="build-hover-desc">
                            <img class="build-hover-icon" :src="'img/icons/' + buildHoverItem.id + '.png'" @error="$event.target.style.display='none'">
                            <p v-if="parseDescription(buildHoverItem)" class="modal-description">{{ parseDescription(buildHoverItem).text }}</p>
                            <div v-if="parseDescription(buildHoverItem) && parseDescription(buildHoverItem).sections.length" class="modal-desc-meta">
                                <template v-for="section in parseDescription(buildHoverItem).sections">
                                    <span v-if="section.header === 'WARNING'" v-for="item in section.items" class="desc-chip desc-chip-warning">{{ item }}</span>
                                    <span v-else v-for="item in section.items" class="desc-chip">{{ item }}</span>
                                </template>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="table-wrap" v-show="viewMode === 'table' && !favoritesViewActive && !recentViewActive && !isOutfitExchange && !isMaterialsCategory && !isCraftingTrees && !isToolkitRates && !buildPlannerActive && !versionCompareActive">
                <table class="item-table">
                    <thead>
                    <tr>
                        <th class="fav-col-header"></th>
                        <th class="pin-col-header"></th>
                        <template v-for="col in tableColumns" :key="col.key">
                            <th v-if="col.type === 'header'" @click="toggleSort(col.key)" :class="{ 'text-right': !isLeftAlignCol(col.key) }">
                                <span>{{ headerLabel(col.key) }}</span><span class="sort-icon">{{ sortIcon(col.key) }}</span>
                            </th>
                            <th v-else @click="toggleSort('_heal')">
                                <span>{{ t('app_label_heals') }}</span><span class="sort-icon">{{ sortIcon('_heal') }}</span>
                            </th>
                        </template>
                    </tr>
                    </thead>
                    <tbody>
                    <tr v-for="item in sortedItems" :key="item.id" @click="navigateToItem(item.id)" class="clickable-row">
                        <td class="fav-col" @click.stop="toggleFavorite(item.id)">
                            <span class="fav-icon" :class="{ favorited: isFavorited(item.id) }">{{ isFavorited(item.id) ? '\u2605' : '\u2606' }}</span>
                        </td>
                        <td class="pin-col" @click.stop="togglePin(item.id)">
                            <span class="pin-icon" :class="{ pinned: isPinned(item.id), 'pin-disabled': !isPinned(item.id) && pinnedIds.length >= 5 }">&#x1F4CC;</span>
                        </td>
                        <template v-for="col in tableColumns" :key="col.key">
                            <td v-if="col.type === 'heal'" class="heal-cell">
                                <div v-for="hg in col.groups" :key="hg.label" class="heal-row">
                                    <span class="heal-row-label">{{ t(hg.label) }}</span>
                                    <span class="heal-parts">
                                        <span v-for="(f, i) in hg.fields" :key="f" class="heal-part" :class="{ 'heal-active': parseInt(item[f]) > 0 }">
                                            {{ hg.abbr[i] }}<span class="heal-dots"><span v-for="d in healDots(item[f]).filled" :key="'f'+d" class="dot filled">&#x2022;</span><span v-for="d in healDots(item[f]).empty" :key="'e'+d" class="dot empty">&#x2022;</span></span>
                                        </span>
                                    </span>
                                </div>
                            </td>
                            <td v-else :class="{ 'text-right': !isLeftAlignCol(col.key) }">
                                <template v-if="col.key === 'pda_encyclopedia_name' || col.key === 'name'">
                                    <a href="#" @click.prevent.stop="navigateToItem(item.id)">{{ tItemName(item) }}</a>
                                    <span v-if="item.hasNpcWeaponDrop === false" class="badge-no-drop" v-tooltip="t('app_tooltip_not_dropped')">{{ t('app_badge_no_drop') }}</span>
                                    <span v-if="isUnusedAmmo(item)" class="badge-unused" v-tooltip="t('app_tooltip_unused_ammo')">{{ t('app_badge_unused') }}</span>
                                    <div v-if="activeNameTags.some(tag => item[tag] === 'Y')" class="name-tags">
                                        <span v-if="item['st_data_export_has_perk'] === 'Y'" class="badge-flag badge-perk">{{ t('app_badge_perk') }}</span>
                                        <span v-if="item['st_data_export_is_junk'] === 'Y'" class="badge-flag badge-junk">{{ t('app_badge_junk') }}</span>
                                        <span v-if="item['st_data_export_can_be_crafted'] === 'Y'" class="badge-flag badge-craftable">{{ t('app_badge_craftable') }}</span>
                                        <span v-if="item['ui_mcm_menu_exo'] === 'Y'" class="badge-flag badge-powered">{{ t('app_badge_powered') }}</span>
                                        <span v-if="item['st_data_export_can_be_cooked'] === 'Y'" class="badge-flag badge-cookable">{{ t('app_badge_cookable') }}</span>
                                        <span v-if="item['st_data_export_used_in_cooking'] === 'Y'" class="badge-flag badge-ingredient">{{ t('app_badge_ingredient') }}</span>
                                        <span v-if="item['st_data_export_used_in_crafting'] === 'Y'" class="badge-flag badge-craft-mat">{{ t('app_badge_craft_mat') }}</span>
                                        <span v-if="item['st_data_export_cuts_thick_skin'] === 'Y'" class="badge-flag badge-thick-skin">{{ t('app_badge_thick_skin') }}</span>
                                    </div>
                                </template>
                                <template v-else-if="col.key === 'Type'">
                                    <span class="badge-flag badge-type">{{ t(singularType(item[col.key])) }}</span>
                                </template>
                                <template v-else-if="col.key === 'ui_mm_repair'">
                                    <span class="badge" :style="displayStyle(col.key, item[col.key])">{{ displayLabel(col.key, item[col.key]) }}</span>
                                </template>
                                <template v-else-if="col.key === 'st_data_export_single_handed'">
                                    <span class="badge-hands" :data-hands="item[col.key] === 'Y' ? '1' : '2'">{{ item[col.key] === 'Y' ? '1H' : '2H' }}</span>
                                </template>
                                <template v-else-if="col.key === 'ui_ammo_types' || col.key === 'st_data_export_ammo_types_alt'">
                                    <span v-if="item[col.key]" class="table-ammo-list">
                                        <span v-for="a in item[col.key].split(';')" :key="a" :class="col.key === 'st_data_export_ammo_types_alt' ? 'badge-ammo badge-ammo-alt clickable' : 'badge-ammo clickable'" v-tooltip="ammoTooltipPayload(a.trim())" @click.stop="openAmmoFromCaliber(a.trim())">{{ caliberName(a.trim()) }}</span>
                                    </span>
                                </template>
                                <template v-else-if="col.key === 'ui_st_community'">
                                    <span v-if="item[col.key]" class="badge-flag" :style="factionColor(item[col.key]) ? { color: factionColor(item[col.key]), background: 'rgba(' + parseInt(factionColor(item[col.key]).slice(1,3),16) + ',' + parseInt(factionColor(item[col.key]).slice(3,5),16) + ',' + parseInt(factionColor(item[col.key]).slice(5,7),16) + ',0.18)' } : null">{{ t(item[col.key]).toUpperCase() }}</span>
                                </template>
                                <template v-else>
                                    <span :class="statClass(col.key, cellValue(item, col.key))" :style="statStyle(col.key, cellValue(item, col.key))">{{ formatValue(col.key, cellValue(item, col.key), true) }}</span>
                                </template>
                            </td>
                        </template>
                    </tr>
                    </tbody>
                </table>
            </div>
            <div class="tile-grid" v-show="(viewMode === 'tiles' || favoritesViewActive || recentViewActive) && !isOutfitExchange && !isMaterialsCategory && !isCraftingTrees && !isToolkitRates && !buildPlannerActive && !versionCompareActive">
                <div v-for="item in sortedItems" :key="item.id" class="tile-card" :class="{ 'tile-card-compact': favoritesViewActive || recentViewActive }" @click="navigateToItem(item.id)">
                    <div class="tile-card-header">
                        <span class="fav-icon" :class="{ favorited: isFavorited(item.id) }" @click.stop="toggleFavorite(item.id)">{{ isFavorited(item.id) ? '\u2605' : '\u2606' }}</span>
                        <span class="pin-icon" :class="{ pinned: isPinned(item.id), 'pin-disabled': !isPinned(item.id) && pinnedIds.length >= 5 }" @click.stop="togglePin(item.id)">&#x1F4CC;</span>
                        <a href="#" @click.prevent.stop="navigateToItem(item.id)" class="tile-card-name">{{ tItemName(item) }}</a>
                        <span v-if="item.hasNpcWeaponDrop === false" class="badge-no-drop" v-tooltip="t('app_tooltip_not_dropped')">{{ t('app_badge_no_drop') }}</span>
                        <span v-if="isUnusedAmmo(item)" class="badge-unused" v-tooltip="t('app_tooltip_unused_ammo')">{{ t('app_badge_unused') }}</span>
                        <span v-if="item.Type" class="badge-flag badge-type">{{ t(singularType(item.Type)) }}</span>
                        <span v-if="item['st_data_export_has_perk'] === 'Y'" class="badge-flag badge-perk">{{ t('app_badge_perk') }}</span>
                        <span v-if="item['st_data_export_is_junk'] === 'Y'" class="badge-flag badge-junk">{{ t('app_badge_junk') }}</span>
                        <span v-if="item['st_data_export_can_be_crafted'] === 'Y'" class="badge-flag badge-craftable">{{ t('app_badge_craftable') }}</span>
                        <span v-if="item['ui_mcm_menu_exo'] === 'Y'" class="badge-flag badge-powered">{{ t('app_badge_powered') }}</span>
                        <span v-if="item['st_data_export_can_be_cooked'] === 'Y'" class="badge-flag badge-cookable">{{ t('app_badge_cookable') }}</span>
                        <span v-if="item['st_data_export_used_in_cooking'] === 'Y'" class="badge-flag badge-ingredient">{{ t('app_badge_ingredient') }}</span>
                        <span v-if="item['st_data_export_used_in_crafting'] === 'Y'" class="badge-flag badge-craft-mat">{{ t('app_badge_craft_mat') }}</span>
                        <span v-if="item['st_data_export_cuts_thick_skin'] === 'Y'" class="badge-flag badge-thick-skin">{{ t('app_badge_thick_skin') }}</span>
                        <span v-if="(favoritesViewActive || recentViewActive) && item.category" class="badge-flag badge-category">{{ t(singularCategory(item.category)) }}</span>
                    </div>
                    <div class="tile-card-stats" v-show="tileFields.length > 0">
                        <div v-for="field in tileFields" :key="field" class="tile-stat-row">
                            <span class="stat-label" v-tooltip="field === '_malfunction_chance' ? t('app_tooltip_malfunction') : ''">{{ headerLabel(field) }}<svg v-if="field === '_malfunction_chance'" class="info-hint" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg></span>
                            <template v-if="field === 'ui_mm_repair'">
                                <span class="badge" :style="displayStyle(field, item[field])">{{ displayLabel(field, item[field]) }}</span>
                            </template>
                            <template v-else-if="field === 'ui_ammo_types' || field === 'st_data_export_ammo_types_alt'">
                                <span v-if="item[field]" class="tile-ammo-list">
                                    <span v-for="a in item[field].split(';')" :key="a" :class="field === 'st_data_export_ammo_types_alt' ? 'badge-ammo badge-ammo-alt clickable' : 'badge-ammo clickable'" v-tooltip="ammoTooltipPayload(a.trim())" @click.stop="openAmmoFromCaliber(a.trim())">{{ caliberName(a.trim()) }}</span>
                                </span>
                                <span v-else class="stat-value">--</span>
                            </template>
                            <template v-else-if="field === 'ui_st_community'">
                                <span v-if="item[field]" class="badge-flag" :style="factionColor(item[field]) ? { color: factionColor(item[field]), background: 'rgba(' + parseInt(factionColor(item[field]).slice(1,3),16) + ',' + parseInt(factionColor(item[field]).slice(3,5),16) + ',' + parseInt(factionColor(item[field]).slice(5,7),16) + ',0.18)' } : null">{{ t(item[field]).toUpperCase() }}</span>
                            </template>
                            <template v-else>
                                <span class="stat-value" :class="statClass(field, cellValue(item, field))" :style="statStyle(field, cellValue(item, field))">{{ formatValue(field, cellValue(item, field)) }}</span>
                            </template>
                        </div>
                    </div>
                    <div v-for="hg in tileHealGroups" :key="hg.label" class="tile-stat-row">
                        <span class="stat-label">{{ t(hg.label) }}</span>
                        <span class="heal-parts">
                            <span v-for="(f, i) in hg.fields" :key="f" class="heal-part" :class="{ 'heal-active': parseInt(item[f]) > 0 }">
                                {{ hg.abbr[i] }}<span class="heal-dots"><span v-for="d in healDots(item[f]).filled" :key="'f'+d" class="dot filled">&#x2022;</span><span v-for="d in healDots(item[f]).empty" :key="'e'+d" class="dot empty">&#x2022;</span></span>
                            </span>
                        </span>
                    </div>
                </div>
            </div>
        </div>
    </main>
</div>

<!-- Compare bar -->
<Transition name="slide-up">
<div class="compare-bar" v-show="pinnedIds.length > 0">
    <LucideScale class="compare-bar-icon" />
    <div class="compare-bar-chips">
        <span v-for="p in pinnedItems" :key="p.id" class="compare-chip">
          <span class="compare-chip-name">{{ p.displayName }}</span>
          <span class="compare-chip-cat">{{ tCatSingular(p.category) }}</span>
          <button class="compare-chip-remove" @click="togglePin(p.id)">&times;</button>
        </span>
    </div>
    <div class="compare-bar-actions">
        <button class="compare-btn" :disabled="pinnedIds.length < 2" @click="openCompare()">{{ t('app_label_compare') }} ({{ pinnedIds.length }})</button>
        <button class="compare-clear-btn" @click="clearPins()">{{ t('app_label_clear') }}</button>
    </div>
</div>
</Transition>

<!-- Compare modal -->
<Transition name="fade">
<div class="modal-backdrop" v-if="compareOpen" @click.self="closeCompare()" style="z-index: 200;">
    <Transition name="modal" appear>
    <div class="modal compare-modal" v-if="compareOpen">
        <button class="modal-close" @click="closeCompare()">&times;</button>
        <div class="compare-header">
            <h2 class="compare-title">{{ t('app_label_compare_items') }}</h2>
            <div class="compare-view-toggle" v-if="compareData.length > 0">
                <button :class="{ active: compareViewMode === 'table' }" @click="compareViewMode = 'table'">Table</button>
                <button :class="{ active: compareViewMode === 'chart' }" @click="compareViewMode = 'chart'">Chart</button>
            </div>
        </div>
        <div class="compare-content">
            <template v-if="compareData.length === 0">
                <p class="loading">{{ t('app_label_loading_compare') }}</p>
            </template>
            <template v-else>
                <div v-show="compareViewMode === 'chart'" class="compare-chart-wrap">
                    <canvas ref="compareChartCanvas"></canvas>
                </div>
                <div class="compare-table-wrap" v-show="compareViewMode === 'table'">
                    <table class="compare-table">
                        <thead>
                        <tr>
                            <th class="compare-label-col">{{ t('app_label_stat') }}</th>
                            <th v-for="entry in compareData" :key="entry.item.id" class="compare-item-col">
                                <span class="compare-item-name">{{ tName(entry.item) }}</span>
                                <span class="compare-item-cat">{{ tCat(entry.category) }}</span>
                            </th>
                        </tr>
                        </thead>
                        <tbody>
                        <tr v-for="row in compareStatRows" :key="row.label">
                            <td class="compare-label">{{ headerLabel(row.label) }}</td>
                            <td v-for="(val, idx) in row.values" :key="idx" class="compare-value" :class="compareValueClass(row, idx)">
                                <span class="compare-icon">{{ compareValueIcon(row, idx) }}</span>
                                <span>{{ formatValue(row.label, val) }}</span>
                            </td>
                        </tr>
                        </tbody>
                    </table>
                </div>
            </template>
        </div>
    </div>
    </Transition>
</div>
</Transition>

<!-- Item detail modal -->
<Transition name="fade">
<div class="modal-backdrop" v-if="modalOpen" @click.self="closeModal()">
    <button class="modal-nav modal-nav-prev" @click="navigateModal(-1)" v-tooltip="'&#8592;'">&lsaquo;</button>
    <button class="modal-nav modal-nav-next" @click="navigateModal(1)" v-tooltip="'&#8594;'">&rsaquo;</button>
    <button class="modal-close" @click="closeModal()">&times;</button>
    <Transition name="modal" appear>
    <div class="modal" v-if="modalOpen">
        <div class="modal-body">
            <p v-show="modalLoading" class="loading">{{ t('app_label_loading') }}</p>

            <div v-if="modalItem && !modalLoading">
                <div class="item-icon-float" :key="'icon-' + modalItem.id">
                    <img v-if="modalItem.ui_st_community && factionIcon(modalItem.ui_st_community)" :src="'img/' + factionIcon(modalItem.ui_st_community)" :alt="modalItem.ui_st_community" class="item-icon-float-faction" v-tooltip="t(modalItem.ui_st_community)">
                    <img class="item-icon item-icon-lg" :src="'img/icons/' + modalItem.id + '.png'" @load="$event.target.classList.add($event.target.naturalHeight <= $event.target.naturalWidth ? 'item-icon-landscape' : 'item-icon-portrait')" @error="$event.target.classList.add('item-icon-hidden'); $event.target.parentElement.classList.add('no-icon')">
                    <div class="item-icon-placeholder">
                        <svg viewBox="0 0 100 40" xmlns="http://www.w3.org/2000/svg" class="item-icon-placeholder-x">
                            <line x1="5" y1="5" x2="95" y2="35" stroke="currentColor" stroke-width="1"/>
                            <line x1="95" y1="5" x2="5" y2="35" stroke="currentColor" stroke-width="1"/>
                        </svg>
                        <span class="item-icon-placeholder-text">{{ t('app_label_no_image') }}</span>
                    </div>
                </div>
                <div class="modal-title-row">
                    <h1 class="modal-title">{{ tName(modalItem) }}</h1>
                </div>
                <div class="item-meta">
                    <span class="cat-badge">{{ t(singularCategory(modalCategory)) || tCat(modalCategory) }}</span>
                    <span class="item-id">{{ modalItem.id }}</span>
                </div>
                <div class="item-toolbar">
                    <div class="utility-group">
                        <button class="copy-link-btn" :class="{ favorited: isFavorited(modalItem.id) }" @click="toggleFavorite(modalItem.id)" v-tooltip="isFavorited(modalItem.id) ? t('app_tooltip_remove_fav') : t('app_tooltip_add_fav')">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" :fill="isFavorited(modalItem.id) ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                        </button>
                        <button class="copy-link-btn" :class="{ pinned: isPinned(modalItem.id), 'pin-disabled': !isPinned(modalItem.id) && pinnedIds.length >= 5 }" @click="togglePin(modalItem.id)" v-tooltip="isPinned(modalItem.id) ? t('app_tooltip_unpin') : t('app_tooltip_pin')">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" :fill="isPinned(modalItem.id) ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 17v5"/><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z"/></svg>
                        </button>
                    </div>
                    <div class="utility-group">
                        <button class="copy-link-btn" :class="{ copied: copyIdFeedback }" @click="copyItemId(modalItem.id)" v-tooltip="copyIdFeedback ? t('app_label_copied') : t('app_tooltip_copy_id')">
                            <svg v-if="copyIdFeedback" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                            <svg v-else xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                        </button>
                        <button class="copy-link-btn" :class="{ copied: copyModalLinkFeedback }" @click="copyModalLink()" v-tooltip="copyModalLinkFeedback ? t('app_label_copied') : t('app_label_copy_link')">
                            <svg v-if="copyModalLinkFeedback" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                            <svg v-else xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                        </button>
                    </div>
                    <div v-if="packs.length > 1" class="compare-wrap" v-click-outside="closeCompareMenu">
                        <button class="copy-link-btn cross-pack-btn" :class="{ active: crossPackId }" @click.stop="compareMenuOpen = !compareMenuOpen" v-tooltip="t('app_label_compare_with')">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 3h5v5"/><path d="M8 3H3v5"/><path d="M12 22v-8.3a4 4 0 0 0-1.172-2.872L3 3"/><path d="m15 9 6-6"/></svg>
                        </button>
                        <div class="compare-menu" v-show="compareMenuOpen" @click.stop>
                            <button v-for="p in crossPackOptions" :key="p.id" class="sort-menu-item" :class="{ active: crossPackId === p.id }" @click="pickComparePack(p.id)">
                                <span class="sort-menu-check">{{ crossPackId === p.id ? '\u2713' : '' }}</span>
                                <span>{{ p.name }}</span>
                            </button>
                            <template v-if="crossPackId">
                                <div class="sort-menu-divider"></div>
                                <button class="sort-menu-item" @click="pickComparePack(null)">
                                    <span class="sort-menu-check"></span>
                                    <span>{{ t('app_label_clear') }}</span>
                                </button>
                            </template>
                        </div>
                    </div>
                </div>

                <div class="modal-badges" v-if="modalItem['st_data_export_has_perk'] === 'Y' || modalItem['st_data_export_is_junk'] === 'Y' || modalItem['st_data_export_can_be_crafted'] === 'Y' || modalItem['ui_mcm_menu_exo'] === 'Y' || modalItem['st_data_export_can_be_cooked'] === 'Y' || modalItem['st_data_export_used_in_cooking'] === 'Y' || modalItem['st_data_export_used_in_crafting'] === 'Y' || modalItem['st_data_export_cuts_thick_skin'] === 'Y' || modalItem.hasNpcWeaponDrop === false || isUnusedAmmo(modalItem, modalCategory)">
                    <span v-if="modalItem.hasNpcWeaponDrop === false" class="badge-no-drop" v-tooltip="t('app_tooltip_not_dropped')">{{ t('app_badge_no_drop') }}</span>
                    <span v-if="isUnusedAmmo(modalItem, modalCategory)" class="badge-unused" v-tooltip="t('app_tooltip_unused_ammo')">{{ t('app_badge_unused') }}</span>
                    <span v-if="modalItem['st_data_export_has_perk'] === 'Y'" class="badge-flag badge-perk">{{ t('app_badge_perk') }}</span>
                    <span v-if="modalItem['st_data_export_is_junk'] === 'Y'" class="badge-flag badge-junk">{{ t('app_badge_junk') }}</span>
                    <span v-if="modalItem['st_data_export_can_be_crafted'] === 'Y'" class="badge-flag badge-craftable">{{ t('app_badge_craftable') }}</span>
                    <span v-if="modalItem['ui_mcm_menu_exo'] === 'Y'" class="badge-flag badge-powered">{{ t('app_badge_powered') }}</span>
                    <span v-if="modalItem['st_data_export_can_be_cooked'] === 'Y'" class="badge-flag badge-cookable">{{ t('app_badge_cookable') }}</span>
                    <span v-if="modalItem['st_data_export_used_in_cooking'] === 'Y'" class="badge-flag badge-ingredient">{{ t('app_badge_ingredient') }}</span>
                    <span v-if="modalItem['st_data_export_used_in_crafting'] === 'Y'" class="badge-flag badge-craft-mat">{{ t('app_badge_craft_mat') }}</span>
                    <span v-if="modalItem['st_data_export_cuts_thick_skin'] === 'Y'" class="badge-flag badge-thick-skin">{{ t('app_badge_thick_skin') }}</span>
                </div>


                <div class="modal-description-row">
                    <div class="modal-description-content">
                        <p v-if="parsedDescription" class="modal-description">{{ parsedDescription.text }}</p>
                        <div v-if="parsedDescription && parsedDescription.sections.length" class="modal-desc-meta">
                            <template v-for="section in parsedDescription.sections">
                                <span v-if="section.header === 'WARNING'" v-for="item in section.items" class="desc-chip desc-chip-warning">{{ item }}</span>
                                <span v-else v-for="item in section.items" class="desc-chip">{{ item }}</span>
                            </template>
                        </div>
                    </div>
                </div>

                <div class="drop-sources">
                    <h2>{{ t('app_label_stats') }}</h2>
                    <div class="stat-grid">
                        <div v-for="row in modalStatRows" :key="row.key" :class="row.isSection ? 'stat-section' : 'stat-row'">
                            <template v-if="row.isSection">
                                <span>{{ headerLabel(row.key) }}</span>
                            </template>
                            <template v-else-if="row.key === 'ui_mm_repair' && row.value">
                                <span class="stat-label">{{ headerLabel(row.key) }}</span>
                                <span class="badge" :style="displayStyle(row.key, row.value)">{{ displayLabel(row.key, row.value) }}</span>
                            </template>
                            <template v-else-if="(row.key === 'ui_ammo_types' || row.key === 'st_data_export_ammo_types_alt') && row.value">
                                <span class="stat-label">{{ headerLabel(row.key) }}</span>
                                <span class="stat-value ammo-variants">
                                    <span v-for="v in caliberVariantObjects(row.value)" :key="v.id || v.name" class="badge-ammo" :class="{ clickable: v.id }" @click="v.id && navigateToItem(v.id)">{{ shortAmmoName(tName(v)) }}</span>
                                </span>
                            </template>
                            <template v-else>
                                <span class="stat-label" v-tooltip="row.key === '_malfunction_chance' ? t('app_tooltip_malfunction') : ''">{{ headerLabel(row.key) }}<svg v-if="row.key === '_malfunction_chance'" class="info-hint" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg></span>
                                <span class="stat-value" :class="modalStatClass(row.key, row.value)" :style="modalStatStyle(row.key, row.value)">{{ formatValue(row.key, row.value) }}</span>
                            </template>
                        </div>
                    </div>
                    <div v-if="modalHealGroups.length > 0" class="stat-grid modal-heal-grid">
                        <div v-for="hg in modalHealGroups" :key="hg.label" class="stat-row modal-heal-row">
                            <span class="stat-label">{{ t(hg.label) }}</span>
                            <span class="heal-parts">
                                <span v-for="(f, i) in hg.fields" :key="f" class="heal-part" :class="{ 'heal-active': parseInt(modalItem[f]) > 0 }">
                                    {{ hg.abbr[i] }}<span class="heal-dots"><span v-for="d in healDots(modalItem[f]).filled" :key="'f'+d" class="dot filled">&#x2022;</span><span v-for="d in healDots(modalItem[f]).empty" :key="'e'+d" class="dot empty">&#x2022;</span></span>
                                </span>
                            </span>
                        </div>
                    </div>
                </div>

                <!-- Cross-pack changes -->
                <div v-if="crossPackId && crossPackItem" class="drop-sources">
                    <h2>{{ t('app_label_changes_from') }} {{ crossPackName }}</h2>
                    <div v-if="crossPackDiffs.length" class="stat-grid">
                        <div v-for="row in crossPackDiffs" :key="'diff-'+row.key" class="stat-row">
                            <span class="stat-label">{{ headerLabel(row.key) }}</span>
                            <span class="stat-value diff-values"><span class="diff-old">{{ formatValue(row.key, row.otherValue) }}</span> <span class="diff-arrow">▶</span> <span class="diff-new" :class="row.diff.type === 'higher' ? 'diff-up' : 'diff-down'">{{ formatValue(row.key, row.value) }}</span></span>
                        </div>
                    </div>
                    <p v-else class="cross-pack-no-changes">{{ t('app_label_no_changes') }}</p>
                </div>
                <div v-else-if="crossPackId && crossPackNotFound" class="drop-sources">
                    <h2>{{ t('app_label_changes_from') }} {{ crossPackName }}</h2>
                    <p class="cross-pack-no-changes">{{ t('app_label_not_in_pack') }}</p>
                </div>

                <!-- Compatible Ammo (on weapon detail) -->
                <div v-if="modalAmmoVariants.length > 0" class="drop-sources">
                    <h2>{{ t('app_label_compatible_ammo') }}</h2>
                    <div class="ammo-table-wrap">
                        <table class="ammo-compare-table">
                            <thead>
                                <tr>
                                    <th>{{ t('app_label_variant') }}</th>
                                    <th v-for="k in modalAmmoStatKeys" :key="k" class="text-right">{{ k === 'AP' ? 'AP' : headerLabel(k) }}</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="v in modalAmmoVariants" :key="v.id || v.name" :class="{ 'ammo-alt-row': v.isAlt }">
                                    <td>
                                        <a v-if="v.id" href="#" @click.prevent="navigateToItem(v.id)" class="ammo-variant-link">{{ shortAmmoName(tName(v)) }}</a>
                                        <span v-else>{{ shortAmmoName(tName(v)) }}</span>
                                        <span v-if="v.isAlt" class="badge-ammo badge-ammo-alt ammo-alt-tag">{{ t('app_badge_alt') }}</span>
                                    </td>
                                    <td v-for="k in modalAmmoStatKeys" :key="k" class="ammo-stat-cell" :class="{ 'ammo-best': isAmmoBest(k, v[k], v) }">{{ formatAmmoStat(k, v[k], v) }}<template v-if="ammoArrow(k, v[k]) !== null"><span class="ammo-arrow" :class="ammoArrow(k, v[k]) > 0 ? 'arrow-up' : ammoArrow(k, v[k]) < 0 ? 'arrow-down' : 'arrow-neutral'">{{ ammoArrow(k, v[k]) > 0 ? '\u25B2' : ammoArrow(k, v[k]) < 0 ? '\u25BC' : '\u25CF' }}</span></template></td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- NPC drop sources -->
                <div v-if="modalDropFactions.length > 0" class="drop-sources">
                    <h2>{{ t('app_label_npc_drops') }}</h2>
                    <div class="drop-grid">
                        <div v-for="f in modalDropFactions" :key="f.name" class="drop-faction">
                            <img v-if="f.icon" :src="'img/' + f.icon" :alt="f.name" class="drop-faction-icon">
                            <div class="drop-faction-body">
                                <div class="drop-faction-name">{{ t(f.name.toLowerCase()) }}</div>
                                <div class="drop-ranks">
                                    <span v-for="rank in f.ranks" :key="rank" class="drop-rank">{{ t(rank) }}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Stash drop locations -->
                <div v-if="modalItemDropLocations.length > 0" class="drop-sources">
                    <h2>{{ t('app_label_stash_drops') }}</h2>
                    <div class="stash-drop-grid">
                        <div v-for="row in modalItemDropLocations" :key="row.map" class="stash-drop-card">
                            <div class="stash-drop-map">{{ t(row.map) }}</div>
                            <div class="stash-drop-chances">
                                <template v-for="type in modalItemDropTypes" :key="type">
                                    <span class="stash-chance" :class="'stash-chance-' + type.split('_').pop()" v-tooltip="t(type)">{{ row[type] ? row[type].chance + '%' : '--' }}</span>
                                </template>
                            </div>
                            <div v-if="modalItemDropHasRestrictedEcos" class="stash-drop-ecos">
                                <template v-for="type in modalItemDropTypes" :key="type">
                                    <span v-if="row[type] && row[type].ecos.length" class="stash-eco-tag" v-tooltip="t(type) + ' Ecos'">{{ row[type].ecos.join('/') }}</span>
                                </template>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Crafting Recipe -->
                <div v-if="modalRecipe" class="drop-sources">
                    <h2>{{ t('app_label_crafting_recipe') }}</h2>
                    <div class="recipe-ingredients recipe-ingredients-modal">
                        <div v-for="(ing, idx) in modalRecipe" :key="idx" class="recipe-ingredient">
                            <span v-if="idx > 0" class="recipe-plus">+</span>
                            <template v-if="findItemByName(ing.name)">
                                <a href="#" @click.prevent="navigateToItem(findItemByName(ing.name).id)" :class="idx === 0 ? 'recipe-base' : ''">{{ t(ing.name) }}</a>
                            </template>
                            <template v-else>
                                <span :class="idx === 0 ? 'recipe-base' : ''">{{ t(ing.name) }}</span>
                            </template>
                            <span class="recipe-ing-amount">{{ ing.amount }}</span>
                        </div>
                    </div>
                </div>

                <!-- Used in Crafting -->
                <div v-if="modalUsedInRecipes.length > 0" class="drop-sources">
                    <h2>{{ t('app_label_used_in_crafting') }}</h2>
                    <div class="recipe-used-list">
                        <div v-for="recipe in modalUsedInRecipes" :key="recipe.id" class="recipe-used-item">
                            <a href="#" @click.prevent="navigateToItem(recipe.id)">{{ tName(recipe) }}</a>
                        </div>
                    </div>
                </div>

                <!-- Disassembles Into -->
                <div v-if="modalDisassembleMaterials" class="drop-sources">
                    <h2>{{ t('app_label_disassembles') }}</h2>
                    <div class="recipe-ingredients recipe-ingredients-modal">
                        <div v-for="(mat, idx) in modalDisassembleMaterials" :key="idx" class="recipe-ingredient">
                            <span v-if="idx > 0" class="recipe-plus">+</span>
                            <template v-if="findItemByName(mat.name)">
                                <a href="#" @click.prevent="navigateToItem(findItemByName(mat.name).id)">{{ t(mat.name) }}</a>
                            </template>
                            <template v-else>
                                <span>{{ t(mat.name) }}</span>
                            </template>
                            <span class="recipe-ing-amount">{{ mat.amount }}</span>
                        </div>
                    </div>
                </div>

                <!-- Used By Weapons (on ammo detail) -->
                <div v-if="modalUsedByWeapons.length > 0" class="drop-sources">
                    <h2>{{ t('app_label_used_by') }}</h2>
                    <div class="used-by-grid">
                        <div v-for="w in modalUsedByWeapons" :key="w.id" class="used-by-item">
                            <a href="#" @click.prevent="navigateToItem(w.id)">{{ tName(w) }}</a>
                            <span class="used-by-cat">{{ tCat(w.category) }}</span>
                            <span v-if="w.isAlt" class="badge-ammo badge-ammo-alt ammo-alt-tag">{{ t('app_badge_alt') }}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
    </Transition>
</div>
</Transition>

<!-- Build Save Name modal -->
<Transition name="fade">
<div class="modal-backdrop" v-if="buildSaveModalOpen" @click.self="buildSaveModalOpen = false" style="z-index: 210;">
    <Transition name="modal" appear>
    <div class="modal build-save-modal" v-if="buildSaveModalOpen">
        <button class="modal-close" @click="buildSaveModalOpen = false">&times;</button>
        <div class="modal-body">
            <h2 class="build-picker-title">{{ t('app_build_save') }}</h2>
            <div class="build-save-form">
                <input type="text" v-model="buildSaveName" :placeholder="t('app_build_name_placeholder')" class="build-save-input" ref="buildSaveInput" @keydown.enter="saveCurrentBuild()">
                <button class="build-toolbar-btn" @click="saveCurrentBuild()" :disabled="!buildSaveName.trim()">{{ t('app_build_save') }}</button>
            </div>
        </div>
    </div>
    </Transition>
</div>
</Transition>

<!-- Save Import modal -->
<Transition name="fade">
<div class="modal-backdrop" v-if="saveImportModalOpen" @click.self="closeSaveImport()" style="z-index: 215;">
    <Transition name="modal" appear>
    <div class="modal save-import-modal" v-if="saveImportModalOpen">
        <div class="save-import-header">
            <h2 class="build-picker-title" style="margin:0">{{ t('app_save_import_title') || 'Import Save File' }}</h2>
            <button class="save-import-close" @click="closeSaveImport()">&times;</button>
        </div>
        <div class="modal-body">

            <!-- Drop zone -->
            <div v-if="!saveImportPreview && !saveImportParsing && !saveImportError" class="save-import-dropzone" :class="{ 'save-import-dragover': saveImportDragOver }" @dragover.prevent="saveImportDragOver = true" @dragleave.prevent="saveImportDragOver = false" @drop.prevent="handleSaveImportDrop($event)">
                <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="save-import-icon"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M12 18v-6"/><path d="m9 15 3-3 3 3"/></svg>
                <p class="save-import-dropzone-label">{{ t('app_save_import_drop') || 'Drop save files here' }}</p>
                <label class="save-import-browse-btn build-toolbar-btn">
                    {{ t('app_save_import_browse') || 'Browse' }}
                    <input type="file" accept=".scop,.scoc" multiple @change="handleSaveImportFile($event)" style="display:none">
                </label>
                <p class="save-import-hint">{{ t('app_save_import_hint') || 'Select .scop and .scoc files for full loadout detection' }}</p>
            </div>

            <!-- Loading -->
            <div v-if="saveImportParsing" class="save-import-loading">
                <span class="loading-spinner"></span>
                <p>{{ t('app_save_import_parsing') || 'Parsing save file...' }}</p>
            </div>

            <!-- Error -->
            <div v-if="saveImportError" class="save-import-error-box">
                <p class="save-import-error-msg">{{ saveImportError }}</p>
                <button class="build-toolbar-btn" @click="saveImportError = ''; saveImportPreview = null">{{ t('app_save_import_retry') || 'Try Again' }}</button>
            </div>

            <!-- Preview -->
            <div v-if="saveImportPreview && !saveImportParsing" class="save-import-preview">
                <div class="save-import-summary">
                    <span class="save-import-filename">{{ saveImportFileName }}</span>
                    <span class="save-import-stats">{{ saveImportPreview.totalItems }} {{ t('app_save_import_items_found') || 'items found' }}<span v-if="saveImportPreview.stashCount"> &middot; {{ saveImportPreview.stashCount }} in stash</span><span v-if="saveImportPreview.skipped.length"> &middot; {{ saveImportPreview.skipped.length }} {{ t('app_save_import_skipped') || 'consumables/materials skipped' }}</span></span>
                </div>

                <div v-if="saveImportPreview.missingSCOC" class="save-import-warning">
                    {{ t('app_save_import_warn_missing_scoc') || 'Only .scop file provided — add the .scoc file for accurate equipped item detection' }}
                </div>

                <!-- Global options -->
                <div class="save-import-options">
                    <label class="save-import-stash-toggle"><input type="checkbox" v-model="saveImportIncludeAmmo"> {{ t('app_save_import_include_ammo') || 'Include ammo' }}</label>
                    <label class="save-import-stash-toggle"><input type="checkbox" v-model="saveImportIncludeStash"> {{ t('app_save_import_include_stash') || 'Include stash' }}</label>
                </div>

                <div class="save-import-columns">
                <!-- Left column: Loadout + Inventory -->
                <div class="save-import-col">
                    <p class="save-import-section-label">{{ t('app_build_loadout') || 'Loadout' }}</p>
                    <div class="save-import-slots">
                        <div class="save-import-slot" v-if="saveImportPreview.outfit">
                            <span class="save-import-slot-label">{{ t('app_cat_outfits') || 'Outfit' }}</span>
                            <span class="save-import-slot-items"><span class="save-import-slot-item" @mouseenter="saveImportHover(saveImportPreview.outfit, $event)" @mousemove="moveBuildHover($event)" @mouseleave="hideBuildHover()">{{ saveImportItemName(saveImportPreview.outfit) }}</span></span>
                        </div>
                        <div class="save-import-slot" v-if="saveImportPreview.helmet">
                            <span class="save-import-slot-label">{{ t('app_cat_helmets') || 'Helmet' }}</span>
                            <span class="save-import-slot-items"><span class="save-import-slot-item" @mouseenter="saveImportHover(saveImportPreview.helmet, $event)" @mousemove="moveBuildHover($event)" @mouseleave="hideBuildHover()">{{ saveImportItemName(saveImportPreview.helmet) }}</span></span>
                        </div>
                        <div class="save-import-slot" v-if="saveImportPreview.backpack">
                            <span class="save-import-slot-label">{{ t('app_type_backpack') || 'Backpack' }}</span>
                            <span class="save-import-slot-items"><span class="save-import-slot-item" @mouseenter="saveImportHover(saveImportPreview.backpack, $event)" @mousemove="moveBuildHover($event)" @mouseleave="hideBuildHover()">{{ saveImportItemName(saveImportPreview.backpack) }}</span></span>
                        </div>
                        <div class="save-import-slot" v-if="saveImportPreview.artifacts.length">
                            <span class="save-import-slot-label">{{ t('app_cat_artefacts') || 'Artefacts' }}</span>
                            <span class="save-import-slot-items">
                                <span v-for="(id, i) in saveImportPreview.artifacts" :key="i" class="save-import-slot-item" @mouseenter="saveImportHover(id, $event)" @mousemove="moveBuildHover($event)" @mouseleave="hideBuildHover()">{{ saveImportItemName(id) }}</span>
                            </span>
                        </div>
                        <div class="save-import-slot" v-if="saveImportPreview.belts.length">
                            <span class="save-import-slot-label">{{ t('app_cat_belt_attachments') || 'Belt' }}</span>
                            <span class="save-import-slot-items">
                                <span v-for="(id, i) in saveImportPreview.belts" :key="i" class="save-import-slot-item" @mouseenter="saveImportHover(id, $event)" @mousemove="moveBuildHover($event)" @mouseleave="hideBuildHover()">{{ saveImportItemName(id) }}</span>
                            </span>
                        </div>
                        <div class="save-import-slot" v-if="saveImportPreview.weapons.length">
                            <span class="save-import-slot-label">{{ t('app_group_weapons') || 'Weapons' }}</span>
                            <span class="save-import-slot-items">
                                <span v-for="(id, i) in saveImportPreview.weapons" :key="i" class="save-import-slot-item" @mouseenter="saveImportHover(id, $event)" @mousemove="moveBuildHover($event)" @mouseleave="hideBuildHover()">{{ saveImportItemName(id) }}</span>
                            </span>
                        </div>
                        <div class="save-import-slot" v-if="saveImportPreview.sidearms.length">
                            <span class="save-import-slot-label">{{ t('app_build_sidearm') || 'Sidearm' }}</span>
                            <span class="save-import-slot-items">
                                <span v-for="(id, i) in saveImportPreview.sidearms" :key="i" class="save-import-slot-item" @mouseenter="saveImportHover(id, $event)" @mousemove="moveBuildHover($event)" @mouseleave="hideBuildHover()">{{ saveImportItemName(id) }}</span>
                            </span>
                        </div>
                        <div class="save-import-slot" v-if="saveImportPreview.grenades.length">
                            <span class="save-import-slot-label">{{ t('app_cat_explosives') || 'Grenades' }}</span>
                            <span class="save-import-slot-items">
                                <span v-for="(id, i) in saveImportPreview.grenades" :key="i" class="save-import-slot-item" @mouseenter="saveImportHover(id, $event)" @mousemove="moveBuildHover($event)" @mouseleave="hideBuildHover()">{{ saveImportItemName(id) }}</span>
                            </span>
                        </div>
                    </div>

                    <!-- Carried inventory (not equipped) -->
                    <template v-if="saveImportPreview.inventory.artifacts.length || saveImportPreview.inventory.belts.length || saveImportPreview.inventory.weapons.length || saveImportPreview.inventory.sidearms.length || saveImportPreview.inventory.grenades.length || saveImportPreview.inventory.outfits.length || saveImportPreview.inventory.helmets.length || (saveImportIncludeAmmo && saveImportPreview.ammo.length)">
                        <p class="save-import-section-label">{{ t('app_save_import_inventory') || 'Inventory' }}</p>
                        <div class="save-import-slots">
                            <div class="save-import-slot" v-if="saveImportPreview.inventory.artifacts.length">
                                <span class="save-import-slot-label">{{ t('app_cat_artefacts') || 'Artefacts' }}</span>
                                <span class="save-import-slot-items">
                                    <span v-for="(id, i) in saveImportPreview.inventory.artifacts" :key="i" class="save-import-slot-item" @mouseenter="saveImportHover(id, $event)" @mousemove="moveBuildHover($event)" @mouseleave="hideBuildHover()">{{ saveImportItemName(id) }}</span>
                                </span>
                            </div>
                            <div class="save-import-slot" v-if="saveImportPreview.inventory.belts.length">
                                <span class="save-import-slot-label">{{ t('app_cat_belt_attachments') || 'Belt' }}</span>
                                <span class="save-import-slot-items">
                                    <span v-for="(id, i) in saveImportPreview.inventory.belts" :key="i" class="save-import-slot-item" @mouseenter="saveImportHover(id, $event)" @mousemove="moveBuildHover($event)" @mouseleave="hideBuildHover()">{{ saveImportItemName(id) }}</span>
                                </span>
                            </div>
                            <div class="save-import-slot" v-if="saveImportPreview.inventory.weapons.length || saveImportPreview.inventory.sidearms.length">
                                <span class="save-import-slot-label">{{ t('app_group_weapons') || 'Weapons' }}</span>
                                <span class="save-import-slot-items">
                                    <span v-for="(id, i) in [...saveImportPreview.inventory.weapons, ...saveImportPreview.inventory.sidearms]" :key="i" class="save-import-slot-item" @mouseenter="saveImportHover(id, $event)" @mousemove="moveBuildHover($event)" @mouseleave="hideBuildHover()">{{ saveImportItemName(id) }}</span>
                                </span>
                            </div>
                            <div class="save-import-slot" v-if="saveImportPreview.inventory.outfits.length">
                                <span class="save-import-slot-label">{{ t('app_cat_outfits') || 'Outfits' }}</span>
                                <span class="save-import-slot-items">
                                    <span v-for="(id, i) in saveImportPreview.inventory.outfits" :key="i" class="save-import-slot-item" @mouseenter="saveImportHover(id, $event)" @mousemove="moveBuildHover($event)" @mouseleave="hideBuildHover()">{{ saveImportItemName(id) }}</span>
                                </span>
                            </div>
                            <div class="save-import-slot" v-if="saveImportPreview.inventory.helmets.length">
                                <span class="save-import-slot-label">{{ t('app_cat_helmets') || 'Helmets' }}</span>
                                <span class="save-import-slot-items">
                                    <span v-for="(id, i) in saveImportPreview.inventory.helmets" :key="i" class="save-import-slot-item" @mouseenter="saveImportHover(id, $event)" @mousemove="moveBuildHover($event)" @mouseleave="hideBuildHover()">{{ saveImportItemName(id) }}</span>
                                </span>
                            </div>
                            <div class="save-import-slot" v-if="saveImportIncludeAmmo && saveImportPreview.ammo.length">
                                <span class="save-import-slot-label">{{ t('app_cat_ammo') || 'Ammo' }}</span>
                                <span class="save-import-slot-items">
                                    <span v-for="(id, i) in saveImportPreview.ammo" :key="i" class="save-import-slot-item" @mouseenter="saveImportHover(id, $event)" @mousemove="moveBuildHover($event)" @mouseleave="hideBuildHover()">{{ saveImportItemName(id) }}</span>
                                </span>
                            </div>
                        </div>
                    </template>
                </div>

                <!-- Right column: Stash -->
                <div class="save-import-col" v-if="saveImportIncludeStash && saveImportPreview.stash && (saveImportPreview.stash.weapons.length || saveImportPreview.stash.sidearms.length || saveImportPreview.stash.grenades.length || saveImportPreview.stash.helmets.length || saveImportPreview.stash.outfits.length || saveImportPreview.stash.belts.length || saveImportPreview.stash.artifacts.length || (saveImportIncludeAmmo && saveImportPreview.stash.ammo.length))">
                    <p class="save-import-section-label">{{ t('app_save_import_stash') || 'Stash' }}</p>
                    <div class="save-import-slots">
                        <div class="save-import-slot" v-if="saveImportPreview.stash.outfits.length">
                            <span class="save-import-slot-label">{{ t('app_cat_outfits') || 'Outfits' }}</span>
                            <span class="save-import-slot-items">
                                <span v-for="(id, i) in saveImportPreview.stash.outfits" :key="i" class="save-import-slot-item" @mouseenter="saveImportHover(id, $event)" @mousemove="moveBuildHover($event)" @mouseleave="hideBuildHover()">{{ saveImportItemName(id) }}</span>
                            </span>
                        </div>
                        <div class="save-import-slot" v-if="saveImportPreview.stash.helmets.length">
                            <span class="save-import-slot-label">{{ t('app_cat_helmets') || 'Helmets' }}</span>
                            <span class="save-import-slot-items">
                                <span v-for="(id, i) in saveImportPreview.stash.helmets" :key="i" class="save-import-slot-item" @mouseenter="saveImportHover(id, $event)" @mousemove="moveBuildHover($event)" @mouseleave="hideBuildHover()">{{ saveImportItemName(id) }}</span>
                            </span>
                        </div>
                        <div class="save-import-slot" v-if="saveImportPreview.stash.belts.length">
                            <span class="save-import-slot-label">{{ t('app_cat_belt_attachments') || 'Belt' }}</span>
                            <span class="save-import-slot-items">
                                <span v-for="(id, i) in saveImportPreview.stash.belts" :key="i" class="save-import-slot-item" @mouseenter="saveImportHover(id, $event)" @mousemove="moveBuildHover($event)" @mouseleave="hideBuildHover()">{{ saveImportItemName(id) }}</span>
                            </span>
                        </div>
                        <div class="save-import-slot" v-if="saveImportPreview.stash.artifacts.length">
                            <span class="save-import-slot-label">{{ t('app_cat_artefacts') || 'Artefacts' }}</span>
                            <span class="save-import-slot-items">
                                <span v-for="(id, i) in saveImportPreview.stash.artifacts" :key="i" class="save-import-slot-item" @mouseenter="saveImportHover(id, $event)" @mousemove="moveBuildHover($event)" @mouseleave="hideBuildHover()">{{ saveImportItemName(id) }}</span>
                            </span>
                        </div>
                        <div class="save-import-slot" v-if="saveImportPreview.stash.weapons.length || saveImportPreview.stash.sidearms.length">
                            <span class="save-import-slot-label">{{ t('app_group_weapons') || 'Weapons' }}</span>
                            <span class="save-import-slot-items">
                                <span v-for="(id, i) in [...saveImportPreview.stash.weapons, ...saveImportPreview.stash.sidearms]" :key="i" class="save-import-slot-item" @mouseenter="saveImportHover(id, $event)" @mousemove="moveBuildHover($event)" @mouseleave="hideBuildHover()">{{ saveImportItemName(id) }}</span>
                            </span>
                        </div>
                        <div class="save-import-slot" v-if="saveImportPreview.stash.grenades.length">
                            <span class="save-import-slot-label">{{ t('app_cat_explosives') || 'Grenades' }}</span>
                            <span class="save-import-slot-items">
                                <span v-for="(id, i) in saveImportPreview.stash.grenades" :key="i" class="save-import-slot-item" @mouseenter="saveImportHover(id, $event)" @mousemove="moveBuildHover($event)" @mouseleave="hideBuildHover()">{{ saveImportItemName(id) }}</span>
                            </span>
                        </div>
                        <div class="save-import-slot" v-if="saveImportIncludeAmmo && saveImportPreview.stash.ammo.length">
                            <span class="save-import-slot-label">{{ t('app_cat_ammo') || 'Ammo' }}</span>
                            <span class="save-import-slot-items">
                                <span v-for="(id, i) in saveImportPreview.stash.ammo" :key="i" class="save-import-slot-item" @mouseenter="saveImportHover(id, $event)" @mousemove="moveBuildHover($event)" @mouseleave="hideBuildHover()">{{ saveImportItemName(id) }}</span>
                            </span>
                        </div>
                    </div>
                </div>
                </div>

                <div class="save-import-actions">
                    <button class="build-toolbar-btn save-import-cancel" @click="closeSaveImport()">Cancel</button>
                    <button class="build-toolbar-btn save-import-confirm" @click="confirmSaveImport()">{{ t('app_save_import_load') || 'Load Build' }}</button>
                </div>
            </div>
        </div>
    </div>
    </Transition>
</div>
</Transition>

<!-- Build Picker modal -->
<Transition name="fade">
<div class="modal-backdrop" v-if="buildPickerOpen" @click.self="closeBuildPicker()" style="z-index: 210;">
    <Transition name="modal" appear>
    <div class="modal build-picker-modal" v-if="buildPickerOpen">
        <button class="modal-close" @click="closeBuildPicker()">&times;</button>
        <div class="modal-body">
            <h2 class="build-picker-title">{{ t('app_build_select') }} {{ buildPickerSlot ? buildPickerSlotLabel : '' }}</h2>
            <div class="build-picker-search">
                <svg class="filter-input-icon" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                <input type="text" v-model="buildPickerQuery" :placeholder="t('app_label_filter_placeholder')" class="build-picker-input" ref="buildPickerInput">
            </div>
            <div class="build-picker-list">
                <div v-for="item in buildPickerItems" :key="item.id" class="build-picker-item" @click="selectBuildItem(item)" @mouseenter="showBuildHover(item, $event)" @mousemove="moveBuildHover($event)" @mouseleave="hideBuildHover()">
                    <span class="build-picker-item-name">{{ tItemName(item) }}</span>
                    <span v-if="buildPickerSlot && buildPickerSlot.type === 'ammo' && isAltAmmo(buildPickerAmmoWeapon, item)" class="badge-ammo badge-ammo-alt ammo-alt-tag">{{ t('app_badge_alt') }}</span>
                    <span v-if="buildPickerSlot && (buildPickerSlot.type === 'inventory' || buildPickerSlot.type === 'belt' || buildPickerSlot.type === 'weapon' || buildPickerSlot.type === 'sidearm')" class="build-picker-item-type" :class="'build-picker-type-' + getItemSlotType(item)">{{ getItemCategoryLabel(item) }}</span>
                    <span class="build-picker-item-weight">{{ formatValue('st_prop_weight', item['st_prop_weight']) }}</span>
                </div>
                <div v-if="buildPickerItems.length === 0" class="build-picker-empty">{{ t('app_label_no_results') }}</div>
            </div>
        </div>
    </div>
    </Transition>
</div>
</Transition>

<!-- Keyboard Shortcuts Help -->
<Transition name="fade">
<div class="modal-backdrop" v-if="shortcutHelpOpen" @click.self="shortcutHelpOpen = false" style="z-index: 220;">
    <Transition name="modal" appear>
    <div class="modal shortcut-modal" v-if="shortcutHelpOpen">
        <button class="modal-close" @click="shortcutHelpOpen = false">&times;</button>
        <div class="modal-body">
            <h2 class="shortcut-modal-title">{{ t('app_shortcuts_title') }}</h2>
            <div class="shortcut-columns">
                <div class="shortcut-group">
                    <h3>{{ t('app_shortcuts_group_global') }}</h3>
                    <dl class="shortcut-list">
                        <div class="shortcut-row"><dt><kbd>/</kbd> <kbd>Ctrl</kbd><kbd>K</kbd></dt><dd>{{ t('app_shortcuts_search') }}</dd></div>
                        <div class="shortcut-row"><dt><kbd>S</kbd></dt><dd>{{ t('app_shortcuts_toggle_sidebar') }}</dd></div>
                        <div class="shortcut-row"><dt><kbd>V</kbd></dt><dd>{{ t('app_shortcuts_toggle_view') }}</dd></div>
                        <div class="shortcut-row"><dt><kbd>Shift</kbd><kbd>F</kbd></dt><dd>{{ t('app_shortcuts_toggle_filters') }}</dd></div>
                        <div class="shortcut-row"><dt><kbd>C</kbd></dt><dd>{{ t('app_shortcuts_compare') }}</dd></div>
                        <div class="shortcut-row"><dt><kbd>X</kbd></dt><dd>{{ t('app_shortcuts_clear_filters') }}</dd></div>
                        <div class="shortcut-row"><dt><kbd>G</kbd> {{ t('app_shortcuts_then') }} <kbd>B</kbd></dt><dd>{{ t('app_shortcuts_build_planner') }}</dd></div>
                        <div class="shortcut-row"><dt><kbd>Shift</kbd><kbd>/</kbd></dt><dd>{{ t('app_shortcuts_show_help') }}</dd></div>
                    </dl>
                </div>
                <div class="shortcut-group">
                    <h3>{{ t('app_shortcuts_group_browsing') }}</h3>
                    <dl class="shortcut-list">
                        <div class="shortcut-row"><dt><kbd>[</kbd></dt><dd>{{ t('app_shortcuts_prev_category') }}</dd></div>
                        <div class="shortcut-row"><dt><kbd>]</kbd></dt><dd>{{ t('app_shortcuts_next_category') }}</dd></div>
                        <div class="shortcut-row"><dt><kbd>Esc</kbd></dt><dd>{{ t('app_shortcuts_close') }}</dd></div>
                    </dl>
                    <h3>{{ t('app_shortcuts_group_item_modal') }}</h3>
                    <dl class="shortcut-list">
                        <div class="shortcut-row"><dt><kbd>&larr;</kbd></dt><dd>{{ t('app_shortcuts_prev_item') }}</dd></div>
                        <div class="shortcut-row"><dt><kbd>&rarr;</kbd></dt><dd>{{ t('app_shortcuts_next_item') }}</dd></div>
                        <div class="shortcut-row"><dt><kbd>F</kbd></dt><dd>{{ t('app_shortcuts_favorite') }}</dd></div>
                        <div class="shortcut-row"><dt><kbd>P</kbd></dt><dd>{{ t('app_shortcuts_pin') }}</dd></div>
                    </dl>
                </div>
            </div>
        </div>
    </div>
    </Transition>
</div>
</Transition>

<FooterBar />

</div>
</template>

<script>
import { appDefinition } from "../js/app.js";
import FooterBar from "./components/FooterBar.vue";
import HeaderBar from "./components/HeaderBar.vue";
import SidebarNav from "./components/SidebarNav.vue";

export default {
  ...appDefinition,
  components: {
    ...appDefinition.components,
    FooterBar,
    HeaderBar,
    SidebarNav,
  },
  provide() {
    return {
      t: this.t,
      tName: this.tName,
      tCat: this.tCat,
    };
  },
};
</script>
