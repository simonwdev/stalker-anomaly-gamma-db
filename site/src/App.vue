<template>
<div id="app" @keydown.window.escape="handleEscape()">
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
    ref="headerBar"
    :translations="translations"
    :active-pack="activePack"
    :packs="packs"
    :locale="locale"
    :LOCALES="LOCALES"
    :global-query="globalQuery"
    :global-results="globalResults"
    :global-crafting-results="globalCraftingResults"
    :has-unseen-release-notes="hasUnseenReleaseNotes"
    :sidebar-collapsed="sidebarCollapsed"
    :sidebar-open="sidebarOpen"
    :build-planner-active="buildPlannerActive"
    :crafting-active="isCrafting"
    :damage-sim-active="damageSimActive"
    :maps-active="mapsActive"
    :trading-active="tradingActive"
    :item-db-active="!buildPlannerActive && !mapsActive && !damageSimActive && !isCrafting && !tradingActive"
    :hide-no-drop="hideNoDrop"
    :hide-unused-ammo="hideUnusedAmmo"
    :show-tile-icons="showTileIcons"
    @toggle-sidebar-collapse="toggleSidebarCollapse()"
    @toggle-sidebar="toggleSidebar()"
    @open-item-db="openItemDb()"
    @open-maps="openMaps()"
    @open-trading="openTrading()"
    @open-build-planner="openBuildPlanner()"
    @open-crafting="openCrafting()"
    @open-damage-sim="openDamageSim()"
    @toggle-hide-no-drop="toggleHideNoDrop()"
    @toggle-hide-unused-ammo="toggleHideUnusedAmmo()"
    @toggle-show-tile-icons="toggleShowTileIcons()"
    @switch-pack="(p) => { activePack = p; switchPack() }"
    @change-locale="(id) => { locale = id; onLocaleChange() }"
    @open-shortcut-help="shortcutHelpOpen = true"
    @clear-global-query="clearGlobalQuery()"
    @update:global-query="(v) => globalQuery = v"
    @search="debouncedGlobalSearch()"
    @escape-search="() => { if (globalQuery.trim()) lastGlobalQuery = globalQuery; globalQuery = '' }"
    @select-search-result="(id) => { lastGlobalQuery = globalQuery; globalQuery = ''; navigateToItem(id) }"
    @select-crafting-search-result="(result) => selectCraftingSearchResult(result)"
/>

