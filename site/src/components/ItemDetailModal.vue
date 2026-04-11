<template>
<Transition name="fade">
<div class="modal-backdrop" v-if="modalOpen" @click.self="$emit('closeModal')">
    <button class="modal-nav modal-nav-prev" @click="$emit('navigateModal', -1)" v-tooltip="'&#8592;'">&lsaquo;</button>
    <button class="modal-nav modal-nav-next" @click="$emit('navigateModal', 1)" v-tooltip="'&#8594;'">&rsaquo;</button>
    <button class="modal-close" @click="$emit('closeModal')">&times;</button>
    <Transition name="modal" appear>
    <div class="modal" v-if="modalOpen">
        <div class="modal-body">
            <p v-show="modalLoading" class="loading">{{ t('app_label_loading') }}</p>

            <div v-if="modalItem && !modalLoading">
                <!-- Sticky title bar -->
                <div class="modal-sticky-bar modal-sticky-bar--visible">
                    <span class="modal-sticky-title">
                        <span class="modal-sticky-name">{{ tName(modalItem) }} <span class="modal-sticky-cat">{{ t(singularCategory(modalCategory)) || tCat(modalCategory) }}</span></span>
                        <span class="modal-sticky-id">{{ modalItem.id }}</span>
                    </span>
                    <div class="modal-sticky-actions">
                        <div class="item-toolbar">
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
                    </div>
                </div>

                <div class="drop-sources" :class="{ collapsed: isCollapsed('stats') }">
                    <h2 class="section-toggle" @click="toggleSection('stats')"><LucideChevronRight :size="14" class="section-chevron" /> {{ t('app_label_stats') }}</h2>
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
                                    <span v-for="v in caliberVariantObjects(row.value)" :key="v.id || v.name" class="badge-ammo" :class="{ clickable: v.id }" @click="v.id && $emit('navigateToItem', v.id)">{{ shortAmmoName(tName(v)) }}</span>
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
                        <a v-for="addon in modalWeaponAddons.scopes" :key="addon.id" href="#" class="addon-img-tile addon-img-tile-scope" @mouseenter="showItemHover(addon, $event)" @mousemove="moveItemHover($event)" @mouseleave="hideItemHover()" @click.prevent="$emit('navigateToItem', addon.id)">
                            <img class="addon-img-tile-icon" :src="'img/icons/' + addon.id + '.png'" :alt="t(addon.pda_encyclopedia_name)" loading="lazy" @error="$event.target.style.display='none'" />
                            <span class="addon-img-tile-name">{{ t(addon.pda_encyclopedia_name) }}</span>
                        </a>
                    </div>
                </div>

                <!-- Compatible Silencers (on weapon detail) -->
                <div v-if="modalWeaponAddons.silencers.length" class="drop-sources" :class="{ collapsed: isCollapsed('silencers') }">
                    <h2 class="section-toggle" @click="toggleSection('silencers')"><LucideChevronRight :size="14" class="section-chevron" /> {{ t('app_label_compatible_silencers') }}</h2>
                    <div class="addon-tile-grid">
                        <a v-for="addon in modalWeaponAddons.silencers" :key="addon.id" href="#" class="addon-img-tile addon-img-tile-silencer" @mouseenter="showItemHover(addon, $event)" @mousemove="moveItemHover($event)" @mouseleave="hideItemHover()" @click.prevent="$emit('navigateToItem', addon.id)">
                            <img class="addon-img-tile-icon" :src="'img/icons/' + addon.id + '.png'" :alt="t(addon.pda_encyclopedia_name)" loading="lazy" @error="$event.target.style.display='none'" />
                            <span class="addon-img-tile-name">{{ t(addon.pda_encyclopedia_name) }}</span>
                        </a>
                    </div>
                </div>

                <!-- Compatible Launchers (on weapon detail) -->
                <div v-if="modalWeaponAddons.launchers.length" class="drop-sources" :class="{ collapsed: isCollapsed('launchers') }">
                    <h2 class="section-toggle" @click="toggleSection('launchers')"><LucideChevronRight :size="14" class="section-chevron" /> {{ t('app_label_compatible_launchers') }}</h2>
                    <div class="addon-tile-grid">
                        <a v-for="addon in modalWeaponAddons.launchers" :key="addon.id" href="#" class="addon-img-tile addon-img-tile-launcher" @mouseenter="showItemHover(addon, $event)" @mousemove="moveItemHover($event)" @mouseleave="hideItemHover()" @click.prevent="$emit('navigateToItem', addon.id)">
                            <img class="addon-img-tile-icon" :src="'img/icons/' + addon.id + '.png'" :alt="t(addon.pda_encyclopedia_name)" loading="lazy" @error="$event.target.style.display='none'" />
                            <span class="addon-img-tile-name">{{ t(addon.pda_encyclopedia_name) }}</span>
                        </a>
                    </div>
                </div>

                <!-- Upgrade Tree -->
                <div v-if="modalUpgradeNodes && modalUpgradeNodes.length > 0" class="drop-sources" :class="{ collapsed: isCollapsed('upgrades') }">
                    <h2 class="section-toggle" @click="toggleSection('upgrades')"><LucideChevronRight :size="14" class="section-chevron" /> {{ t('app_label_upgrades') }}</h2>
                    <UpgradeTreeView :nodes="modalUpgradeNodes" />
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

                <!-- Used By Weapons (on ammo detail) -->
                <div v-if="modalUsedByWeapons.length > 0" class="drop-sources" :class="{ collapsed: isCollapsed('used-by') }">
                    <h2 class="section-toggle" @click="toggleSection('used-by')"><LucideChevronRight :size="14" class="section-chevron" /> {{ t('app_label_used_by') }}</h2>
                    <div class="used-by-grid">
                        <div v-for="w in modalUsedByWeapons" :key="w.id" class="used-by-item">
                            <a href="#" @click.prevent="$emit('navigateToItem', w.id)">{{ tName(w) }}</a>
                            <span class="used-by-cat">{{ tCat(w.category) }}</span>
                            <span v-if="w.isAlt" class="badge-ammo badge-ammo-alt ammo-alt-tag">{{ t('app_badge_alt') }}</span>
                        </div>
                    </div>
                </div>

                <!-- Compatible Weapons (on scope/silencer/grenade launcher detail) -->
                <div v-if="modalAddonCompatibleWeapons.length > 0" class="drop-sources" :class="{ collapsed: isCollapsed('compat-weapons') }">
                    <h2 class="section-toggle" @click="toggleSection('compat-weapons')"><LucideChevronRight :size="14" class="section-chevron" /> {{ t('app_label_compatible_weapons') }}</h2>
                    <div class="addon-compat-weapons-grid">
                        <a
                            v-for="w in modalAddonCompatibleWeapons"
                            :key="w.id"
                            href="#"
                            class="addon-compat-weapon-link"
                            @mouseenter="showItemHover(w, $event)"
                            @mousemove="moveItemHover($event)"
                            @mouseleave="hideItemHover()"
                            @click.prevent="$emit('navigateToItem', w.id)"
                        >{{ weaponDisplayName(w) }}</a>
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

