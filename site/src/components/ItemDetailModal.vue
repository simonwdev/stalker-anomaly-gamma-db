<template>
<Transition name="fade">
<div class="modal-backdrop" v-if="modalOpen" @click.self="$emit('closeModal')">
    <button class="modal-nav modal-nav-prev" @click="$emit('navigateModal', -1)" v-tooltip="'&#8592;'"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg></button>
    <button class="modal-nav modal-nav-next" @click="$emit('navigateModal', 1)" v-tooltip="'&#8594;'"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg></button>
    <button class="modal-close" @click="$emit('closeModal')">&times;</button>
    <Transition name="modal" appear>
    <div class="modal" v-if="modalOpen">
        <div class="modal-body" ref="modalBody" @scroll.passive="$emit('modalScroll')">
            <p v-show="modalLoading" class="loading">{{ t('app_label_loading') }}</p>

            <div v-if="modalItem && !modalLoading">
                <!-- Sticky title bar -->
                <div class="modal-sticky-bar modal-sticky-bar--visible">
                    <span class="modal-sticky-title">
                        <span class="modal-sticky-name-text">{{ tName(modalItem) }}</span>
                        <span class="modal-sticky-cat">{{ t(singularCategory(modalCategory)) || tCat(modalCategory) }}</span>
                        <span class="modal-sticky-id">{{ modalItem.id }}</span>
                    </span>
                    <div class="modal-sticky-actions">
                        <div class="item-toolbar item-toolbar--full">
                            <div v-if="packs.length > 1" class="compare-wrap" v-click-outside="closeCompareMenu">
                                <button class="copy-link-btn cross-pack-btn" :class="{ active: crossPackId }" @click.stop="compareMenuOpen = !compareMenuOpen" v-tooltip="t('app_label_compare_with')">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 3h5v5"/><path d="M8 3H3v5"/><path d="M12 22v-8.3a4 4 0 0 0-1.172-2.872L3 3"/><path d="m15 9 6-6"/></svg>
                                </button>
                                <div class="compare-menu" v-show="compareMenuOpen" @click.stop>
                                    <button v-for="p in crossPackOptions" :key="p.id" class="sort-menu-item" :class="{ active: crossPackId === p.id }" @click="$emit('pickComparePack', p.id)">
                                        <span class="sort-menu-check">{{ crossPackId === p.id ? '\u2713' : '' }}</span>
                                        <span>{{ p.name }}</span>
                                    </button>
                                    <template v-if="crossPackId">
                                        <div class="sort-menu-divider"></div>
                                        <button class="sort-menu-item" @click="$emit('pickComparePack', null)">
                                            <span class="sort-menu-check"></span>
                                            <span>{{ t('app_label_clear') }}</span>
                                        </button>
                                    </template>
                                </div>
                            </div>
                            <div class="utility-group">
                                <button class="copy-link-btn" :class="{ favorited: isFavorited(modalItem.id) }" @click="$emit('toggleFavorite', modalItem.id)" v-tooltip="isFavorited(modalItem.id) ? t('app_tooltip_remove_fav') : t('app_tooltip_add_fav')">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" :fill="isFavorited(modalItem.id) ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                                </button>
                                <button class="copy-link-btn" :class="{ pinned: isPinned(modalItem.id), 'pin-disabled': !isPinned(modalItem.id) && pinnedIds.length >= 5 }" @click="$emit('togglePin', modalItem.id)" v-tooltip="isPinned(modalItem.id) ? t('app_tooltip_unpin') : t('app_tooltip_pin')">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" :fill="isPinned(modalItem.id) ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 17v5"/><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z"/></svg>
                                </button>
                            </div>
                            <div class="utility-group">
                                <button class="copy-link-btn" :class="{ copied: copyIdFeedback }" @click="$emit('copyItemId', modalItem.id)" v-tooltip="copyIdFeedback ? t('app_label_copied') : t('app_tooltip_copy_id')">
                                    <svg v-if="copyIdFeedback" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                                    <svg v-else xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                                </button>
                                <button class="copy-link-btn" :class="{ copied: copyModalLinkFeedback }" @click="$emit('copyModalLink')" v-tooltip="copyModalLinkFeedback ? t('app_label_copied') : t('app_label_copy_link')">
                                    <svg v-if="copyModalLinkFeedback" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                                    <svg v-else xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                                </button>
                            </div>
                        </div>
                        <!-- Mobile: collapse the toolbar into one overflow menu, with the
                             close button as the right-most action (replaces the corner ×). -->
                        <div class="item-toolbar item-toolbar--compact">
                            <div class="compare-wrap" v-click-outside="closeOverflowMenu">
                                <button class="copy-link-btn" :class="{ active: overflowMenuOpen }" @click.stop="overflowMenuOpen = !overflowMenuOpen" aria-label="More actions">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="12" cy="19" r="1.6"/></svg>
                                </button>
                                <div class="compare-menu" v-show="overflowMenuOpen" @click.stop>
                                    <button class="sort-menu-item" :class="{ active: isFavorited(modalItem.id) }" @click="$emit('toggleFavorite', modalItem.id)">
                                        <span class="sort-menu-check">{{ isFavorited(modalItem.id) ? '★' : '' }}</span>
                                        <span>{{ isFavorited(modalItem.id) ? t('app_tooltip_remove_fav') : t('app_tooltip_add_fav') }}</span>
                                    </button>
                                    <button class="sort-menu-item" :class="{ active: isPinned(modalItem.id) }" :disabled="!isPinned(modalItem.id) && pinnedIds.length >= 5" @click="$emit('togglePin', modalItem.id)">
                                        <span class="sort-menu-check">{{ isPinned(modalItem.id) ? '✓' : '' }}</span>
                                        <span>{{ isPinned(modalItem.id) ? t('app_tooltip_unpin') : t('app_tooltip_pin') }}</span>
                                    </button>
                                    <button class="sort-menu-item" :class="{ active: copyIdFeedback }" @click="$emit('copyItemId', modalItem.id)">
                                        <span class="sort-menu-check">{{ copyIdFeedback ? '✓' : '' }}</span>
                                        <span>{{ copyIdFeedback ? t('app_label_copied') : t('app_tooltip_copy_id') }}</span>
                                    </button>
                                    <button class="sort-menu-item" :class="{ active: copyModalLinkFeedback }" @click="$emit('copyModalLink')">
                                        <span class="sort-menu-check">{{ copyModalLinkFeedback ? '✓' : '' }}</span>
                                        <span>{{ copyModalLinkFeedback ? t('app_label_copied') : t('app_label_copy_link') }}</span>
                                    </button>
                                    <template v-if="packs.length > 1">
                                        <div class="sort-menu-divider"></div>
                                        <button v-for="p in crossPackOptions" :key="'ov-' + p.id" class="sort-menu-item" :class="{ active: crossPackId === p.id }" @click="$emit('pickComparePack', p.id)">
                                            <span class="sort-menu-check">{{ crossPackId === p.id ? '✓' : '' }}</span>
                                            <span>{{ t('app_label_compare_with') }}: {{ p.name }}</span>
                                        </button>
                                        <button v-if="crossPackId" class="sort-menu-item" @click="$emit('pickComparePack', null)">
                                            <span class="sort-menu-check"></span>
                                            <span>{{ t('app_label_clear') }}</span>
                                        </button>
                                    </template>
                                </div>
                            </div>
                            <button class="copy-link-btn modal-close-inline" @click="$emit('closeModal')" aria-label="Close">&times;</button>
                        </div>
                    </div>
                </div>


                <div class="modal-badges" v-if="modalItem['st_data_export_has_perk'] === 'Y' || modalItem['st_data_export_is_junk'] === 'Y' || modalItem['st_data_export_can_be_crafted'] === 'Y' || modalItem['ui_mcm_menu_exo'] === 'Y' || modalItem['st_data_export_can_be_cooked'] === 'Y' || modalItem['st_data_export_used_in_cooking'] === 'Y' || modalItem['st_data_export_used_in_crafting'] === 'Y' || modalItem['st_data_export_cuts_thick_skin'] === 'Y' || modalItem.unobtainable === true || modalItem.tacticalKit === true || modalItem.integralOnly === true || modalItem.nimble === true || isUnusedAmmo(modalItem, modalCategory) || (Array.isArray(modalItem.factions) && modalItem.factions.length)">
                    <span v-if="modalItem.unobtainable === true" class="badge-no-drop" v-tooltip="t('app_tooltip_not_dropped')">{{ t('app_badge_no_drop') }}</span>
                    <span v-if="modalItem.tacticalKit === true" class="badge-tactical-kit" v-tooltip="t('app_tooltip_tactical_kit')">{{ t('app_badge_tactical_kit') }}</span>
                    <span v-if="modalItem.integralOnly === true" class="badge-flag badge-integral-only" v-tooltip="t('app_tooltip_integral_only')">{{ t('app_badge_integral_only') }}</span>
                    <span v-if="modalItem.nimble === true" class="badge-flag badge-nimble" v-tooltip="t('app_tooltip_nimble')">{{ t('app_badge_nimble') }}</span>
                    <span v-if="isUnusedAmmo(modalItem, modalCategory)" class="badge-unused" v-tooltip="t('app_tooltip_unused_ammo')">{{ t('app_badge_unused') }}</span>
                    <span v-if="originBadge(modalItem.factions)" class="badge-flag" :class="originBadge(modalItem.factions).cls">{{ originBadge(modalItem.factions).label }}</span>
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
                        <div class="modal-desc-img-float"
                             @click="$event.currentTarget.classList.remove('no-icon')"
                        >
                            <img
                                class="modal-item-img"
                                :src="'img/icons/' + modalItem.id + '.png'"
                                :alt="tName(modalItem)"
                                @error="$event.target.style.display='none'; $event.target.parentElement.classList.add('no-icon')"
                            />
                            <img
                                v-if="modalItem.ui_st_community && factionIcon(modalItem.ui_st_community)"
                                :src="'img/' + factionIcon(modalItem.ui_st_community)"
                                :alt="modalItem.ui_st_community"
                                class="modal-item-faction-badge"
                                v-tooltip="t(modalItem.ui_st_community)"
                            />
                            <span
                                v-if="scopeZoomLabel"
                                class="modal-scope-zoom-badge"
                                v-tooltip="headerLabel('st_data_export_magnifications')"
                            >{{ scopeZoomLabel }}</span>
                        </div>
                        <p v-if="parsedDescription" class="modal-description">{{ parsedDescription.text }}</p>
                        <div v-if="parsedDescription && parsedDescription.sections.length" class="modal-desc-meta">
                            <div class="desc-chip-group">
                                <template v-for="section in parsedDescription.sections">
                                    <span v-if="section.header === 'WARNING'" v-for="item in section.items" class="desc-chip desc-chip-warning">{{ item }}</span>
                                    <span v-else v-for="item in section.items" class="desc-chip">{{ item }}</span>
                                </template>
                            </div>
                        </div>
                        <div v-if="parsedPerk || (modalItem && pbaConstants[modalItem.id])" class="modal-perk-block">
                            <div class="modal-perk-title">
                                <span class="modal-perk-tag">{{ t('app_label_perk') }}</span>
                                <span v-if="parsedPerk?.name" class="modal-perk-name">{{ parsedPerk.name }}</span>
                            </div>
                            <ul v-if="parsedPerk?.items?.length" class="modal-perk-items">
                                <li v-for="(it, i) in parsedPerk.items" :key="i" :class="'modal-perk-' + it.kind">{{ it.text }}</li>
                            </ul>
                            <PerkDetails
                                v-if="modalItem && pbaConstants[modalItem.id]"
                                :item-id="modalItem.id"
                                :pba-constants="pbaConstants"
                                @navigate-to-item="$emit('navigateToItem', $event)"
                            />
                        </div>
                    </div>
                </div>

                <div class="drop-sources" :class="{ collapsed: isCollapsed('stats') }">
                    <h2 class="section-toggle" @click="toggleSection('stats')"><LucideChevronRight :size="14" class="section-chevron" /> {{ t('app_label_stats') }}<button v-if="isModalWeaponItem" class="stats-help-btn" @click.stop="$emit('openWeaponHelp')" v-tooltip="t('app_label_weapon_mechanics_help')"><LucideInfo :size="13" /></button></h2>
                    <div class="stat-grid">
                        <div v-for="row in modalStatRows" :key="row.key" :class="row.isSection ? 'stat-section' : 'stat-row'">
                            <template v-if="row.isSection">
                                <span>{{ headerLabel(row.key) }}</span>
                            </template>
                            <template v-else-if="row.key === 'ui_mm_repair' && row.value">
                                <span class="stat-label">{{ headerLabel(row.key) }}</span>
                                <span class="badge" :style="displayStyle(row.key, row.value)">{{ displayLabel(row.key, row.value) }}</span>
                            </template>
                            <template v-else-if="row.key === 'st_data_export_fire_modes' && row.value">
                                <span class="stat-label">{{ headerLabel(row.key) }}</span>
                                <span class="stat-value fire-mode-list">
                                    <span v-for="m in fireModes(row.value)" :key="m" class="badge-firemode" :data-mode="m === 'A' ? 'auto' : (m === '1' ? 'single' : 'burst')" v-tooltip="fireModeLabel(m)">{{ fireModeLabelShort(m) }}</span>
                                </span>
                            </template>
                            <template v-else-if="(row.key === 'ui_ammo_types' || row.key === 'st_data_export_ammo_types_alt') && row.value">
                                <span class="stat-label">{{ headerLabel(row.key) }}</span>
                                <span class="stat-value ammo-variants">
                                    <span v-for="v in caliberVariantObjects(row.value)" :key="v.id || v.name" class="badge-ammo" :class="{ clickable: v.id }" @click="v.id && $emit('navigateToItem', v.id)">{{ shortAmmoName(tName(v)) }}</span>
                                </span>
                            </template>
                            <template v-else>
                                <span class="stat-label" v-tooltip="statRowTooltip(row.key)">{{ headerLabel(row.key) }}<svg v-if="statRowTooltip(row.key)" class="info-hint" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg></span>
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

                <!-- Penetration scale (outfit/helmet with armor calc fields) -->
                <div v-if="isModalArmorItem" class="drop-sources" :class="{ collapsed: isCollapsed('penetration') }">
                    <h2 class="section-toggle" @click="toggleSection('penetration')"><LucideChevronRight :size="14" class="section-chevron" /> {{ t('app_label_penetration_scale') }}</h2>
                    <ArmorPenetrationScale :bone-armor="modalItem.boneArmor" :hit-fraction-actor="modalItem.hitFractionActor" />
                </div>

                <!-- Used By Weapons (on ammo detail) -->
                <div v-if="modalUsedByWeapons.length > 0" class="drop-sources" :class="{ collapsed: isCollapsed('used-by') }">
                    <h2 class="section-toggle" @click="toggleSection('used-by')"><LucideChevronRight :size="14" class="section-chevron" /> {{ t('app_label_used_by') }}</h2>
                    <div class="addon-tile-grid">
                        <AddonTile v-for="w in modalUsedByWeapons" :key="w.id" :item="w" :name="weaponDisplayName(w)" :badge="w.isAlt ? t('app_badge_alt') : ''" @navigate="$emit('navigateToItem', $event)" />
                    </div>
                </div>

                <!-- Max Upgraded Stats -->
                <div v-if="maxUpgradeStatRows.length > 0" class="drop-sources max-stats-section" :class="{ collapsed: isCollapsed('max-stats') }">
                    <h2 class="section-toggle" @click="toggleSection('max-stats')"><LucideChevronRight :size="14" class="section-chevron" /> {{ t('app_label_max_upgraded_stats') }}<span class="max-stats-tag">{{ t('app_label_best_or_selected') }}</span></h2>
                    <div class="stat-grid">
                        <div v-for="row in maxUpgradeStatRows" :key="'upg-' + row.key" class="stat-row">
                            <span class="stat-label">{{ headerLabel(row.key) }}</span>
                            <span class="stat-value max-stat-compare">
                                <span class="max-stat-base">{{ formatValue(row.key, row.value) }}</span>
                                <svg class="max-stat-arrow-icon" viewBox="0 0 16 8" width="14" height="7" fill="none"><path d="M0 4H13M10 1L13.5 4L10 7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
                                <span class="max-stat-new" :class="upgradeDeltaClass(row.key, row.delta)">{{ formatValue(row.key, row.upgradedValue) }}</span>
                                <span class="max-stat-delta" :class="upgradeDeltaClass(row.key, row.delta)">{{ formatUpgradeDelta(row.key, row.delta, row.value) }}</span>
                            </span>
                        </div>
                    </div>
                </div>

                <!-- Cross-pack changes -->
                <div v-if="crossPackId && crossPackItem" class="drop-sources" :class="{ collapsed: isCollapsed('cross-pack') }">
                    <h2 class="section-toggle" @click="toggleSection('cross-pack')"><LucideChevronRight :size="14" class="section-chevron" /> {{ t('app_label_changes_from') }} {{ crossPackName }}</h2>
                    <div v-if="crossPackDiffs.length" class="stat-grid">
                        <div v-for="row in crossPackDiffs" :key="'diff-'+row.key" class="stat-row">
                            <span class="stat-label">{{ headerLabel(row.key) }}</span>
                            <span class="stat-value diff-values"><span class="diff-old">{{ formatValue(row.key, row.otherValue) }}</span> <span class="diff-arrow">&#9654;</span> <span class="diff-new" :class="row.diff.type === 'higher' ? 'diff-up' : 'diff-down'">{{ formatValue(row.key, row.value) }}</span></span>
                        </div>
                    </div>
                    <p v-else class="cross-pack-no-changes">{{ t('app_label_no_changes') }}</p>
                </div>
                <div v-else-if="crossPackId && crossPackNotFound" class="drop-sources" :class="{ collapsed: isCollapsed('cross-pack') }">
                    <h2 class="section-toggle" @click="toggleSection('cross-pack')"><LucideChevronRight :size="14" class="section-chevron" /> {{ t('app_label_changes_from') }} {{ crossPackName }}</h2>
                    <p class="cross-pack-no-changes">{{ t('app_label_not_in_pack') }}</p>
                </div>

                <!-- Compatible Ammo (on weapon detail) -->
                <div v-if="modalAmmoVariants.length > 0" class="drop-sources" :class="{ collapsed: isCollapsed('ammo') }">
                    <h2 class="section-toggle" @click="toggleSection('ammo')"><LucideChevronRight :size="14" class="section-chevron" /> {{ t('app_label_compatible_ammo') }}</h2>
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
                                        <a v-if="v.id" href="#" @click.prevent="$emit('navigateToItem', v.id)" class="ammo-variant-link" @mouseenter="showItemHover(v, $event)" @mousemove="moveItemHover($event)" @mouseleave="hideItemHover()">{{ shortAmmoName(tName(v)) }}</a>
                                        <span v-else>{{ shortAmmoName(tName(v)) }}</span>
                                        <span v-if="v.isAlt" class="badge-ammo badge-ammo-alt ammo-alt-tag">{{ t('app_badge_alt') }}</span>
                                    </td>
                                    <td v-for="k in modalAmmoStatKeys" :key="k" class="ammo-stat-cell" :class="{ 'ammo-best': isAmmoBest(k, v[k], v) }">{{ formatAmmoStat(k, v[k], v) }}<template v-if="ammoArrow(k, v[k]) !== null"><span class="ammo-arrow" :class="ammoArrow(k, v[k]) > 0 ? 'arrow-up' : ammoArrow(k, v[k]) < 0 ? 'arrow-down' : 'arrow-neutral'">{{ ammoArrow(k, v[k]) > 0 ? '\u25B2' : ammoArrow(k, v[k]) < 0 ? '\u25BC' : '\u25CF' }}</span></template></td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- Compatible Scopes (on weapon detail) -->
                <div v-if="modalWeaponAddons.scopes.length" class="drop-sources" :class="{ collapsed: isCollapsed('scopes') }">
                    <h2 class="section-toggle" @click="toggleSection('scopes')"><LucideChevronRight :size="14" class="section-chevron" /> {{ t('app_label_compatible_scopes') }}</h2>
                    <div class="addon-tile-grid">
                        <AddonTile v-for="addon in modalWeaponAddons.scopes" :key="addon.id" :item="addon" :name="t(addon.pda_encyclopedia_name)" modifier="scope" :badge="zoomBadge(addon)" :integral="addon.integral" @navigate="$emit('navigateToItem', $event)" />
                    </div>
                </div>

                <!-- Compatible Silencers (on weapon detail) -->
                <div v-if="modalWeaponAddons.silencers.length" class="drop-sources" :class="{ collapsed: isCollapsed('silencers') }">
                    <h2 class="section-toggle" @click="toggleSection('silencers')"><LucideChevronRight :size="14" class="section-chevron" /> {{ t('app_label_compatible_silencers') }}</h2>
                    <div class="addon-tile-grid">
                        <AddonTile v-for="addon in modalWeaponAddons.silencers" :key="addon.id" :item="addon" :name="t(addon.pda_encyclopedia_name)" modifier="silencer" :integral="addon.integral" @navigate="$emit('navigateToItem', $event)" />
                    </div>
                </div>

                <!-- Compatible Launchers (on weapon detail) -->
                <div v-if="modalWeaponAddons.launchers.length" class="drop-sources" :class="{ collapsed: isCollapsed('launchers') }">
                    <h2 class="section-toggle" @click="toggleSection('launchers')"><LucideChevronRight :size="14" class="section-chevron" /> {{ t('app_label_compatible_launchers') }}</h2>
                    <div class="addon-tile-grid">
                        <AddonTile v-for="addon in modalWeaponAddons.launchers" :key="addon.id" :item="addon" :name="t(addon.pda_encyclopedia_name)" modifier="launcher" :integral="addon.integral" @navigate="$emit('navigateToItem', $event)" />
                    </div>
                </div>

                <!-- Launcher available only after the mount upgrade (on weapon detail).
                     No export names the launcher model that fits, so this shows a note
                     instead of addon tiles. -->
                <div v-if="modalWeaponAddons.launcherViaUpgrade && !modalWeaponAddons.launchers.length" class="drop-sources">
                    <h2>{{ t('app_label_compatible_launchers') }}</h2>
                    <p class="addon-upgrade-note">{{ t('app_label_launcher_via_upgrade') }}</p>
                </div>

                <!-- Compatible Tactical Kits (on weapon detail) -->
                <div v-if="modalWeaponAddons.kits && modalWeaponAddons.kits.length" class="drop-sources" :class="{ collapsed: isCollapsed('kits') }">
                    <h2 class="section-toggle" @click="toggleSection('kits')"><LucideChevronRight :size="14" class="section-chevron" /> {{ t('app_label_compatible_kits') }}</h2>
                    <div class="addon-tile-grid">
                        <AddonTile v-for="addon in modalWeaponAddons.kits" :key="addon.id" :item="addon" :name="t(addon.pda_encyclopedia_name)" modifier="kit" @navigate="$emit('navigateToItem', $event)" />
                    </div>
                </div>

                <!-- Compatible Magazines (on weapon detail; GAMMA Mags Reloaded) -->
                <div v-if="modalCompatibleMagazines.length" class="drop-sources" :class="{ collapsed: isCollapsed('magazines') }">
                    <h2 class="section-toggle" @click="toggleSection('magazines')"><LucideChevronRight :size="14" class="section-chevron" /> {{ t('app_label_compatible_magazines') }}</h2>
                    <div class="addon-tile-grid">
                        <AddonTile v-for="mag in modalCompatibleMagazines" :key="mag.id" :item="mag" :name="t(mag.pda_encyclopedia_name)" :badge="capacityBadge(mag)" @navigate="$emit('navigateToItem', $event)" />
                    </div>
                </div>

                <!-- Compatible Weapons (on magazine detail; reverse of weapon→magazines) -->
                <div v-if="modalMagazineCompatibleWeapons.length" class="drop-sources" :class="{ collapsed: isCollapsed('mag-weapons') }">
                    <h2 class="section-toggle" @click="toggleSection('mag-weapons')"><LucideChevronRight :size="14" class="section-chevron" /> {{ t('app_label_compatible_weapons') }}</h2>
                    <div class="addon-tile-grid">
                        <AddonTile v-for="w in modalMagazineCompatibleWeapons" :key="w.id" :item="w" :name="t(w.pda_encyclopedia_name || w.name)" @navigate="$emit('navigateToItem', $event)" />
                    </div>
                </div>

                <!-- Parts / Components (on weapon & outfit detail) -->
                <div v-if="modalItemParts.length" class="drop-sources" :class="{ collapsed: isCollapsed('item-parts') }">
                    <h2 class="section-toggle" @click="toggleSection('item-parts')"><LucideChevronRight :size="14" class="section-chevron" /> {{ t('app_label_item_parts') }}</h2>
                    <div class="addon-tile-grid">
                        <AddonTile v-for="part in modalItemParts" :key="part.id" :item="part" :name="t(part.pda_encyclopedia_name)" :tooltip="part.descr ? t(part.descr) : ''" :hover="false" @navigate="$emit('navigateToItem', $event)" />
                    </div>
                </div>

                <!-- Used In (on part detail): weapons/outfits that contain this part -->
                <div v-if="modalPartUsedBy.length" class="drop-sources" :class="{ collapsed: isCollapsed('used-in') }">
                    <h2 class="section-toggle" @click="toggleSection('used-in')"><LucideChevronRight :size="14" class="section-chevron" /> {{ t('app_label_used_in') }}</h2>
                    <div class="addon-tile-grid">
                        <AddonTile v-for="it in modalPartUsedBy" :key="it.id" :item="it" :name="tName(it)" :hover="false" @navigate="$emit('navigateToItem', $event)" />
                    </div>
                </div>

                <!-- Modified weapons produced by this kit (on kit detail) -->
                <div v-if="modalKitWeapons.length" class="drop-sources" :class="{ collapsed: isCollapsed('kit-variants') }">
                    <h2 class="section-toggle" @click="toggleSection('kit-variants')"><LucideChevronRight :size="14" class="section-chevron" /> {{ t('app_label_kit_variants') }}</h2>
                    <div class="addon-tile-grid">
                        <AddonTile v-for="weapon in modalKitWeapons" :key="weapon.id" :item="weapon" :name="t(weapon.pda_encyclopedia_name)" @navigate="$emit('navigateToItem', $event)" />
                    </div>
                </div>

                <!-- Upgrade Tree -->
                <div v-if="modalUpgradeNodes && modalUpgradeNodes.length > 0" class="drop-sources" :class="{ collapsed: isCollapsed('upgrades') }">
                    <h2 class="section-toggle" @click="toggleSection('upgrades')"><LucideChevronRight :size="14" class="section-chevron" /> {{ t('app_label_upgrades') }}</h2>
                    <UpgradeTreeView :nodes="modalUpgradeNodes" :engine-mode="showEngineUpgradeStats" />
                </div>

                <!-- NPC drop sources -->
                <div v-if="modalDropFactions.length > 0" class="drop-sources" :class="{ collapsed: isCollapsed('npc-drops') }">
                    <h2 class="section-toggle" @click="toggleSection('npc-drops')"><LucideChevronRight :size="14" class="section-chevron" /> {{ t('app_label_npc_drops') }}</h2>
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
                <div v-if="modalItemDropLocations.length > 0" class="drop-sources" :class="{ collapsed: isCollapsed('stash-drops') }">
                    <h2 class="section-toggle" @click="toggleSection('stash-drops')"><LucideChevronRight :size="14" class="section-chevron" /> {{ t('app_label_stash_drops') }}</h2>
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

                <!-- Stash chance -->
                <div v-if="modalStashChanceEntries.length > 0" class="drop-sources" :class="{ collapsed: isCollapsed('stash-chance') }">
                    <h2 class="section-toggle" @click="toggleSection('stash-chance')"><LucideChevronRight :size="14" class="section-chevron" /> {{ t('app_label_stash_chance') }}</h2>
                    <div class="stash-drop-grid">
                        <div v-for="entry in modalStashChanceEntries" :key="entry.type" class="stash-drop-card">
                            <div class="stash-drop-map">{{ t(entry.type) }}</div>
                            <div class="stash-drop-chances">
                                <span class="stash-chance" :class="'stash-chance-' + entry.type.split('_').pop()">{{ entry.chance }}%</span>
                            </div>
                            <div v-if="modalStashChanceHasRestrictedEcos && entry.ecos.length" class="stash-drop-ecos">
                                <span class="stash-eco-tag">{{ entry.ecos.join('/') }}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Compatible Weapons (on scope/silencer/grenade launcher detail) -->
                <div v-if="modalAddonCompatibleWeapons.length > 0" class="drop-sources" :class="{ collapsed: isCollapsed('compat-weapons') }">
                    <h2 class="section-toggle" @click="toggleSection('compat-weapons')"><LucideChevronRight :size="14" class="section-chevron" /> {{ t('app_label_compatible_weapons') }}</h2>
                    <div class="addon-tile-grid">
                        <AddonTile v-for="w in modalAddonCompatibleWeapons" :key="w.id" :item="w" :name="weaponDisplayName(w)" :integral="w.integral" @navigate="$emit('navigateToItem', $event)" />
                    </div>
                </div>

                <!-- Sold By (traders that stock this item) -->
                <div v-if="modalSoldBy.length > 0" class="drop-sources" :class="{ collapsed: isCollapsed('sold-by') }">
                    <h2 class="section-toggle" @click="toggleSection('sold-by')"><LucideChevronRight :size="14" class="section-chevron" /> <a href="#" class="section-title-link" @click.stop.prevent="$emit('openTrading')" v-tooltip="t('app_nav_trading')">{{ t('app_label_sold_by') }}</a></h2>
                    <div class="sold-by-grid">
                        <div v-for="row in modalSoldBy" :key="row.trader" class="sold-by-item">
                            <span class="sold-by-trader" :style="row.color ? { '--trader-color': row.color } : null">
                                <img v-if="row.icon" class="sold-by-faction-icon" :src="'img/' + row.icon" :alt="row.name" loading="lazy" @error="$event.target.style.display='none'" />
                                <span v-else-if="row.color" class="sold-by-dot"></span><span class="sold-by-name" v-tooltip="row.name">{{ row.name }}</span>
                            </span>
                            <span class="sold-by-tier" v-tooltip="row.tooltip">{{ row.badge }}</span>
                        </div>
                    </div>
                </div>

                <!-- Crafting Recipe -->
                <div v-if="modalRecipe" class="drop-sources" :class="{ collapsed: isCollapsed('recipe') }">
                    <h2 class="section-toggle" @click="toggleSection('recipe')"><LucideChevronRight :size="14" class="section-chevron" /> {{ t('app_label_crafting_recipe') }}</h2>
                    <div class="recipe-ingredients recipe-ingredients-modal">
                        <div v-for="(ing, idx) in modalRecipe" :key="idx" class="recipe-ingredient">
                            <span v-if="idx > 0" class="recipe-plus">+</span>
                            <template v-if="findItemByName(ing.name)">
                                <a href="#" @click.prevent="$emit('navigateToItem', findItemByName(ing.name).id)" :class="idx === 0 ? 'recipe-base' : ''">{{ t(ing.name) }}</a>
                            </template>
                            <template v-else>
                                <span :class="idx === 0 ? 'recipe-base' : ''">{{ t(ing.name) }}</span>
                            </template>
                            <span class="recipe-ing-amount">{{ ing.amount }}</span>
                        </div>
                    </div>
                </div>

                <!-- Used in Crafting -->
                <div v-if="modalUsedInRecipes.length > 0" class="drop-sources" :class="{ collapsed: isCollapsed('used-in-crafting') }">
                    <h2 class="section-toggle" @click="toggleSection('used-in-crafting')"><LucideChevronRight :size="14" class="section-chevron" /> {{ t('app_label_used_in_crafting') }}</h2>
                    <div class="recipe-used-list">
                        <div v-for="recipe in modalUsedInRecipes" :key="recipe.id" class="recipe-used-item">
                            <a href="#" @click.prevent="$emit('navigateToItem', recipe.id)">{{ tName(recipe) }}</a>
                        </div>
                    </div>
                </div>

                <!-- Disassembles Into -->
                <div v-if="modalDisassembleMaterials" class="drop-sources" :class="{ collapsed: isCollapsed('disassemble') }">
                    <h2 class="section-toggle" @click="toggleSection('disassemble')"><LucideChevronRight :size="14" class="section-chevron" /> {{ t('app_label_disassembles') }}</h2>
                    <div class="recipe-ingredients recipe-ingredients-modal">
                        <div v-for="(mat, idx) in modalDisassembleMaterials" :key="idx" class="recipe-ingredient">
                            <span v-if="idx > 0" class="recipe-plus">+</span>
                            <template v-if="findItemByName(mat.name)">
                                <a href="#" @click.prevent="$emit('navigateToItem', findItemByName(mat.name).id)">{{ t(mat.name) }}</a>
                            </template>
                            <template v-else>
                                <span>{{ t(mat.name) }}</span>
                            </template>
                            <span class="recipe-ing-amount">{{ mat.amount }}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
    </Transition>