<div class="layout" :class="{ 'sidebar-collapsed': sidebarCollapsed, 'sidebar-hidden': buildPlannerActive || mapsActive || damageSimActive || tradingActive }">
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
        :crafting-active="isCrafting"
        :crafting-category="craftingCategory"
        :crafting-recipe-categories="craftingRecipeCategories"
        :crafting-disassembly-categories="craftingDisassemblyCategories"
        :version-compare-active="versionCompareActive"
        :starting-loadouts-active="startingLoadoutsActive"
        :has-starting-loadouts="!!fileManifest['starting-loadouts.json']"
        :has-toolkit-rates="!!fileManifest['toolkit-rates.json']"
        :toolkit-rates-category="'Toolkit Rates'"
        :favorites-view-active="favoritesViewActive"
        :recent-view-active="recentViewActive"
        @toggle-group="toggleGroup"
        @open-version-compare="openVersionCompare()"
        @open-starting-loadouts="openStartingLoadouts()"
        @select-favorites="selectFavorites()"
        @select-recent="selectRecent()"
        @select-category="selectCategory"
        @select-crafting-category="selectCraftingCategory"
        @toggle-sidebar-collapse="toggleSidebarCollapse()"
    />
    <div class="sidebar-backdrop" v-show="sidebarOpen" @click="closeSidebar()"></div>

    <main class="content" :class="{ 'content-maps': mapsActive }">
        <MapsView v-if="mapsActive" :pack-id="activePack?.id" />
        <TradingView
            v-if="tradingActive"
            :pack-id="activePack?.id"
            :index-by-id="indexById"
            @navigate-to-item="navigateToItem"
            @show-item-hover="(id, event) => loadoutItemHover(id, event)"
            @move-item-hover="(event) => moveItemHover(event)"
            @hide-item-hover="hideItemHover()"
        />
        <DamageSimulator
            v-if="damageSimActive"
            :weapon-categories="categoryItems"
            :ammo-items="categoryItems['ammo'] || []"
            :mutant-profiles="mutantProfilesCache || []"
            :npc-armor-profiles="npcArmorProfilesCache || []"
            :gbo-constants="gboConstantsCache || {}"
            :calibers-data="calibersCache || {}"
            :ballistic-ranges="ballisticRangesCache || {}"
            :hide-no-drop="hideNoDrop"
            :hide-unused-ammo="hideUnusedAmmo"
            :ammo-weapons-cache="ammoWeaponsCache || {}"
            @show-build-hover="(item, event) => showBuildHover(item, event)"
            @move-build-hover="(event) => moveBuildHover(event)"
            @hide-build-hover="hideBuildHover()"
        />
        <div v-show="showContentSpinner && !mapsActive && !tradingActive" class="loading-screen">
            <div class="loading-spinner"></div>
            <p class="loading-text">{{ t('app_label_loading') }}</p>
        </div>
        <div v-show="!loading && !mapsActive && !damageSimActive && !tradingActive" class="content-inner">
            <FilterBar
                ref="filterBar"
                :filter-input="filterInput"
                :filter-query="filterQuery"
                :available-filters="isCrafting ? craftingAvailableFilters : availableFilters"
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
                :is-crafting="isCrafting"
                :crafting-item-count="craftingFilteredCount"
                :is-toolkit-rates="isToolkitRates"
                :outfit-exchange="outfitExchange"
                :filtered-exchanges="filteredExchanges"
                :hide-no-drop="hideNoDrop"
                :hide-unused-ammo="hideUnusedAmmo"
                :show-tile-icons="showTileIcons"
                :toolkit-rates="toolkitRates"
                :toolkit-sort-col="toolkitSortCol"
                :toolkit-sort-asc="toolkitSortAsc"
                :build-planner-active="buildPlannerActive"
                :version-compare-active="versionCompareActive"
                :starting-loadouts-active="startingLoadoutsActive"
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
                @toggle-show-tile-icons="toggleShowTileIcons()"
            />
            <div v-if="favoritesViewActive && favoriteIds.length === 0" class="favorites-empty">
                <p>{{ t('app_label_no_favorites_1') }} <span class="fav-icon-inline">&#9734;</span> {{ t('app_label_no_favorites_2') }}</p>
            </div>
            <div v-if="recentViewActive && recentIds.length === 0" class="favorites-empty">
                <p>{{ t('app_label_no_recent') }}</p>
            </div>
            <OutfitExchangeView
                :is-outfit-exchange="isOutfitExchange"
                :outfit-exchange="outfitExchange"
                :exchange-faction-filter="exchangeFactionFilter"
                :exchange-factions="exchangeFactions"
                :exchange-visible-factions="exchangeVisibleFactions"
                :filtered-exchanges="filteredExchanges"
                @update:exchange-faction-filter="exchangeFactionFilter = $event"
                @navigate-to-item="navigateToItem"
            />

            <ToolkitRatesView
                :is-toolkit-rates="isToolkitRates"
                :toolkit-rates="toolkitRates"
                :toolkit-rates-sorted="toolkitRatesSorted"
                :toolkit-sort-col="toolkitSortCol"
                :toolkit-sort-asc="toolkitSortAsc"
                @toggle-toolkit-sort="toggleToolkitSort"
            />

            <CraftingView
                :is-crafting="isCrafting"
                :crafting-category="craftingCategory"
                :filter-query="filterQuery"
                :materials-items="materialsItems"
                :all-crafting-trees="craftingTrees"
                :filtered-crafting-trees="filteredCraftingTrees"
                :crafting-tree-expand-all="craftingTreeExpandAll"
                :crafting-tree-expanded="craftingTreeExpanded"
                @toggle-tree-node="toggleTreeNode"
                @navigate-to-item="navigateToItem"
            />

            <VersionCompareView
                :version-compare-active="versionCompareActive"
                :active-pack="activePack"
                :packs="packs"
                :cross-pack-id="crossPackId"
                :cross-pack-name="crossPackName"
                :cross-pack-options="crossPackOptions"
                :version-compare-results="versionCompareResults"
                :filtered-version-compare-results="filteredVersionCompareResults"
                :version-compare-total="versionCompareTotal"
                :version-compare-loading="versionCompareLoading"
                :version-compare-filter="versionCompareFilter"
                :property-keys="versionComparePropertyKeys"
                :property-filter="versionComparePropertyFilter"
                :category-keys="versionCompareCategoryKeys"
                :category-filter="versionCompareCategoryFilter"
                :copy-link-feedback="copyLinkFeedback"
                @update:version-compare-filter="versionCompareFilter = $event"
                @update:property-filter="versionComparePropertyFilter = $event"
                @update:category-filter="versionCompareCategoryFilter = $event"
                @pick-compare-pack="pickComparePack"
                @copy-link="copyLink()"
                @export-version-compare="exportVersionCompare()"
                @navigate-to-item="navigateToItem"
            />

            <StartingLoadoutsView
                :starting-loadouts-active="startingLoadoutsActive"
                :starting-loadouts-data="startingLoadoutsCache"
                :pack-id="activePack?.id"
                :starting-loadouts-faction="startingLoadoutsFaction"
                :starting-loadouts-difficulty="startingLoadoutsDifficulty"
                :index-by-id="indexById"
                @update:starting-loadouts-faction="startingLoadoutsFaction = $event"
                @update:starting-loadouts-difficulty="startingLoadoutsDifficulty = $event"
                @navigate-to-item="navigateToItem"
                @show-item-hover="loadoutItemHover"
                @move-item-hover="(event) => moveBuildHover(event)"
                @hide-item-hover="hideBuildHover()"
            />

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
                :favorite-ids="favoriteIds"
                :faction-list="factionList"
                :weapon-compare-slot-count="weaponCompareSlotCount"
                @update:build-player-name="(v) => buildPlayerName = v"
                @update:build-player-faction="(v) => buildPlayerFaction = v"
                @update:build-save-modal-open="(v) => buildSaveModalOpen = v"
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
                @open-import-code="buildImportCodeModalOpen = true"
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
                v-show="viewMode === 'table' && !favoritesViewActive && !recentViewActive && !isOutfitExchange && !isCrafting && !isToolkitRates && !buildPlannerActive && !versionCompareActive && !startingLoadoutsActive"
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
                v-show="(viewMode === 'tiles' || favoritesViewActive || recentViewActive) && !isOutfitExchange && !isCrafting && !isToolkitRates && !buildPlannerActive && !versionCompareActive && !startingLoadoutsActive"
                :items="sortedItems"
                :tile-fields="tileFields"
                :tile-heal-groups="tileHealGroups"
                :favorite-ids="favoriteIds"
                :pinned-ids="pinnedIds"
                :compact="favoritesViewActive || recentViewActive"
                :show-item-icon="showTileIcons"
                :icon-size="tileIconSize"
                @navigate-to-item="navigateToItem"
                @toggle-favorite="toggleFavorite"
                @toggle-pin="togglePin"
            />
        </div>
    </main>