export default {
  name: 'ItemDetailModal',
  components: { UpgradeTreeView },
  inject: [
    't', 'tName', 'tCat', 'headerLabel', 'formatValue', 'displayLabel', 'displayStyle',
    'healDots', 'factionColor', 'factionIcon', 'singularCategory', 'isUnusedAmmo',
    'caliberVariantObjects', 'shortAmmoName', 'formatAmmoStat', 'ammoArrow', 'isAmmoBest',
    'findItemByName', 'modalStatClass', 'modalStatStyle',
    'showItemHover', 'moveItemHover', 'hideItemHover',
  ],
  props: {
    modalOpen: Boolean,
    modalItem: Object,
    modalCategory: String,
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
    modalUsedByWeapons: Array,
    parsedDescription: Object,
    modalWeaponAddons: { type: Object, default: () => ({ scopes: [], silencers: [], launchers: [] }) },
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
    'copyItemId', 'copyModalLink', 'pickComparePack',
  ],
  data() {
    return {
      compareMenuOpen: false,
      collapsedSections: this._loadCollapsedSections(),
    };
  },
  watch: {
    modalItem() {
      this.hideItemHover();
      this.stickyVisible = false;
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
      return a.scopes.length > 0 || a.silencers.length > 0 || a.launchers.length > 0 || a.kits.length > 0;
    },
    isAddonItem() {
      return ['Scopes', 'Silencers', 'Grenade Launchers', 'Tactical Kits'].includes(this.modalCategory);
    },
  },
  methods: {
    _loadCollapsedSections() {
      try {
        const raw = localStorage.getItem('modal-collapsed-sections');
        return raw ? JSON.parse(raw) : {};
      } catch { return {}; }
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
      if (addon.st_upgr_cost) rows.push(kv('st_upgr_cost', addon.st_upgr_cost + ' ₽'));
      if (addon.st_data_export_zoom_factor) rows.push(kv('st_data_export_zoom_factor', addon.st_data_export_zoom_factor + 'x'));
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
  },
};
</script>

<style scoped>
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
.modal-sticky-id {
    font-size: 0.6rem;
    color: var(--text-secondary);
    font-family: var(--mono, monospace);
    line-height: 1;
}
.modal-sticky-actions .item-toolbar {
    margin: 0;
}
.modal-sticky-title {
    display: flex;
    flex-direction: column;
    gap: 0.1rem;
    flex-shrink: 0;
}
.modal-sticky-name {
    font-size: 1.1rem;
    font-weight: 700;
    color: var(--color-text);
    white-space: nowrap;
    line-height: 1.2;
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
    margin-left: 0.4rem;
}
</style>