</div>
</Transition>
</template>

<script>
import UpgradeTreeView from './UpgradeTreeView.vue';
import PerkDetails from './PerkDetails.vue';
import AddonTile from './AddonTile.vue';
import ArmorPenetrationScale from './ArmorPenetrationScale.vue';

// ── Max Upgraded Stats: upgrade key → stat-card field ────────────────────
// The section sums every upgrade in the tree onto the item's own stat rows, in
// whichever mode the "computed upgrade values" toggle is in: the converted
// effects the exporter derived from the game files, or the game's own authored
// upgrade numbers. Both paths land on the same field keys.

// A node's declared (authored) property → the field it moves.
const PROP_TO_FIELD = {
  st_prop_recoil: 'ui_inv_recoil',
  st_prop_reliability: 'ui_inv_reli',
  st_prop_bullet_speed: 'ui_inv_bspeed',
  st_prop_weightoutfit: 'st_prop_weight',
  st_prop_artefact: 'ui_inv_outfit_artefact_count',
};

// Raw upgrade-section params → field, for side effects the declared property
// doesn't mention (weight, protections, artefact slots…).
const SECONDARY_TO_FIELD = {
  inv_weight: 'st_prop_weight',
  wound_protection: 'ui_inv_outfit_wound_protection',
  fire_wound_protection: 'ui_inv_outfit_fire_wound_protection',
  burn_protection: 'ui_inv_outfit_burn_protection',
  chemical_burn_protection: 'ui_inv_outfit_chemical_burn_protection',
  radiation_protection: 'ui_inv_outfit_radiation_protection',
  telepatic_protection: 'ui_inv_outfit_telepatic_protection',
  shock_protection: 'ui_inv_outfit_shock_protection',
  explosion_protection: 'ui_inv_outfit_explosion_protection',
  artefact_count: 'ui_inv_outfit_artefact_count',
  additional_inventory_weight: 'ui_inv_outfit_additional_weight',
  additional_inventory_weight2: 'ui_inv_outfit_additional_weight',
};

