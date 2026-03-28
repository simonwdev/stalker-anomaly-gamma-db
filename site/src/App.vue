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
            <FilterBar
                ref="filterBar"
                :filter-input="filterInput"
                :filter-query="filterQuery"
                :available-filters="availableFilters"
                :range-filters="rangeFilters"
                :range-filters-left="rangeFiltersLeft"
                :range-filters-right="rangeFiltersRight"
                :active-filters="activeFilters"
                :active-filter-count="activeFilterCount"
                :active-filter-chips="activeFilterChips"
                :include-alt-ammo="includeAltAmmo"
                :sort-col="sortCol"
                :sort-asc="sortAsc"
                :sortable-fields="sortableFields"
                :view-mode="viewMode"
                :sorted-items="sortedItems"
                :favorite-ids="favoriteIds"
                :show-favorites-only="showFavoritesOnly"
                :copy-link-feedback="copyLinkFeedback"
                :favorites-view-active="favoritesViewActive"
                :recent-view-active="recentViewActive"
                :is-outfit-exchange="isOutfitExchange"
                :is-materials-category="isMaterialsCategory"
                :is-crafting-trees="isCraftingTrees"
                :is-toolkit-rates="isToolkitRates"
                :outfit-exchange="outfitExchange"
                :filtered-exchanges="filteredExchanges"
                :hide-no-drop="hideNoDrop"
                :hide-unused-ammo="hideUnusedAmmo"
                :toolkit-rates="toolkitRates"
                :toolkit-sort-col="toolkitSortCol"
                :toolkit-sort-asc="toolkitSortAsc"
                :build-planner-active="buildPlannerActive"
                :version-compare-active="versionCompareActive"
                @update:filter-input="filterInput = $event"
                @clear-filter-input="filterInput = ''; filterQuery = ''"
                @clear-all-filters="clearAllFilters()"
                @toggle-discrete-filter="(key, val) => toggleDiscreteFilter(key, val)"
                @toggle-flag-filter="(key, val) => toggleFlagFilter(key, val)"
                @set-range-min="(key, val) => setRangeMin(key, val)"
                @set-range-max="(key, val) => setRangeMax(key, val)"
                @step-range="(key, bound, delta) => stepRange(key, bound, delta)"
                @remove-filter="(chip) => removeFilter(chip)"
                @toggle-include-alt-ammo="includeAltAmmo = !includeAltAmmo; pushUrlState()"
                @pick-sort="(col) => { sortCol = col; pushUrlState() }"
                @toggle-sort-dir="sortAsc = !sortAsc; pushUrlState()"
                @toggle-toolkit-sort="(col) => toggleToolkitSort(col)"
                @toggle-toolkit-sort-dir="toolkitSortAsc = !toolkitSortAsc"
                @toggle-show-favorites-only="showFavoritesOnly = !showFavoritesOnly; pushUrlState()"
                @set-view-mode="(mode) => setViewMode(mode)"
                @copy-link="copyLink()"
                @download-data="(format) => downloadData(format)"
                @toggle-hide-no-drop="toggleHideNoDrop()"
                @toggle-hide-unused-ammo="toggleHideUnusedAmmo()"
            />
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
            <BuildPlanner
                v-if="buildPlannerActive"
                ref="buildPlanner"
                :build-player-name="buildPlayerName"
                :build-player-faction="buildPlayerFaction"
                :build-saved-builds="buildSavedBuilds"
                :build-save-modal-open="buildSaveModalOpen"
                :build-sharing="buildSharing"
                :copy-build-link-feedback="copyBuildLinkFeedback"
                :copy-build-code-feedback="copyBuildCodeFeedback"
                :build-import-code="buildImportCode"
                :build-import-error="buildImportError"
                :build-outfit="buildOutfit"
                :build-helmet="buildHelmet"
                :build-backpack="buildBackpack"
                :build-belts="buildBelts"
                :build-artifacts="buildArtifacts"
                :build-weapon-primary="buildWeaponPrimary"
                :build-weapon-secondary="buildWeaponSecondary"
                :build-weapon-sidearm="buildWeaponSidearm"
                :build-weapon-grenade="buildWeaponGrenade"
                :build-ammo-primary="buildAmmoPrimary"
                :build-ammo-secondary="buildAmmoSecondary"
                :build-ammo-sidearm="buildAmmoSidearm"
                :build-active-weapon-tab="buildActiveWeaponTab"
                :build-weapon-compare-slot="buildWeaponCompareSlot"
                :build-loadout-collapsed="buildLoadoutCollapsed"
                :build-loadout-summary="buildLoadoutSummary"
                :build-belt-slots="buildBeltSlots"
                :build-belt-slot-max="buildBeltSlotMax"
                :build-belt-slot-used="buildBeltSlotUsed"
                :build-combined-stats="buildCombinedStats"
                :build-all-items="buildAllItems"
                :build-expanded-stats="buildExpandedStats"
                :build-all-expanded="buildAllExpanded"
                :build-hide-gear-stats="buildHideGearStats"
                :build-hide-weapon-stats="buildHideWeaponStats"
                :build-radar-visible="buildRadarVisible"
                :build-weapon-stats="buildWeaponStats"
                :build-inventory="buildInventory"
                :build-inventory-sorted="buildInventorySorted"
                :build-inventory-sort="buildInventorySort"
                :build-inventory-sort-label="buildInventorySortLabel"
                :build-drag-state="buildDragState"
                :build-hover-item="buildHoverItem"
                :build-hover-compare-item="buildHoverCompareItem"
                :build-hover-pos="buildHoverPos"
                :favorite-ids="favoriteIds"
                :faction-list="factionList"
                :weapon-compare-slot-count="weaponCompareSlotCount"
                @update:build-player-name="(v) => buildPlayerName = v"
                @update:build-player-faction="(v) => buildPlayerFaction = v"
                @update:build-save-modal-open="(v) => buildSaveModalOpen = v"
                @update:build-import-code="(v) => buildImportCode = v"
                @update:build-active-weapon-tab="(v) => buildActiveWeaponTab = v"
                @update:build-loadout-collapsed="(v) => buildLoadoutCollapsed = v"
                @update:build-hide-gear-stats="(v) => buildHideGearStats = v"
                @update:build-hide-weapon-stats="(v) => buildHideWeaponStats = v"
                @update:build-radar-visible="(v) => buildRadarVisible = v"
                @open-save-import="openSaveImport()"
                @load-saved-build="(build) => loadSavedBuild(build)"
                @delete-saved-build="(idx) => deleteSavedBuild(idx)"
                @clear-build="clearBuild()"
                @copy-build-link="copyBuildLink()"
                @copy-build-code="copyBuildCode()"
                @import-build-from-code="importBuildFromCode()"
                @open-build-picker="(type, index) => openBuildPicker(type, index)"
                @remove-build-slot="(type, index) => removeBuildSlot(type, index)"
                @toggle-build-stat-expand="(field) => toggleBuildStatExpand(field)"
                @toggle-build-expand-all="toggleBuildExpandAll()"
                @open-inventory-picker="openInventoryPicker()"
                @add-favorites-to-inventory="addFavoritesToInventory()"
                @clear-inventory="buildInventory = []; saveInventoryToStorage()"
                @cycle-inventory-sort="cycleInventorySort()"
                @set-weapon-compare-slot="(slot) => setWeaponCompareSlot(slot)"
                @equip-from-inventory="(idx) => equipFromInventory(idx)"
                @remove-from-inventory="(idx) => removeFromInventory(idx)"
                @show-build-hover="(item, event) => showBuildHover(item, event)"
                @move-build-hover="(event) => moveBuildHover(event)"
                @hide-build-hover="hideBuildHover()"
                @on-slot-drag-start="(event, type, index) => onSlotDragStart(event, type, index)"
                @on-slot-drag-over="(event, type, index) => onSlotDragOver(event, type, index)"
                @on-slot-drag-leave="onSlotDragLeave()"
                @on-slot-drop="(event, type, index) => onSlotDrop(event, type, index)"
                @on-drag-end="onDragEnd()"
                @on-belt-area-drag-over="(event) => onBeltAreaDragOver(event)"
                @on-belt-area-drop="(event) => onBeltAreaDrop(event)"
                @on-inventory-drag-start="(event, idx) => onInventoryDragStart(event, idx)"
                @on-inventory-drag-over="(event) => onInventoryDragOver(event)"
                @on-inventory-drop="(event) => onInventoryDrop(event)"
            />

            <ItemTable
                v-show="viewMode === 'table' && !favoritesViewActive && !recentViewActive && !isOutfitExchange && !isMaterialsCategory && !isCraftingTrees && !isToolkitRates && !buildPlannerActive && !versionCompareActive"
                :items="sortedItems"
                :table-columns="tableColumns"
                :sort-col="sortCol"
                :sort-asc="sortAsc"
                :favorite-ids="favoriteIds"
                :pinned-ids="pinnedIds"
                :active-name-tags="activeNameTags"
                @navigate-to-item="navigateToItem"
                @toggle-favorite="toggleFavorite"
                @toggle-pin="togglePin"
                @toggle-sort="toggleSort"
            />
            <ItemGrid
                v-show="(viewMode === 'tiles' || favoritesViewActive || recentViewActive) && !isOutfitExchange && !isMaterialsCategory && !isCraftingTrees && !isToolkitRates && !buildPlannerActive && !versionCompareActive"
                :items="sortedItems"
                :tile-fields="tileFields"
                :tile-heal-groups="tileHealGroups"
                :favorite-ids="favoriteIds"
                :pinned-ids="pinnedIds"
                :compact="favoritesViewActive || recentViewActive"
                @navigate-to-item="navigateToItem"
                @toggle-favorite="toggleFavorite"
                @toggle-pin="togglePin"
            />
        </div>
    </main>
