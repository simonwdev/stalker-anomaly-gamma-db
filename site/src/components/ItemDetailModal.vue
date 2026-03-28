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
                <div v-if="crossPackId && crossPackItem" class="drop-sources">
                    <h2>{{ t('app_label_changes_from') }} {{ crossPackName }}</h2>
                    <div v-if="crossPackDiffs.length" class="stat-grid">
                        <div v-for="row in crossPackDiffs" :key="'diff-'+row.key" class="stat-row">
                            <span class="stat-label">{{ headerLabel(row.key) }}</span>
                            <span class="stat-value diff-values"><span class="diff-old">{{ formatValue(row.key, row.otherValue) }}</span> <span class="diff-arrow">&#9654;</span> <span class="diff-new" :class="row.diff.type === 'higher' ? 'diff-up' : 'diff-down'">{{ formatValue(row.key, row.value) }}</span></span>
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
                                        <a v-if="v.id" href="#" @click.prevent="$emit('navigateToItem', v.id)" class="ammo-variant-link">{{ shortAmmoName(tName(v)) }}</a>
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
                <div v-if="modalUsedInRecipes.length > 0" class="drop-sources">
                    <h2>{{ t('app_label_used_in_crafting') }}</h2>
                    <div class="recipe-used-list">
                        <div v-for="recipe in modalUsedInRecipes" :key="recipe.id" class="recipe-used-item">
                            <a href="#" @click.prevent="$emit('navigateToItem', recipe.id)">{{ tName(recipe) }}</a>
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
                <div v-if="modalUsedByWeapons.length > 0" class="drop-sources">
                    <h2>{{ t('app_label_used_by') }}</h2>
                    <div class="used-by-grid">
                        <div v-for="w in modalUsedByWeapons" :key="w.id" class="used-by-item">
                            <a href="#" @click.prevent="$emit('navigateToItem', w.id)">{{ tName(w) }}</a>
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
</template>

<script>
export default {
  name: 'ItemDetailModal',
  inject: [
    't', 'tName', 'tCat', 'headerLabel', 'formatValue', 'displayLabel', 'displayStyle',
    'healDots', 'factionColor', 'factionIcon', 'singularCategory', 'isUnusedAmmo',
    'caliberVariantObjects', 'shortAmmoName', 'formatAmmoStat', 'ammoArrow', 'isAmmoBest',
    'findItemByName', 'modalStatClass', 'modalStatStyle',
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
    modalAmmoVariants: Array,
    modalAmmoStatKeys: Array,
    modalRecipe: { type: Array, default: null },
    modalUsedInRecipes: Array,
    modalDisassembleMaterials: { type: Array, default: null },
    modalUsedByWeapons: Array,
    parsedDescription: Object,
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
    };
  },
  methods: {
    isFavorited(id) {
      return this.favoriteIds.includes(id);
    },
    isPinned(id) {
      return this.pinnedIds.includes(id);
    },
    closeCompareMenu() {
      this.compareMenuOpen = false;
    },
  },
};
</script>