// Nodes left out of the sum entirely. A caliber conversion is a sidegrade, not
// an upgrade — it buys velocity with magazine size and reliability — and the
// section is a best-case build ("best option per choice"), so counting it would
// make the max worse than stock. Its params are absolute replacements rather
// than deltas anyway (hit_power arrives as the new round's "0.46,0.46,…"), so
// summing them was never meaningful. The trade-off stays visible per node in
// the tree, and the alternate caliber is listed in the item's ammo section.
const SIDEGRADE_PROPS = new Set(['st_prop_calibre']);

// Converted-effect keys → field. Most effect keys already are field keys (or
// are covered by PROP_TO_FIELD); only the exporter's synthetic ones need this.
const EFFECT_TO_FIELD = {
  app_upgrade_bullet_speed: 'ui_inv_bspeed',
  app_upgrade_mag_size: 'ui_ammo_count',
};

// Properties that move nothing shown on the stat card (slots, sights, fire
// modes), or whose stat has no row to land on (durability is a flat
// condition-loss reduction; heal rates live in their own section).
const SKIP_PROPS = new Set([
  'st_prop_calibre', 'st_prop_sprint', 'st_prop_underbarrel_slot',
  'st_prop_scope', 'st_prop_scope_15x', 'st_prop_scope_4x', 'st_prop_scope_5x',
  'st_prop_silencer', 'st_auto_fire', 'st_semi_auto_fire',
  'st_prop_contrast', 'st_prop_night_vision_2',
  'st_prop_binoc_zoom', 'st_prop_binoc_autolock', 'st_prop_binoc_nightvision',
  'st_prop_durability', 'st_prop_restore_bleeding', 'st_prop_restore_health',
]);