</div>

<!-- Compare bar + modal -->
<ComparePanel
    ref="comparePanel"
    :pinned-ids="pinnedIds"
    :pinned-items="pinnedItems"
    :compare-open="compareOpen"
    :compare-data="compareData"
    :compare-stat-rows="compareStatRows"
    :compare-view-mode="compareViewMode"
    @toggle-pin="togglePin"
    @open-compare="openCompare()"
    @clear-pins="clearPins()"
    @close-compare="closeCompare()"
    @update:compare-view-mode="(v) => compareViewMode = v"
/>

<!-- Item detail modal -->
<ItemDetailModal
    :modal-open="modalOpen"
    :modal-item="modalItem"
    :modal-category="modalCategory"
    :modal-loading="modalLoading"
    :modal-stat-rows="modalStatRows"
    :modal-heal-groups="modalHealGroups"
    :modal-drop-factions="modalDropFactions"
    :modal-item-drop-locations="modalItemDropLocations"
    :modal-item-drop-types="modalItemDropTypes"
    :modal-item-drop-has-restricted-ecos="modalItemDropHasRestrictedEcos"
    :modal-ammo-variants="modalAmmoVariants"
    :modal-ammo-stat-keys="modalAmmoStatKeys"
    :modal-recipe="modalRecipe"
    :modal-used-in-recipes="modalUsedInRecipes"
    :modal-disassemble-materials="modalDisassembleMaterials"
    :modal-used-by-weapons="modalUsedByWeapons"
    :parsed-description="parsedDescription"
    :favorite-ids="favoriteIds"
    :pinned-ids="pinnedIds"
    :packs="packs"
    :cross-pack-id="crossPackId"
    :cross-pack-item="crossPackItem"
    :cross-pack-not-found="crossPackNotFound"
    :cross-pack-name="crossPackName"
    :cross-pack-options="crossPackOptions"
    :cross-pack-diffs="crossPackDiffs"
    :copy-id-feedback="copyIdFeedback"
    :copy-modal-link-feedback="copyModalLinkFeedback"
    @close-modal="closeModal()"
    @navigate-modal="navigateModal"
    @navigate-to-item="navigateToItem"
    @toggle-favorite="toggleFavorite"
    @toggle-pin="togglePin"
    @copy-item-id="copyItemId"
    @copy-modal-link="copyModalLink()"
    @pick-compare-pack="pickComparePack"