</div>

<!-- Global item hover popover (single instance for all non-comparison hovers) -->
<ItemHoverPopover
    class="item-hover-popover-global"
    :item="!hoverCompareItem ? hoverItem : null"
    :pos="hoverPos"
/>

<!-- Item comparison popover (build planner equipped vs inventory) -->
<ItemComparePopover
    :item="hoverItem"
    :compare-item="hoverCompareItem"
    :pos="hoverPos"
/>

<!-- Compatible weapons click popover (addon categories) -->
<Transition name="fade">
<div v-if="weaponListPopoverItem" class="weapon-list-popover" :style="{ position: 'fixed', top: (weaponListPopoverPos ? weaponListPopoverPos.top + 'px' : '-9999px'), left: (weaponListPopoverPos ? weaponListPopoverPos.left + 'px' : '-9999px'), zIndex: 250 }" @mouseenter="keepWeaponListPopover()" @mouseleave="hideWeaponListPopover()">
    <div class="weapon-list-popover-title">{{ t('app_label_compatible_weapons') }} <span class="weapon-list-popover-count">({{ weaponListPopoverWeapons.length }})</span></div>
    <div class="weapon-list-popover-items">
        <a v-for="w in weaponListPopoverWeapons" :key="w.id" href="#" class="weapon-list-popover-item" @click.prevent="navigateToItem(w.id); closeWeaponListPopover();">
            <span class="weapon-list-popover-name">{{ tName(w) }}</span>
            <span class="badge-flag badge-type">{{ t(singularCategory(w.category)) || tCat(w.category) }}</span>
        </a>
    </div>
</div>
</Transition>

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
    :modal-stash-chance-entries="modalStashChanceEntries"
    :modal-stash-chance-has-restricted-ecos="modalStashChanceHasRestrictedEcos"
    :modal-ammo-variants="modalAmmoVariants"
    :modal-ammo-stat-keys="modalAmmoStatKeys"
    :modal-recipe="modalRecipe"
    :modal-used-in-recipes="modalUsedInRecipes"
    :modal-disassemble-materials="modalDisassembleMaterials"
    :modal-upgrade-nodes="modalUpgradeNodes"
    :modal-used-by-weapons="modalUsedByWeapons"
    :parsed-description="parsedDescription"
    :parsed-perk="parsedPerk"
    :pba-constants="pbaConstantsCache || {}"
    :modal-weapon-addons="modalWeaponAddons"
    :modal-addon-compatible-weapons="modalAddonCompatibleWeapons"
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

<BuildImportCodeModal
    :open="buildImportCodeModalOpen"
    :build-import-code="buildImportCode"
    :build-import-error="buildImportError"
    @close="buildImportCodeModalOpen = false"
    @update:build-import-code="(v) => buildImportCode = v"
    @import="importBuildFromCode()"
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