// Raw params already carried by a converted effect — summing both would double
// the delta. Mirrors UpgradeTreeView's list of the same name.
const SUPERSEDED_RAW_KEYS = new Set([
  'inv_weight', 'rpm', 'ammo_mag_size', 'bullet_speed', 'condition_shot_dec',
  'fire_dispersion_base', 'PDM_disp_base', 'zoom_cam_dispersion', 'bones_koeff_protection_add',
  'wound_protection', 'fire_wound_protection', 'burn_protection', 'shock_protection',
  'chemical_burn_protection', 'telepatic_protection', 'radiation_protection',
  'strike_protection', 'explosion_protection', 'bleeding_restore_speed',
  'health_restore_speed', 'power_restore_speed', 'artefact_count',
  'additional_inventory_weight', 'additional_inventory_weight2',
]);

// A converted effect sometimes names the declared property differently — alias
// them so a node isn't counted twice (once computed, once as the authored
// fallback below).
const EFFECT_KEY_ALIASES = {
  st_prop_bullet_speed: 'app_upgrade_bullet_speed',
  st_prop_weightoutfit: 'st_prop_weight',
};

// Declared properties whose in-game sign runs opposite to the field's own
// direction: the game writes a recoil upgrade as "-10" (less recoil) while the
// card shows Recoil *Control*, where the same upgrade is an increase. Authored
// deltas for these are flipped into the field's convention before summing.
const AUTHORED_SIGN_FLIPPED = new Set(['st_prop_recoil']);