/>

<BuildSaveModal
    :open="buildSaveModalOpen"
    :build-save-name="buildSaveName"
    @close="buildSaveModalOpen = false"
    @update:build-save-name="(v) => buildSaveName = v"
    @save="saveCurrentBuild()"
/>

<SaveImportModal
    :open="saveImportModalOpen"
    :save-import-parsing="saveImportParsing"
    :save-import-error="saveImportError"
    :save-import-preview="saveImportPreview"
    :save-import-file-name="saveImportFileName"
    :save-import-include-stash="saveImportIncludeStash"
    :save-import-include-ammo="saveImportIncludeAmmo"
    @close="closeSaveImport()"
    @update:save-import-include-stash="(v) => saveImportIncludeStash = v"
    @update:save-import-include-ammo="(v) => saveImportIncludeAmmo = v"
    @handle-drop="handleSaveImportDrop($event)"
    @handle-file="handleSaveImportFile($event)"
    @retry-import="saveImportError = ''; saveImportPreview = null"
    @confirm-import="confirmSaveImport()"
    @save-import-hover="saveImportHover"
    @move-build-hover="moveBuildHover($event)"
    @hide-build-hover="hideBuildHover()"
/>

<BuildPickerModal
    :open="buildPickerOpen"
    :build-picker-slot="buildPickerSlot"
    :build-picker-slot-label="buildPickerSlotLabel"
    :build-picker-query="buildPickerQuery"
    :build-picker-items="buildPickerItems"
    :build-picker-ammo-weapon="buildPickerAmmoWeapon"
    @close="closeBuildPicker()"
    @update:build-picker-query="(v) => buildPickerQuery = v"
    @select-item="selectBuildItem($event)"
    @show-build-hover="showBuildHover"
    @move-build-hover="moveBuildHover($event)"
    @hide-build-hover="hideBuildHover()"