<QuickNavModal
    :open="quickNavOpen"
    :groupedCategories="groupedCategories"
    :categoryCounts="categoryCounts"
    :favoriteIds="favoriteIds"
    :recentIds="recentIds"
    :hasStartingLoadouts="!!fileManifest['starting-loadouts.json']"
    :hasToolkitRates="!!fileManifest['toolkit-rates.json']"
    :craftingRecipeCategories="craftingRecipeCategories"
    :craftingDisassemblyCategories="craftingDisassemblyCategories"
    @close="quickNavOpen = false"
    @select-category="selectCategory"
    @select-crafting-category="selectCraftingCategory"
    @select-favorites="selectFavorites()"
    @select-recent="selectRecent()"
    @open-build-planner="openBuildPlanner()"
    @open-maps="openMaps()"
    @open-ballistics="openDamageSim()"
    @open-trading="openTrading()"
    @open-version-compare="openVersionCompare()"
    @open-starting-loadouts="openStartingLoadouts()"
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
import { defineAsyncComponent } from 'vue';
const BuildPlanner = defineAsyncComponent(() => import('./components/BuildPlanner.vue'));
const DamageSimulator = defineAsyncComponent(() => import('./components/DamageSimulator.vue'));
import ItemHoverPopover from "./components/ItemHoverPopover.vue";
import ItemComparePopover from "./components/ItemComparePopover.vue";
const MapsView = defineAsyncComponent(() => import('./components/MapsView.vue'));
const TradingView = defineAsyncComponent(() => import('./components/TradingView.vue'));
import ComparePanel from "./components/ComparePanel.vue";
import CraftingView from "./components/CraftingView.vue";
import OutfitExchangeView from "./components/OutfitExchangeView.vue";
import ToolkitRatesView from "./components/ToolkitRatesView.vue";
import VersionCompareView from "./components/VersionCompareView.vue";
const StartingLoadoutsView = defineAsyncComponent(() => import('./components/StartingLoadoutsView.vue'));
import BuildImportCodeModal from "./components/modals/BuildImportCodeModal.vue";
import BuildSaveModal from "./components/modals/BuildSaveModal.vue";
import SaveImportModal from "./components/modals/SaveImportModal.vue";
import BuildPickerModal from "./components/modals/BuildPickerModal.vue";
import QuickNavModal from "./components/modals/QuickNavModal.vue";
import ShortcutHelpModal from "./components/modals/ShortcutHelpModal.vue";

export default {
  ...appDefinition,
  components: {
    ...appDefinition.components,
    BuildPlanner,
    DamageSimulator,
    ItemHoverPopover,
    ItemComparePopover,
    BuildImportCodeModal,
    BuildPickerModal,
    BuildSaveModal,
    ComparePanel,
    CraftingView,
    FilterBar,
    FooterBar,
    HeaderBar,
    ItemGrid,
    ItemTable,
    ItemDetailModal,
    MapsView,
    TradingView,
    OutfitExchangeView,
    QuickNavModal,
    SaveImportModal,
    ShortcutHelpModal,
    SidebarNav,
    ToolkitRatesView,
    VersionCompareView,
    StartingLoadoutsView,
  },
  provide() {
    return {
      t: this.t,
      tName: this.tName,
      isFieldHidden: (key) => this.globalHiddenFields.includes(key) || (this.activePack?.hiddenFields || []).includes(key),
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
      exchangeItemId: this.exchangeItemId,
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
      findFullItemByName: this.findFullItemByName,
      modalStatClass: this.modalStatClass,
      modalStatStyle: this.modalStatStyle,
      compareValueClass: this.compareValueClass,
      compareValueIcon: this.compareValueIcon,
      tCatSingular: this.tCatSingular,
      tUnit: this.tUnit,
      buildSlotColor: this.buildSlotColor,
      buildStatFormatted: this.buildStatFormatted,
      parseDescription: this.parseDescription,
      parsePerk: this.parsePerk,
      getItemFields: this.getItemFields,
      getItemCategoryLabel: this.getItemCategoryLabel,
      buildHoverDiff: this.buildHoverDiff,
      buildHoverCompareFields: this.buildHoverCompareFields,
      isWeaponMelee: this.isWeaponMelee,
      isAltAmmo: this.isAltAmmo,
      getItemSlotType: this.getItemSlotType,
      saveImportItemName: this.saveImportItemName,
      addonCompatibleWeaponsTooltip: this.addonCompatibleWeaponsTooltip,
      showWeaponListPopover: this.showWeaponListPopover,
      hideWeaponListPopover: this.hideWeaponListPopover,
      keepWeaponListPopover: this.keepWeaponListPopover,
      navHref: this.navHref,
      itemHref: this.itemHref,
      categoryHref: this.categoryHref,
      craftingHref: this.craftingHref,
      showItemHover: this.showItemHover,
      moveItemHover: this.moveItemHover,
      showItemHoverFromCaliber: this.showItemHoverFromCaliber,
      hideItemHover: this.hideItemHover,
    };
  },
};
</script>