// Fields where the lower number is the better one, for delta colouring.
// ui_inv_recoil is deliberately absent — it is Recoil Control, higher = better.
const LOWER_IS_BETTER = new Set(['st_prop_weight']);

export default {
  name: 'ItemDetailModal',
  components: { UpgradeTreeView, PerkDetails, AddonTile, ArmorPenetrationScale },
  inject: [
    't', 'tName', 'tCat', 'headerLabel', 'formatValue', 'displayLabel', 'displayStyle', 'isFieldHidden',
    'healDots', 'factionColor', 'factionIcon', 'singularCategory', 'isUnusedAmmo', 'originBadge',
    'caliberVariantObjects', 'shortAmmoName', 'formatAmmoStat', 'ammoArrow', 'isAmmoBest',
    'fireModes', 'fireModeLabel', 'fireModeLabelShort',
    'findItemByName', 'modalStatClass', 'modalStatStyle',
    'showItemHover', 'moveItemHover', 'hideItemHover',
  ],
  props: {
    modalOpen: Boolean,
    modalItem: Object,
    modalCategory: String,
    isModalWeaponItem: Boolean,
    modalLoading: Boolean,
    modalStatRows: Array,
    modalHealGroups: Array,
    modalDropFactions: Array,
    modalItemDropLocations: Array,
    modalItemDropTypes: Array,
    modalItemDropHasRestrictedEcos: Boolean,
    modalStashChanceEntries: { type: Array, default: () => [] },
    modalStashChanceHasRestrictedEcos: Boolean,
    modalAmmoVariants: Array,
    modalAmmoStatKeys: Array,
    modalRecipe: { type: Array, default: null },
    modalUsedInRecipes: Array,
    modalDisassembleMaterials: { type: Array, default: null },
    modalUpgradeNodes: { type: Array, default: null },
    showEngineUpgradeStats: { type: Boolean, default: true },
    modalUsedByWeapons: Array,
    modalItemParts: { type: Array, default: () => [] },
    modalPartUsedBy: { type: Array, default: () => [] },
    modalSoldBy: { type: Array, default: () => [] },
    parsedDescription: Object,
    parsedPerk: Object,
    pbaConstants: { type: Object, default: () => ({}) },
    modalWeaponAddons: { type: Object, default: () => ({ scopes: [], silencers: [], launchers: [], kits: [], launcherViaUpgrade: false }) },
    modalCompatibleMagazines: { type: Array, default: () => [] },
    modalMagazineCompatibleWeapons: { type: Array, default: () => [] },
    modalKitWeapons: { type: Array, default: () => [] },
    modalAddonCompatibleWeapons: { type: Array, default: () => [] },
    favoriteIds: Array,
    pinnedIds: Array,
    packs: Array,
    crossPackId: { type: String, default: null },
    crossPackItem: Object,
    crossPackNotFound: Boolean,
    crossPackName: String,
    crossPackOptions: Array,
    crossPackDiffs: Array,
    copyIdFeedback: Boolean,
    copyModalLinkFeedback: Boolean,
  },
  emits: [
    'closeModal', 'navigateModal', 'navigateToItem', 'toggleFavorite', 'togglePin',
    'copyItemId', 'copyModalLink', 'pickComparePack', 'openWeaponHelp', 'modalScroll',
    'openTrading',
  ],
  data() {
    return {
      compareMenuOpen: false,
      overflowMenuOpen: false,
      collapsedSections: this._loadCollapsedSections(),
    };
  },
  watch: {
    modalItem() {
      this.hideItemHover();
      this.stickyVisible = false;
      this.overflowMenuOpen = false;
      // Scroll positioning (top on a fresh open, saved offset on Back/Forward) is
      // owned by the parent's openItem/_restoreModalScroll so the two don't fight.
    },
    modalLoading(val) {
      if (!val && this.modalItem) {
        this.$nextTick(() => this._setupHeaderObserver());
      }
    },
  },
  beforeUnmount() {
    if (this._headerObserver) this._headerObserver.disconnect();
  },
  computed: {
    hasWeaponAddons() {
      const a = this.modalWeaponAddons;
      return a.scopes.length > 0 || a.silencers.length > 0 || a.launchers.length > 0 || a.kits.length > 0
        || !!a.launcherViaUpgrade;
    },
    isAddonItem() {
      return ['Scopes', 'Silencers', 'Grenade Launchers', 'Tactical Kits'].includes(this.modalCategory);
    },
    isModalArmorItem() {
      return (this.modalCategory === 'Outfits' || this.modalCategory === 'Helmets')
        && this.modalItem
        && typeof this.modalItem.boneArmor === 'number'
        && typeof this.modalItem.hitFractionActor === 'number';
    },
    // Small magnification label overlaid on a scope's icon, e.g. "4×" or "3–10×".
    scopeZoomLabel() {
      if (this.modalCategory !== 'Scopes') return null;
      return this.zoomBadge(this.modalItem);
    },
    upgradeStatDeltas() {
      if (!this.modalUpgradeNodes || !this.modalUpgradeNodes.length) return {};

      const deltas = {};
      const add = (field, v) => {
        if (!field || isNaN(v)) return;
        deltas[field] = (deltas[field] || 0) + v;
      };
      // Per node, not per item: a pack (or a single upgrade) with no converted
      // effects still contributes its authored numbers while the toggle is on.
      for (const node of this.selectedUpgradeNodes) {
        if (this.showEngineUpgradeStats && node.effects?.length) this._addComputedDeltas(node, add);
        else this._addAuthoredDeltas(node, add);
      }

      for (const key of Object.keys(deltas)) {
        if (Math.abs(deltas[key]) < 0.0001) delete deltas[key];
      }
      return deltas;
    },
    // One node per tree position: an OR group (two upgrades sharing a cell) is
    // an either/or choice, so only the strongest of the pair is counted.
    selectedUpgradeNodes() {
      const positions = new Map();
      for (const node of this.modalUpgradeNodes || []) {
        if (SIDEGRADE_PROPS.has(node.prop)) continue;
        const posKey = `${node.row}-${node.col}`;
        if (!positions.has(posKey)) positions.set(posKey, []);
        positions.get(posKey).push(node);
      }
      const selected = [];
      for (const [, nodes] of positions) {
        let best = nodes[0];
        for (const n of nodes.slice(1)) {
          if (this._upgradeNodeWeight(n) > this._upgradeNodeWeight(best)) best = n;
        }
        selected.push(best);
      }
      return selected;
    },
    maxUpgradeStatRows() {
      if (!this.modalUpgradeNodes?.length) return [];
      const deltas = this.upgradeStatDeltas;
      if (!Object.keys(deltas).length) return [];
      const result = [];
      for (const row of this.modalStatRows || []) {
        if (row.isSection || row.value === null || row.value === undefined || row.value === '') continue;
        const delta = deltas[row.key];
        if (delta === undefined) continue;
        const upgradedValue = this.applyUpgradeDelta(row.key, row.value, delta);
        if (upgradedValue === null) continue;
        result.push({ key: row.key, value: row.value, delta, upgradedValue });
      }
      return result;
    },
  },
  methods: {
    // Magnification label for a scope item, e.g. "4×", "3–10×" (range), or "1×/4×" (dual-mode).
    // Blank magnification means a non-magnifying sight (red-dot/holo) — show "1×".
    zoomBadge(item) {
      if (!item) return null;
      return this.formatMagnification(item.st_data_export_magnifications) || '1×';
    },
    // Normalise a raw magnification value: "3-10" → "3–10×" (range), "1,4" → "1×/4×" (discrete modes).
    formatMagnification(raw) {
      const mag = String(raw || '').trim();
      if (!mag) return null;
      if (mag.includes(',')) return mag.split(',').map(v => v.trim() + '×').join('/');
      return mag.replace(/-/g, '–') + '×';
    },
    // Round-capacity label for a magazine item, e.g. "30" (null when unknown/zero).
    capacityBadge(item) {
      const rounds = parseInt(item?.magRounds, 10);
      return rounds > 0 ? String(rounds) : null;
    },
    _loadCollapsedSections() {
      try {
        const raw = localStorage.getItem('modal-collapsed-sections');
        return raw ? JSON.parse(raw) : {};
      } catch { return {}; }
    },
    statRowTooltip(key) {
      if (key === '_malfunction_chance') return this.t('app_tooltip_malfunction');
      if (key === '_ballistic_rating') return this.t('app_tooltip_ballistic_rating');
      if (key === 'ui_inv_ap_res') return this.t('app_tooltip_br_class');
      if (key === 'st_data_export_belt_br_class') return this.t('app_tooltip_belt_br_class');
      if (key === 'st_data_export_belt_stopped_bonus') return this.t('app_tooltip_belt_stopped_bonus');
      if (key === 'ui_inv_outfit_fire_wound_protection') {
        // On belt items this column IS the contribution to the wearer's armour, and
        // the game floors it per item — worth saying where the number lives.
        const isBelt = this.modalCategory === 'Artefacts' || this.modalCategory === 'Belt Attachments';
        return this.t(isBelt ? 'app_tooltip_belt_flat_protection' : 'app_tooltip_fire_wound_protection');
      }
      return '';
    },
    isCollapsed(key) {
      return !!this.collapsedSections[key];
    },
    toggleSection(key) {
      this.collapsedSections[key] = !this.collapsedSections[key];
      try { localStorage.setItem('modal-collapsed-sections', JSON.stringify(this.collapsedSections)); } catch {}
    },
    isFavorited(id) {
      return this.favoriteIds.includes(id);
    },
    isPinned(id) {
      return this.pinnedIds.includes(id);
    },
    _setupHeaderObserver() {
      if (this._headerObserver) this._headerObserver.disconnect();
      const sentinel = this.$refs.headerSentinel;
      if (!sentinel) return;
      // Find the scrollable modal-body ancestor
      let root = sentinel.parentElement;
      while (root && !root.classList.contains('modal-body')) root = root.parentElement;
      if (!root) return;
      this._headerObserver = new IntersectionObserver(
        ([entry]) => { this.stickyVisible = !entry.isIntersecting; },
        { root, threshold: 0 }
      );
      this._headerObserver.observe(sentinel);
    },
    closeCompareMenu() {
      this.compareMenuOpen = false;
    },
    closeOverflowMenu() {
      this.overflowMenuOpen = false;
    },
    _esc(s) {
      return String(s ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
    },
    addonTooltip(addon) {
      const esc = this._esc.bind(this);
      const kv = (key, val) =>
        `<div class="addon-tt-row"><span class="addon-tt-key">${esc(this.headerLabel(key))}</span><span class="addon-tt-val">${esc(val)}</span></div>`;
      const bool = (label, val) =>
        `<div class="addon-tt-row"><span class="addon-tt-key">${esc(label)}</span><span class="addon-tt-val ${val ? 'addon-tt-yes' : 'addon-tt-no'}">${val ? '✓' : '✗'}</span></div>`;
      const rows = [];
      if (addon.st_prop_weight) rows.push(kv('st_prop_weight', addon.st_prop_weight));
      if (addon.st_upgr_cost) rows.push(kv('st_upgr_cost', this.formatValue('st_upgr_cost', addon.st_upgr_cost)));
      if (addon.st_data_export_zoom_factor && !this.isFieldHidden('st_data_export_zoom_factor')) rows.push(kv('st_data_export_zoom_factor', this.formatValue('st_data_export_zoom_factor', addon.st_data_export_zoom_factor)));
      rows.push(bool(this.t('app_label_stash_drop'), addon.hasStashDrop));
      rows.push(bool(this.t('app_label_can_disassemble'), addon.hasDisassemble));
      const name = esc(this.t(addon.pda_encyclopedia_name || addon.id));
      return {
        className: 'tooltip-addon-card',
        html: `<div class="addon-tooltip"><div class="addon-tooltip-name">${name}</div><div class="addon-tooltip-stats">${rows.join('')}</div></div>`,
      };
    },
    weaponDisplayName(w) {
      return this.tName(w).replace(/\s*\[default\]$/i, '').trim();
    },
    // How strongly a node argues for itself when it is one side of an OR group.
    // The game's own declared value where there is one — it is the property the
    // upgrade is sold on. Nodes that declare no property at all (their whole
    // contribution is computed) fall back to their largest non-weight effect so
    // they can win a cell instead of scoring nothing.
    _upgradeNodeWeight(node) {
      if (node.prop) return Math.abs(parseFloat(node.val)) || 0;
      let best = 0;
      for (const eff of node.effects || []) {
        if (eff.key === 'st_prop_weight') continue;
        const v = Math.abs(parseFloat(eff.value));
        if (!isNaN(v) && v > best) best = v;
      }
      return best;
    },
    // Converted effects, whose values are already in the same scale as the stat
    // row they land on (percentage points on a "76%" row, index points on Recoil
    // Control, kg / RPM / m/s elsewhere) — so they sum additively.
    _addComputedDeltas(node, add) {
      const covered = new Set();
      for (const eff of node.effects) {
        if (SKIP_PROPS.has(eff.key)) continue;
        covered.add(eff.key);
        add(EFFECT_TO_FIELD[eff.key] || PROP_TO_FIELD[eff.key] || eff.key, parseFloat(eff.value));
      }
      // Declared property with no converted effect (e.g. recoil on a weapon
      // missing from the enhanced-recoil config, where the % can't be derived):
      // fall back to its authored value, as the tree does, so the node isn't
      // counted as a pure weight change.
      if (!covered.has(node.prop) && !covered.has(EFFECT_KEY_ALIASES[node.prop])) {
        this._addAuthoredPrimary(node, add);
      }
      // Raw side effects no converted effect already carries.
      this._addRawStats(node, add, { skipSuperseded: true });
    },
    // The game's own authored numbers: the declared property plus every raw side
    // effect, none of which are unit-converted.
    _addAuthoredDeltas(node, add) {
      this._addAuthoredPrimary(node, add);
      this._addRawStats(node, add, { skipField: PROP_TO_FIELD[node.prop] || node.prop });
    },
    // Raw upgrade-section params. The authored path drops the one already counted
    // from the declared property (`skipField`); the computed path drops instead
    // every param a converted effect already carries (`skipSuperseded`).
    _addRawStats(node, add, { skipField = null, skipSuperseded = false } = {}) {
      for (const [sKey, sVal] of Object.entries(node.stats || {})) {
        if (skipSuperseded && SUPERSEDED_RAW_KEYS.has(sKey)) continue;
        const mappedKey = SECONDARY_TO_FIELD[sKey];
        if (!mappedKey || (skipField && mappedKey === skipField)) continue;
        add(mappedKey, parseFloat(sVal));
      }
    },
    _addAuthoredPrimary(node, add) {
      if (!node.prop || !node.val || SKIP_PROPS.has(node.prop)) return;
      const v = parseFloat(node.val);
      if (isNaN(v)) return;
      add(PROP_TO_FIELD[node.prop] || node.prop, AUTHORED_SIGN_FLIPPED.has(node.prop) ? -v : v);
    },
    applyUpgradeDelta(key, value, delta) {
      if (value === null || value === undefined || value === '' || value === '--') return null;
      const s = String(value);
      const isPct = s.includes('%');
      const raw = isPct ? s.replace('%', '') : s;
      const n = parseFloat(raw);
      if (isNaN(n)) return null;
      const rounded = Math.round((n + delta) * 100) / 100;
      return isPct ? `${rounded}%` : String(rounded);
    },
    upgradeDeltaClass(key, delta) {
      if (!delta) return '';
      const isGood = LOWER_IS_BETTER.has(key) ? delta < 0 : delta > 0;
      return isGood ? 'upg-good' : 'upg-bad';
    },
    formatUpgradeDelta(key, delta, baseValue) {
      if (!delta) return '';
      const rounded = Math.round(delta * 100) / 100;
      const prefix = rounded > 0 ? '+' : '';
      const isPct = String(baseValue || '').includes('%');
      if (isPct) return `${prefix}${rounded}%`;
      if (key === 'st_prop_weight' || key === 'ui_inv_outfit_additional_weight') return `${prefix}${rounded} kg`;
      return `${prefix}${rounded}`;
    },
  },
};
</script>

<style scoped>
.modal-perk-block {
    margin: 0.6rem 0 0.25rem;
    padding: 0.55rem 0.85rem;
    border: 1px solid var(--border);
    border-left: 3px solid var(--color-accent-gold);
    border-radius: 4px;
    background: var(--color-surface-3);
}
.modal-perk-title {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.45rem;
}
.modal-perk-tag {
    font-family: var(--font-display);
    font-size: 0.6rem;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--color-accent-gold);
    background: var(--color-accent-tint-18);
    padding: 0.1rem 0.4rem;
    border-radius: 3px;
}
.modal-perk-name {
    font-family: var(--font-display);
    font-size: 0.85rem;
    font-weight: 600;
    letter-spacing: 0.02em;
    color: var(--text-primary);
    text-transform: uppercase;
}
.modal-perk-items {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
}
.modal-perk-items li {
    font-size: 0.8rem;
    line-height: 1.4;
    color: var(--text-secondary);
}
.modal-perk-bullet {
    position: relative;
    padding-left: 1rem;
}
.modal-perk-bullet::before {
    content: "•";
    position: absolute;
    left: 0.3rem;
    color: var(--text-tertiary);
}
.modal-perk-section {
    font-weight: 600;
    color: var(--text-primary);
    margin-top: 0.35rem;
    text-transform: uppercase;
    font-size: 0.7rem;
    letter-spacing: 0.04em;
}
.modal-perk-sub {
    position: relative;
    padding-left: 1.5rem;
    font-size: 0.78rem;
}
.modal-perk-sub::before {
    content: "›";
    position: absolute;
    left: 0.7rem;
    color: var(--text-tertiary);
}
.modal-sticky-bar {
    position: sticky;
    top: -0.75rem;
    z-index: 10;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.45rem 1.5rem;
    margin: -0.75rem -1.5rem 0.75rem;
    background: var(--color-surface-3);
    border-bottom: 1px solid var(--border);
    border-radius: 8px 8px 0 0;
}
.modal-sticky-actions {
    margin-left: auto;
    display: flex;
    align-items: center;
    gap: 0.6rem;
    flex-shrink: 0;
}
/* Compact (overflow + inline close) toolbar is mobile-only. */
.item-toolbar--compact {
    display: none;
}
.modal-close-inline {
    font-size: 1.4rem;
    line-height: 1;
    border-radius: 4px;
}
.item-toolbar--compact .sort-menu-item:disabled {
    opacity: 0.4;
    cursor: default;
}
/* Collapse the toolbar into the overflow menu well before the buttons would
   crowd the title — the modal is only calc(100vw - 16rem) wide, so the full
   5-button row runs out of room while there's still plenty of viewport. */