/>

<ShortcutHelpModal
    :open="shortcutHelpOpen"
    @close="shortcutHelpOpen = false"
/>

<FooterBar />

</div>
</template>

<script>
import { appDefinition } from "../js/app.js";
import FilterBar from "./components/FilterBar.vue";
import FooterBar from "./components/FooterBar.vue";
import HeaderBar from "./components/HeaderBar.vue";
import SidebarNav from "./components/SidebarNav.vue";
import ItemTable from "./components/ItemTable.vue";
import ItemGrid from "./components/ItemGrid.vue";
import ItemDetailModal from "./components/ItemDetailModal.vue";
import BuildPlanner from "./components/BuildPlanner.vue";
import ComparePanel from "./components/ComparePanel.vue";
import BuildSaveModal from "./components/modals/BuildSaveModal.vue";
import SaveImportModal from "./components/modals/SaveImportModal.vue";
import BuildPickerModal from "./components/modals/BuildPickerModal.vue";
import ShortcutHelpModal from "./components/modals/ShortcutHelpModal.vue";

export default {
  ...appDefinition,
  components: {
    ...appDefinition.components,
    BuildPlanner,
    BuildPickerModal,
    BuildSaveModal,
    ComparePanel,
    FilterBar,
    FooterBar,
    HeaderBar,
    ItemGrid,
    ItemTable,
    ItemDetailModal,
    SaveImportModal,
    ShortcutHelpModal,
    SidebarNav,
  },
  provide() {
    return {
      t: this.t,
      tName: this.tName,
      tCat: this.tCat,
      headerLabel: this.headerLabel,
      filterChipStyle: this.filterChipStyle,
      filterValueLabel: this.filterValueLabel,
      isDiscreteActive: this.isDiscreteActive,
      tItemName: this.tItemName,
      cellValue: this.cellValue,
      formatValue: this.formatValue,
      statClass: this.statClass,
      statStyle: this.statStyle,
      displayLabel: this.displayLabel,
      displayStyle: this.displayStyle,
      singularType: this.singularType,
      healDots: this.healDots,
      caliberName: this.caliberName,
      ammoTooltipPayload: this.ammoTooltipPayload,
      factionColor: this.factionColor,
      factionIcon: this.factionIcon,
      isUnusedAmmo: this.isUnusedAmmo,
      openAmmoFromCaliber: this.openAmmoFromCaliber,
      singularCategory: this.singularCategory,
      caliberVariantObjects: this.caliberVariantObjects,
      shortAmmoName: this.shortAmmoName,
      formatAmmoStat: this.formatAmmoStat,
      ammoArrow: this.ammoArrow,
      isAmmoBest: this.isAmmoBest,
      findItemByName: this.findItemByName,
      modalStatClass: this.modalStatClass,
      modalStatStyle: this.modalStatStyle,
      compareValueClass: this.compareValueClass,
      compareValueIcon: this.compareValueIcon,
      tCatSingular: this.tCatSingular,
      tUnit: this.tUnit,
      buildSlotColor: this.buildSlotColor,
      buildStatFormatted: this.buildStatFormatted,
      parseDescription: this.parseDescription,
      getItemFields: this.getItemFields,
      getItemCategoryLabel: this.getItemCategoryLabel,
      buildHoverDiff: this.buildHoverDiff,
      buildHoverCompareFields: this.buildHoverCompareFields,
      isWeaponMelee: this.isWeaponMelee,
      isAltAmmo: this.isAltAmmo,
      getItemSlotType: this.getItemSlotType,
      saveImportItemName: this.saveImportItemName,
    };
  },
};
</script>
