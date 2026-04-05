<template>
<div class="table-wrap">
    <table class="item-table">
        <thead>
        <tr>
            <th class="fav-col-header"></th>
            <th class="pin-col-header"></th>
            <template v-for="col in tableColumns" :key="col.key">
                <th v-if="col.type === 'header'" @click="$emit('toggleSort', col.key)" :class="{ 'text-right': !isLeftAlignCol(col.key) }">
                    <span>{{ headerLabel(col.key) }}</span><span class="sort-icon">{{ sortIcon(col.key) }}</span>
                </th>
                <th v-else @click="$emit('toggleSort', '_heal')">
                    <span>{{ t('app_label_heals') }}</span><span class="sort-icon">{{ sortIcon('_heal') }}</span>
                </th>
            </template>
        </tr>
        </thead>
        <tbody>
        <tr v-for="item in visibleItems" :key="item.id" @click="$emit('navigateToItem', item.id)" class="clickable-row">
            <td class="fav-col" @click.stop="$emit('toggleFavorite', item.id)">
                <span class="fav-icon" :class="{ favorited: isFavorited(item.id) }">{{ isFavorited(item.id) ? '\u2605' : '\u2606' }}</span>
            </td>
            <td class="pin-col" @click.stop="$emit('togglePin', item.id)">
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
                        <a href="#" @click.prevent.stop="$emit('navigateToItem', item.id)">{{ tItemName(item) }}</a>
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
                            <span v-for="a in item[col.key].split(';')" :key="a" :class="col.key === 'st_data_export_ammo_types_alt' ? 'badge-ammo badge-ammo-alt clickable' : 'badge-ammo clickable'" @mouseenter="showItemHoverFromCaliber(a.trim(), $event)" @mouseleave="hideItemHover()" @click.stop="openAmmoFromCaliber(a.trim())">{{ caliberName(a.trim()) }}</span>
                        </span>
                    </template>
                    <template v-else-if="col.key === 'ui_st_community'">
                        <span v-if="item[col.key]" class="badge-flag" :style="factionColor(item[col.key]) ? { color: factionColor(item[col.key]), background: 'rgba(' + parseInt(factionColor(item[col.key]).slice(1,3),16) + ',' + parseInt(factionColor(item[col.key]).slice(3,5),16) + ',' + parseInt(factionColor(item[col.key]).slice(5,7),16) + ',0.18)' } : null">{{ t(item[col.key]).toUpperCase() }}</span>
                    </template>
                    <template v-else-if="col.key === '_compatible_weapons'">
                        <span class="badge-flag badge-compat compat-weapons-badge" @mouseenter="showWeaponListPopover(item, $event)" @mouseleave="hideWeaponListPopover()"><LucideSearch :size="10" /> {{ formatValue(col.key, cellValue(item, col.key), true) }}</span>
                    </template>
                    <template v-else>
                        <span :class="statClass(col.key, cellValue(item, col.key))" :style="statStyle(col.key, cellValue(item, col.key))">{{ formatValue(col.key, cellValue(item, col.key), true) }}</span>
                    </template>
                </td>
            </template>
        </tr>
        </tbody>
    </table>
    <div ref="infiniteScrollSentinel" class="infinite-scroll-sentinel"></div>
</div>
</template>

<script>
import { infiniteScrollMixin } from '../infiniteScrollMixin.js';

export default {
  name: "ItemTable",
  mixins: [infiniteScrollMixin],
  inject: [
    "t",
    "tItemName",
    "headerLabel",
    "cellValue",
    "formatValue",
    "statClass",
    "statStyle",
    "displayLabel",
    "displayStyle",
    "singularType",
    "healDots",
    "caliberName",
    "showItemHoverFromCaliber",
    "hideItemHover",
    "factionColor",
    "isUnusedAmmo",
    "openAmmoFromCaliber",
    "showWeaponListPopover",
    "hideWeaponListPopover",
  ],
  props: {
    items: { type: Array, required: true },
    tableColumns: { type: Array, required: true },
    sortCol: { type: String, required: true },
    sortAsc: { type: Boolean, required: true },
    favoriteIds: { type: Array, required: true },
    pinnedIds: { type: Array, required: true },
    activeNameTags: { type: Array, required: true },
  },
  emits: ["navigateToItem", "toggleFavorite", "togglePin", "toggleSort"],
  methods: {
    isFavorited(id) {
      return this.favoriteIds.includes(id);
    },
    isPinned(id) {
      return this.pinnedIds.includes(id);
    },
    sortIcon(col) {
      if (col !== this.sortCol) return "";
      return this.sortAsc ? " \u25B2" : " \u25BC";
    },
    isLeftAlignCol(key) {
      const LEFT_COLS = ["pda_encyclopedia_name", "name", "ui_st_community", "ui_ammo_types", "st_data_export_ammo_types_alt"];
      return LEFT_COLS.includes(key);
    },
  },
};
</script>