@media (max-width: 900px) {
    .item-toolbar--full { display: none; }
    .item-toolbar--compact {
        display: flex;
        align-items: center;
        gap: 0.35rem;
        margin: 0;
    }
    /* The inline close replaces the absolutely-positioned corner × on mobile. */
    .modal-close { display: none; }
    /* Name takes the whole first row (so it ellipsis-truncates); the type badge
       and item code then wrap together onto the second row. */
    .modal-sticky-bar .modal-sticky-name-text { flex-basis: 100%; }
    .modal-sticky-bar .modal-sticky-id { flex-basis: auto; }
}
@media (max-width: 768px) {
    /* Body padding is 1rem on mobile (vs 0.75/1.5 on desktop); realign the
       sticky bar's negative margins and stick offset to match, or a strip of
       scrolled content shows through above it. */
    .modal-sticky-bar {
        top: -1rem;
        margin: -1rem -1rem 0.75rem;
        padding-left: 1rem;
        padding-right: 1rem;
    }
}
.modal-desc-img-float {
    float: right;
    margin: 0 0 0.5rem 1rem;
    position: relative;
    background: var(--color-map-bg);
    border: 1px solid var(--color-map-elevated-2);
    border-radius: 6px;
    padding: 0.3rem 0.5rem;
}
.modal-desc-img-float.no-icon {
    display: none;
}
.modal-desc-img-float .modal-item-img {
    max-width: 140px;
    max-height: 60px;
    object-fit: contain;
}
/* Magnification overlay on a scope's icon (e.g. "4×" / "3–10×") */
.modal-scope-zoom-badge {
    position: absolute;
    top: 0.25rem;
    right: 0.25rem;
    z-index: 1;
    font-family: var(--mono);
    font-size: 0.6rem;
    font-weight: 700;
    line-height: 1;
    letter-spacing: 0.02em;
    padding: 0.18rem 0.34rem;
    border-radius: 3px;
    background: var(--color-teal-tint-28);
    color: var(--text-primary);
    pointer-events: auto;
}
.modal-sticky-id {
    font-size: 0.6rem;
    color: var(--text-secondary);
    font-family: var(--mono, monospace);
    line-height: 1;
    /* Sits on its own row beneath the name + type badge on desktop. */
    flex-basis: 100%;
}
.modal-sticky-actions .item-toolbar {
    margin: 0;
}
.modal-sticky-title {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    column-gap: 0.4rem;
    row-gap: 0.15rem;
    min-width: 0;
    /* Shrinkable so a long name ellipsis-truncates instead of pushing the toolbar
       past the modal edge and triggering horizontal scroll. */
    flex-shrink: 1;
}
/* The name truncates; the type badge beside it keeps its full width. */
.modal-sticky-name-text {
    font-size: 1.1rem;
    font-weight: 700;
    color: var(--color-text);
    line-height: 1.2;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    min-width: 0;
}
.modal-sticky-cat {
    font-size: 0.55rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--color-text-muted);
    background: var(--color-elevated-2);
    padding: 0.1rem 0.4rem;
    border-radius: 3px;
    flex-shrink: 0;
    white-space: nowrap;
    vertical-align: middle;
}

