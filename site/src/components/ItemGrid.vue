<template>
<div class="tile-grid">
    <div v-for="item in visibleItems" :key="item.id" class="tile-card" :class="{ 'tile-card-compact': compact }" @click="$emit('navigateToItem', item.id)" v-tooltip="tileTooltipFn ? tileTooltipFn(item) : null">
        <div class="tile-card-header">
            <span class="fav-icon" :class="{ favorited: isFavorited(item.id) }" @click.stop="$emit('toggleFavorite', item.id)">{{ isFavorited(item.id) ? '\u2605' : '\u2606' }}</span>
            <span class="pin-icon" :class="{ pinned: isPinned(item.id), 'pin-disabled': !isPinned(item.id) && pinnedIds.length >= 5 }" @click.stop="$emit('togglePin', item.id)">&#x1F4CC;</span>
            <a href="#" @click.prevent.stop="$emit('navigateToItem', item.id)" class="tile-card-name">{{ tItemName(item) }}</a>
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
            <span v-if="compact && item.category" class="badge-flag badge-category">{{ t(singularCategory(item.category)) }}</span>
        </div>
        <!-- Icon row: shown for addon categories (scopes/silencers/launchers) -->
        <div v-if="showItemIcon" class="tile-card-icon-row">
            <img
                class="addon-img-tile-icon"
                :src="'img/icons/' + item.id + '.png'"
                :alt="tItemName(item)"
                @error="$event.target.parentElement.style.display='none'"
            />
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
    <div v-if="items.length === 0" class="tile-empty">{{ t('app_label_no_results') }}</div>
    <div ref="infiniteScrollSentinel" class="infinite-scroll-sentinel"></div>
</div>
</template>

<script>
import { infiniteScrollMixin } from '../infiniteScrollMixin.js';

export default {
    mixins: [infiniteScrollMixin],
    props: {
        items: { type: Array, default: () => [] },
        tileFields: { type: Array, default: () => [] },
        tileHealGroups: { type: Array, default: () => [] },
        favoriteIds: { type: Array, default: () => [] },
        pinnedIds: { type: Array, default: () => [] },
        compact: { type: Boolean, default: false },
        tileTooltipFn: { type: Function, default: null },
        showItemIcon: { type: Boolean, default: false },
    },
    emits: ['navigateToItem', 'toggleFavorite', 'togglePin'],
    inject: [
        't', 'tItemName', 'headerLabel', 'cellValue', 'formatValue',
        'statClass', 'statStyle', 'displayLabel', 'displayStyle',
        'singularType', 'singularCategory', 'healDots',
        'caliberName', 'ammoTooltipPayload', 'factionColor',
        'isUnusedAmmo', 'openAmmoFromCaliber',
    ],
    methods: {
        isFavorited(id) { return this.favoriteIds.includes(id); },
        isPinned(id) { return this.pinnedIds.includes(id); },
    },
};
</script>