/* ── Max Upgraded Stats section ─────────────────────────── */

.max-stats-tag {
    display: inline-block;
    font-size: 0.48rem;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--color-accent-dim);
    background: var(--color-accent-tint-8);
    border: 1px solid var(--color-accent-tint-20);
    padding: 0.05rem 0.35rem;
    border-radius: 3px;
    margin-left: 0.5rem;
    vertical-align: middle;
}

.max-stat-compare {
    display: flex;
    align-items: center;
    gap: 0.3rem;
    flex-wrap: nowrap;
    min-width: 0;
}

.max-stat-base {
    color: var(--text-secondary);
    opacity: 0.65;
    font-size: 0.75rem;
    white-space: nowrap;
}

.max-stat-arrow-icon {
    color: var(--color-elevated-3);
    flex-shrink: 0;
    opacity: 0.8;
}

.max-stat-new {
    font-weight: 600;
    white-space: nowrap;
}

.max-stat-delta {
    font-size: 0.58rem;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
    padding: 0.05rem 0.3rem;
    border-radius: 3px;
    background: var(--color-overlay-white-2);
    flex-shrink: 0;
}

.upg-good { color: var(--color-green-positive); }
.upg-good.max-stat-delta { background: color-mix(in srgb, var(--color-green-positive) 12%, transparent); }

.upg-bad { color: var(--color-red-muted); }
.upg-bad.max-stat-delta { background: color-mix(in srgb, var(--color-red-muted) 12%, transparent); }

.stats-help-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    margin-left: 0.4rem;
    padding: 0.1rem;
    border: none;
    background: transparent;
    color: var(--text-tertiary);
    cursor: pointer;
    border-radius: 3px;
    vertical-align: middle;
    transition: color 0.15s;
    line-height: 0;
}
.stats-help-btn:hover {
    color: var(--color-accent);
}

/* ── Sold By section ────────────────────────────────────── */

.sold-by-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 0.4rem;
}
.sold-by-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    padding: 0.4rem 0.6rem;
    border: 1px solid var(--border);
    border-radius: 4px;
    background: var(--color-surface-3);
}
.sold-by-trader {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.82rem;
    color: var(--text-primary);
    flex: 1 1 auto;
    min-width: 0;
}
.sold-by-name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    min-width: 0;
}
.sold-by-dot {
    flex-shrink: 0;
    width: 0.5rem;
    height: 0.5rem;
    border-radius: 50%;
    background: var(--trader-color, var(--color-accent));
}
.sold-by-faction-icon {
    flex-shrink: 0;
    width: 1.1rem;
    height: 1.1rem;
    object-fit: contain;
}
.sold-by-tier {
    flex-shrink: 0;
    font-family: var(--font-display);
    font-size: 0.62rem;
    font-weight: 600;
    letter-spacing: 0.04em;
    color: var(--color-accent-dim, var(--color-accent));
    background: var(--color-accent-tint-8, var(--color-overlay-white-2));
    border: 1px solid var(--color-accent-tint-20, var(--border));
    padding: 0.1rem 0.4rem;
    border-radius: 3px;
    cursor: help;
}
</style>
