<template>
<div class="build-planner">
    <!-- Player Header -->
    <div class="build-player-header">
        <div class="build-player-faction" @click="factionPickerOpen = !factionPickerOpen">
            <img :src="'img/' + factionIcon(buildPlayerFaction)" class="build-player-faction-icon" :alt="buildPlayerFaction">
            <svg class="build-player-faction-overlay" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m17 1 4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="m7 23-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>
            <div v-if="factionPickerOpen" class="build-faction-picker" @click.stop>
                <div v-for="f in factionList" :key="f.id" class="build-faction-option" :class="{ active: buildPlayerFaction === f.id }" @click="$emit('update:buildPlayerFaction', f.id); factionPickerOpen = false">
                    <img :src="'img/' + factionIcon(f.id)" class="build-faction-option-icon">
                    <span>{{ f.label }}</span>
                </div>
            </div>
        </div>
        <div class="build-player-info">
            <div class="build-player-name-wrap">
                <input class="build-player-name" :value="buildPlayerName" @input="$emit('update:buildPlayerName', $event.target.value)" spellcheck="false" maxlength="24">
                <svg class="build-player-name-edit" xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
            </div>
        </div>
        <div class="build-header-actions">
            <!-- Saved builds -->
            <div class="build-action-group">
                <div class="build-saved-dropdown" v-click-outside="() => savedDropdownOpen = false">
                    <button class="build-header-icon" v-tooltip="t('app_build_saved_builds')" @click="savedDropdownOpen = !savedDropdownOpen">
                        <LucideBookmark :size="16" />
                        <span class="build-header-icon-label">{{ t('app_build_saved_builds') || 'Saved Builds' }}</span>
                        <span v-if="buildSavedBuilds.length" class="build-header-badge-inline">{{ buildSavedBuilds.length }}</span>
                    </button>
                    <div v-if="savedDropdownOpen" class="build-saved-menu">
                        <div v-if="buildSavedBuilds.length > 0" class="build-saved-list">
                            <div v-for="(build, idx) in buildSavedBuilds" :key="idx" class="build-saved-item">
                                <span class="build-saved-name" @click="$emit('loadSavedBuild', build); savedDropdownOpen = false">{{ build.name }}</span>
                                <button class="build-saved-delete" @click="$emit('deleteSavedBuild', idx)">&times;</button>
                            </div>
                        </div>
                        <div v-else class="build-saved-empty">{{ t('app_build_no_saved') }}</div>
                    </div>
                </div>
            </div>

            <span class="build-action-divider"></span>

            <!-- Save -->
            <div class="build-action-group">
                <button class="build-header-icon" v-tooltip="t('app_build_save')" @click="$emit('update:buildSaveModalOpen', true)">
                    <LucideSave :size="16" />
                    <span class="build-header-icon-label">{{ t('app_build_save') }}</span>
                </button>
            </div>

            <span class="build-action-divider build-action-divider-desktop"></span>

            <!-- Desktop: inline actions -->
            <div class="build-action-group build-actions-desktop">
                <button class="build-header-icon" :class="{ copied: copyBuildLinkFeedback }" :disabled="buildSharing" v-tooltip="copyBuildLinkFeedback ? t('app_label_copied') : t('app_label_copy_link')" @click="$emit('copyBuildLink')">
                    <span v-if="buildSharing && !copyBuildLinkFeedback" class="loading-spinner loading-spinner-sm"></span>
                    <span v-else-if="copyBuildLinkFeedback"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></span>
                    <span v-else><LucideLink :size="16" /></span>
                </button>
                <button class="build-header-icon" :class="{ copied: copyBuildCodeFeedback }" :disabled="buildSharing" v-tooltip="copyBuildCodeFeedback ? t('app_label_copied') : (t('app_build_copy_code') || 'Copy Code')" @click="$emit('copyBuildCode')">
                    <span v-if="buildSharing && !copyBuildCodeFeedback" class="loading-spinner loading-spinner-sm"></span>
                    <span v-else-if="copyBuildCodeFeedback"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></span>
                    <span v-else><LucideHash :size="16" /></span>
                </button>

                <span class="build-action-divider"></span>

                <button class="build-header-icon save-import-btn" v-tooltip="t('app_save_import_title') || 'Import Save File'" @click="$emit('openSaveImport')">
                    <LucideFileUp :size="16" />
                    <span class="build-header-icon-label">{{ t('app_save_import_title') || 'Import Save' }}</span>
                </button>
                <button class="build-header-icon" v-tooltip="t('app_build_import_code') || 'Import Code'" @click="$emit('openImportCode')">
                    <LucideDownload :size="16" />
                    <span class="build-header-icon-label">{{ t('app_build_import_code') || 'Import Code' }}</span>
                </button>

                <span class="build-action-divider"></span>

                <button class="build-header-icon build-header-icon-danger" v-tooltip="t('app_build_clear')" @click="$emit('clearBuild')">
                    <LucideTrash2 :size="16" />
                    <span class="build-header-icon-label">{{ t('app_build_clear') }}</span>
                </button>
            </div>

            <!-- Mobile: overflow menu -->
            <div class="build-overflow-dropdown build-actions-mobile" v-click-outside="() => overflowOpen = false">
                <button class="build-header-icon" ref="overflowBtn" @click="toggleOverflow()">
                    <LucideEllipsisVertical :size="16" />
                </button>
                <Teleport to="body">
                    <div v-if="overflowOpen" class="build-overflow-menu" :style="overflowStyle">
                        <button class="build-overflow-item" :class="{ copied: copyBuildLinkFeedback }" :disabled="buildSharing" @click="$emit('copyBuildLink')">
                            <LucideLink :size="14" />
                            <span>{{ copyBuildLinkFeedback ? t('app_label_copied') : t('app_label_copy_link') }}</span>
                        </button>
                        <button class="build-overflow-item" :class="{ copied: copyBuildCodeFeedback }" :disabled="buildSharing" @click="$emit('copyBuildCode')">
                            <LucideHash :size="14" />
                            <span>{{ copyBuildCodeFeedback ? t('app_label_copied') : (t('app_build_copy_code') || 'Copy Code') }}</span>
                        </button>
                        <div class="build-overflow-divider"></div>
                        <button class="build-overflow-item save-import-btn" @click="$emit('openSaveImport'); overflowOpen = false">
                            <LucideFileUp :size="14" />
                            <span>{{ t('app_save_import_title') || 'Import Save File' }}</span>
                        </button>
                        <button class="build-overflow-item" @click="$emit('openImportCode'); overflowOpen = false">
                            <LucideDownload :size="14" />
                            <span>{{ t('app_build_import_code') || 'Import Code' }}</span>
                        </button>
                        <div class="build-overflow-divider"></div>
                        <button class="build-overflow-item build-overflow-item-danger" @click="$emit('clearBuild'); overflowOpen = false">
                            <LucideTrash2 :size="14" />
                            <span>{{ t('app_build_clear') }}</span>
                        </button>
                    </div>
                </Teleport>
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
                <button class="build-expand-all-btn" @click="$emit('update:buildLoadoutCollapsed', !buildLoadoutCollapsed)">{{ buildLoadoutCollapsed ? t('app_build_show_loadout') : t('app_build_hide_loadout') }}</button>
            </div>
        </div>
        <div v-if="buildLoadoutCollapsed && buildAllItems.length > 0" class="build-loadout-summary" @click="$emit('update:buildLoadoutCollapsed', false)" v-tooltip="buildLoadoutSummary">
            <span class="build-loadout-summary-text">{{ buildLoadoutSummary }}</span>
        </div>
        <div v-show="!buildLoadoutCollapsed" class="build-loadout-content">
        <div class="build-loadout-box">
        <div class="build-slots">
            <!-- Helmet -->
            <div class="build-slot-group">
                <div class="build-slot-label">{{ t('app_type_helmet') }}</div>
                <div v-if="buildHelmet" class="build-slot filled build-slot-helmet" :class="{ 'drag-over': buildDragState && buildDragState.targetSlot === 'helmet' }" @click="$emit('openBuildPicker', 'helmet')" draggable="true" @dragstart="$emit('onSlotDragStart', $event, 'helmet')" @dragover.prevent="$emit('onSlotDragOver', $event, 'helmet')" @dragleave="$emit('onSlotDragLeave')" @drop.prevent="$emit('onSlotDrop', $event, 'helmet')" @dragend="$emit('onDragEnd')" @mouseenter="$emit('showBuildHover', buildHelmet, $event)" @mousemove="$emit('moveBuildHover', $event)" @mouseleave="$emit('hideBuildHover')">
                    <span class="build-slot-name">{{ tName(buildHelmet) }}</span>
                    <span class="build-slot-meta">{{ formatValue('st_prop_weight', buildHelmet['st_prop_weight']) }} &middot; {{ t('ui_inv_ap_res') }} {{ buildHelmet['ui_inv_ap_res'] || '0' }}</span>
                    <button class="build-slot-remove" @click.stop="$emit('removeBuildSlot', 'helmet')">&times;</button>
                </div>
                <div v-else class="build-slot empty" :class="{ 'drag-over': buildDragState && buildDragState.targetSlot === 'helmet' }" @click="$emit('openBuildPicker', 'helmet')" @dragover.prevent="$emit('onSlotDragOver', $event, 'helmet')" @dragleave="$emit('onSlotDragLeave')" @drop.prevent="$emit('onSlotDrop', $event, 'helmet')">
                    <span class="build-slot-add">+ {{ t('app_build_add_helmet') }}</span>
                </div>
            </div>

            <!-- Outfit -->
            <div class="build-slot-group">
                <div class="build-slot-label">{{ t('app_type_outfit') }}</div>
                <div v-if="buildOutfit" class="build-slot filled build-slot-outfit" :class="{ 'drag-over': buildDragState && buildDragState.targetSlot === 'outfit' }" @click="$emit('openBuildPicker', 'outfit')" draggable="true" @dragstart="$emit('onSlotDragStart', $event, 'outfit')" @dragover.prevent="$emit('onSlotDragOver', $event, 'outfit')" @dragleave="$emit('onSlotDragLeave')" @drop.prevent="$emit('onSlotDrop', $event, 'outfit')" @dragend="$emit('onDragEnd')" @mouseenter="$emit('showBuildHover', buildOutfit, $event)" @mousemove="$emit('moveBuildHover', $event)" @mouseleave="$emit('hideBuildHover')">
                    <span class="build-slot-name">{{ tName(buildOutfit) }}</span>
                    <span class="build-slot-meta">{{ formatValue('st_prop_weight', buildOutfit['st_prop_weight']) }} &middot; {{ t('app_build_slots') }}: {{ buildOutfit['ui_inv_outfit_artefact_count'] || '0' }} &middot; {{ t('app_build_slots_max') }}: {{ buildOutfit['st_data_export_outfit_artefact_count_max'] || '0' }}</span>
                    <button class="build-slot-remove" @click.stop="$emit('removeBuildSlot', 'outfit')">&times;</button>
                </div>
                <div v-else class="build-slot empty" :class="{ 'drag-over': buildDragState && buildDragState.targetSlot === 'outfit' }" @click="$emit('openBuildPicker', 'outfit')" @dragover.prevent="$emit('onSlotDragOver', $event, 'outfit')" @dragleave="$emit('onSlotDragLeave')" @drop.prevent="$emit('onSlotDrop', $event, 'outfit')">
                    <span class="build-slot-add">+ {{ t('app_build_add_outfit') }}</span>
                </div>
            </div>

            <!-- Backpack -->
            <div class="build-slot-group">
                <div class="build-slot-label">{{ t('app_type_backpack') }}</div>
                <div v-if="buildBackpack" class="build-slot filled build-slot-backpack" :class="{ 'drag-over': buildDragState && buildDragState.targetSlot === 'backpack' }" @click="$emit('openBuildPicker', 'backpack')" draggable="true" @dragstart="$emit('onSlotDragStart', $event, 'backpack')" @dragover.prevent="$emit('onSlotDragOver', $event, 'backpack')" @dragleave="$emit('onSlotDragLeave')" @drop.prevent="$emit('onSlotDrop', $event, 'backpack')" @dragend="$emit('onDragEnd')" @mouseenter="$emit('showBuildHover', buildBackpack, $event)" @mousemove="$emit('moveBuildHover', $event)" @mouseleave="$emit('hideBuildHover')">
                    <span class="build-slot-name">{{ tName(buildBackpack) }}</span>
                    <span class="build-slot-meta">{{ formatValue('st_prop_weight', buildBackpack['st_prop_weight']) }} &middot; +{{ buildBackpack['ui_inv_outfit_additional_weight'] || '0' }} {{ tUnit('st_prop_weight') }}</span>
                    <button class="build-slot-remove" @click.stop="$emit('removeBuildSlot', 'backpack')">&times;</button>
                </div>
                <div v-else class="build-slot empty" :class="{ 'drag-over': buildDragState && buildDragState.targetSlot === 'backpack' }" @click="$emit('openBuildPicker', 'backpack')" @dragover.prevent="$emit('onSlotDragOver', $event, 'backpack')" @dragleave="$emit('onSlotDragLeave')" @drop.prevent="$emit('onSlotDrop', $event, 'backpack')">
                    <span class="build-slot-add">+ {{ t('app_build_add_backpack') }}</span>
                </div>
            </div>

            <!-- Belt Slots (always show 5) -->
            <div class="build-slot-group build-slot-group-multi">
                <div class="build-slot-label">{{ t('app_build_belt_slots') }} <span class="build-slot-counter">{{ buildBeltSlotUsed }}/{{ buildBeltSlotMax }}</span></div>
                <div class="build-slot-row" :class="{ 'drag-over': buildDragState && buildDragState.targetSlot === 'beltarea' }" @dragover.prevent="$emit('onBeltAreaDragOver', $event)" @dragleave="$emit('onSlotDragLeave')" @drop.prevent="$emit('onBeltAreaDrop', $event)">
                    <template v-for="(slot, i) in buildBeltSlots" :key="i">
                        <div v-if="slot.state === 'filled'" class="build-slot filled build-slot-sm" :class="slot.type === 'belt' ? 'build-slot-belt' : 'build-slot-artifact'" @click="$emit('openBuildPicker', slot.type, slot.index)" draggable="true" @dragstart="$emit('onSlotDragStart', $event, slot.type, slot.index)" @dragend="$emit('onDragEnd')" @mouseenter="$emit('showBuildHover', slot.item, $event)" @mousemove="$emit('moveBuildHover', $event)" @mouseleave="$emit('hideBuildHover')">
                            <span class="build-slot-name">{{ tName(slot.item) }}</span>
                            <button class="build-slot-remove" @click.stop="$emit('removeBuildSlot', slot.type, slot.index)">&times;</button>
                        </div>
                        <div v-else-if="slot.state === 'empty'" class="build-slot empty build-slot-sm" @click="$emit('openBuildPicker', 'belt')">
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
                <div v-if="buildWeaponPrimary" class="build-slot filled build-slot-weapon" :class="{ 'drag-over': buildDragState && buildDragState.targetSlot === 'weapon' && buildDragState.targetIndex === 'primary' }" @click="$emit('openBuildPicker', 'weapon', 'primary')" draggable="true" @dragstart="$emit('onSlotDragStart', $event, 'weapon', 'primary')" @dragover.prevent="$emit('onSlotDragOver', $event, 'weapon', 'primary')" @dragleave="$emit('onSlotDragLeave')" @drop.prevent="$emit('onSlotDrop', $event, 'weapon', 'primary')" @dragend="$emit('onDragEnd')" @mouseenter="$emit('showBuildHover', buildWeaponPrimary, $event)" @mousemove="$emit('moveBuildHover', $event)" @mouseleave="$emit('hideBuildHover')">
                    <span class="build-slot-name">{{ tName(buildWeaponPrimary) }}</span>
                    <span class="build-slot-meta">{{ formatValue('st_prop_weight', buildWeaponPrimary['st_prop_weight']) }}</span>
                    <button class="build-slot-remove" @click.stop="$emit('removeBuildSlot', 'weapon', 'primary')">&times;</button>
                </div>
                <div v-else class="build-slot empty" :class="{ 'drag-over': buildDragState && buildDragState.targetSlot === 'weapon' && buildDragState.targetIndex === 'primary' }" @click="$emit('openBuildPicker', 'weapon', 'primary')" @dragover.prevent="$emit('onSlotDragOver', $event, 'weapon', 'primary')" @dragleave="$emit('onSlotDragLeave')" @drop.prevent="$emit('onSlotDrop', $event, 'weapon', 'primary')">
                    <span class="build-slot-add">+ {{ t('app_build_weapon_primary') }}</span>
                </div>
                <div class="build-slot-ammo-row">
                    <div v-if="buildAmmoPrimary" class="build-slot filled build-slot-sm build-slot-ammo" @click="$emit('openBuildPicker', 'ammo', 'primary')" draggable="true" @dragstart="$emit('onSlotDragStart', $event, 'ammo', 'primary')" @dragend="$emit('onDragEnd')" @mouseenter="$emit('showBuildHover', buildAmmoPrimary, $event)" @mousemove="$emit('moveBuildHover', $event)" @mouseleave="$emit('hideBuildHover')">
                        <span class="build-slot-name">{{ tItemName(buildAmmoPrimary) }}</span>
                        <button class="build-slot-remove" @click.stop="$emit('removeBuildSlot', 'ammo', 'primary')">&times;</button>
                    </div>
                    <div v-else-if="buildWeaponPrimary" class="build-slot empty build-slot-sm" @click="$emit('openBuildPicker', 'ammo', 'primary')">
                        <span class="build-slot-add">+ {{ t('app_build_ammo') }}</span>
                    </div>
                    <div v-else class="build-slot empty build-slot-sm build-slot-disabled">
                        <span class="build-slot-add">{{ t('app_build_ammo') }}</span>
                    </div>
                </div>
                <div class="build-slot-label">{{ t('app_build_weapon_secondary') }}</div>
                <div v-if="buildWeaponSecondary" class="build-slot filled build-slot-weapon" :class="{ 'drag-over': buildDragState && buildDragState.targetSlot === 'weapon' && buildDragState.targetIndex === 'secondary' }" @click="$emit('openBuildPicker', 'weapon', 'secondary')" draggable="true" @dragstart="$emit('onSlotDragStart', $event, 'weapon', 'secondary')" @dragover.prevent="$emit('onSlotDragOver', $event, 'weapon', 'secondary')" @dragleave="$emit('onSlotDragLeave')" @drop.prevent="$emit('onSlotDrop', $event, 'weapon', 'secondary')" @dragend="$emit('onDragEnd')" @mouseenter="$emit('showBuildHover', buildWeaponSecondary, $event)" @mousemove="$emit('moveBuildHover', $event)" @mouseleave="$emit('hideBuildHover')">
                    <span class="build-slot-name">{{ tName(buildWeaponSecondary) }}</span>
                    <span class="build-slot-meta">{{ formatValue('st_prop_weight', buildWeaponSecondary['st_prop_weight']) }}</span>
                    <button class="build-slot-remove" @click.stop="$emit('removeBuildSlot', 'weapon', 'secondary')">&times;</button>
                </div>
                <div v-else class="build-slot empty" :class="{ 'drag-over': buildDragState && buildDragState.targetSlot === 'weapon' && buildDragState.targetIndex === 'secondary' }" @click="$emit('openBuildPicker', 'weapon', 'secondary')" @dragover.prevent="$emit('onSlotDragOver', $event, 'weapon', 'secondary')" @dragleave="$emit('onSlotDragLeave')" @drop.prevent="$emit('onSlotDrop', $event, 'weapon', 'secondary')">
                    <span class="build-slot-add">+ {{ t('app_build_weapon_secondary') }}</span>
                </div>
                <div class="build-slot-ammo-row">
                    <div v-if="buildAmmoSecondary" class="build-slot filled build-slot-sm build-slot-ammo" @click="$emit('openBuildPicker', 'ammo', 'secondary')" draggable="true" @dragstart="$emit('onSlotDragStart', $event, 'ammo', 'secondary')" @dragend="$emit('onDragEnd')" @mouseenter="$emit('showBuildHover', buildAmmoSecondary, $event)" @mousemove="$emit('moveBuildHover', $event)" @mouseleave="$emit('hideBuildHover')">
                        <span class="build-slot-name">{{ tItemName(buildAmmoSecondary) }}</span>
                        <button class="build-slot-remove" @click.stop="$emit('removeBuildSlot', 'ammo', 'secondary')">&times;</button>
                    </div>
                    <div v-else-if="buildWeaponSecondary" class="build-slot empty build-slot-sm" @click="$emit('openBuildPicker', 'ammo', 'secondary')">
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
                <div v-if="buildWeaponSidearm" class="build-slot filled build-slot-weapon" :class="{ 'drag-over': buildDragState && buildDragState.targetSlot === 'sidearm' }" @click="$emit('openBuildPicker', 'sidearm')" draggable="true" @dragstart="$emit('onSlotDragStart', $event, 'sidearm')" @dragover.prevent="$emit('onSlotDragOver', $event, 'sidearm')" @dragleave="$emit('onSlotDragLeave')" @drop.prevent="$emit('onSlotDrop', $event, 'sidearm')" @dragend="$emit('onDragEnd')" @mouseenter="$emit('showBuildHover', buildWeaponSidearm, $event)" @mousemove="$emit('moveBuildHover', $event)" @mouseleave="$emit('hideBuildHover')">
                    <span class="build-slot-name">{{ tName(buildWeaponSidearm) }}</span>
                    <span class="build-slot-meta">{{ formatValue('st_prop_weight', buildWeaponSidearm['st_prop_weight']) }}</span>
                    <button class="build-slot-remove" @click.stop="$emit('removeBuildSlot', 'sidearm')">&times;</button>
                </div>
                <div v-else class="build-slot empty" :class="{ 'drag-over': buildDragState && buildDragState.targetSlot === 'sidearm' }" @click="$emit('openBuildPicker', 'sidearm')">
                    <span class="build-slot-add">+ {{ t('app_build_sidearm') }}</span>
                </div>
                <div v-if="!isWeaponMelee(buildWeaponSidearm)" class="build-slot-ammo-row">
                    <div v-if="buildAmmoSidearm" class="build-slot filled build-slot-sm build-slot-ammo" @click="$emit('openBuildPicker', 'ammo', 'sidearm')" draggable="true" @dragstart="$emit('onSlotDragStart', $event, 'ammo', 'sidearm')" @dragend="$emit('onDragEnd')" @mouseenter="$emit('showBuildHover', buildAmmoSidearm, $event)" @mousemove="$emit('moveBuildHover', $event)" @mouseleave="$emit('hideBuildHover')">
                        <span class="build-slot-name">{{ tItemName(buildAmmoSidearm) }}</span>
                        <button class="build-slot-remove" @click.stop="$emit('removeBuildSlot', 'ammo', 'sidearm')">&times;</button>
                    </div>
                    <div v-else-if="buildWeaponSidearm" class="build-slot empty build-slot-sm" @click="$emit('openBuildPicker', 'ammo', 'sidearm')">
                        <span class="build-slot-add">+ {{ t('app_build_ammo') }}</span>
                    </div>
                    <div v-else class="build-slot empty build-slot-sm build-slot-disabled">
                        <span class="build-slot-add">{{ t('app_build_ammo') }}</span>
                    </div>
                </div>
                <div class="build-slot-label">{{ t('app_build_grenade') }}</div>
                <div v-if="buildWeaponGrenade" class="build-slot filled build-slot-grenade" :class="{ 'drag-over': buildDragState && buildDragState.targetSlot === 'grenade' }" @click="$emit('openBuildPicker', 'grenade')" draggable="true" @dragstart="$emit('onSlotDragStart', $event, 'grenade')" @dragover.prevent="$emit('onSlotDragOver', $event, 'grenade')" @dragleave="$emit('onSlotDragLeave')" @drop.prevent="$emit('onSlotDrop', $event, 'grenade')" @dragend="$emit('onDragEnd')" @mouseenter="$emit('showBuildHover', buildWeaponGrenade, $event)" @mousemove="$emit('moveBuildHover', $event)" @mouseleave="$emit('hideBuildHover')">
                    <span class="build-slot-name">{{ tItemName(buildWeaponGrenade) }}</span>
                    <span class="build-slot-meta">{{ formatValue('st_prop_weight', buildWeaponGrenade['st_prop_weight']) }}</span>
                    <button class="build-slot-remove" @click.stop="$emit('removeBuildSlot', 'grenade')">&times;</button>
                </div>
                <div v-else class="build-slot empty" :class="{ 'drag-over': buildDragState && buildDragState.targetSlot === 'grenade' }" @click="$emit('openBuildPicker', 'grenade')">
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
                    <button class="build-expand-all-btn" v-if="!buildRadarVisible" @click="$emit('update:buildHideGearStats', !buildHideGearStats)">{{ buildHideGearStats ? t('app_build_show_gear') : t('app_build_hide_gear') }}</button>
                    <button class="build-expand-all-btn" v-if="!buildRadarVisible && (buildWeaponPrimary || buildWeaponSecondary || buildWeaponSidearm || buildWeaponGrenade)" @click="$emit('update:buildHideWeaponStats', !buildHideWeaponStats)">{{ buildHideWeaponStats ? t('app_build_show_weapons') : t('app_build_hide_weapons') }}</button>
                    <button class="build-expand-all-btn" @click="$emit('toggleBuildExpandAll')" v-if="buildAllItems.length > 0 && !buildRadarVisible">{{ buildAllExpanded ? t('app_build_collapse_all') : t('app_build_expand_all') }}</button>
                    <button class="build-expand-all-btn" :class="{ active: buildRadarVisible }" @click="$emit('update:buildRadarVisible', !buildRadarVisible)" v-if="buildWeaponPrimary || buildWeaponSecondary || buildWeaponSidearm">{{ t('app_build_weapon_chart') || 'Weapon Chart' }}</button>
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
                <div class="build-tile-stat build-prot-expandable" :class="{ 'build-prot-low': buildCombinedStats.totalWeight === 0 }" @click="$emit('toggleBuildStatExpand', 'weight')">
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
                <div class="build-tile-stat build-prot-expandable" :class="{ 'build-prot-low': buildCombinedStats.carryWeight === 0 }" @click="$emit('toggleBuildStatExpand', 'carry')">
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
                <div class="build-tile-stat build-prot-expandable" :class="{ 'build-prot-low': buildCombinedStats.armorPoints === 0 }" @click="$emit('toggleBuildStatExpand', 'armor')">
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
                <div class="build-tile-stat build-prot-expandable" :class="{ 'build-prot-low': buildCombinedStats.speed === 0 }" @click="$emit('toggleBuildStatExpand', 'speed')">
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
                    <div class="build-tile-stat build-prot-expandable" :class="{ 'build-prot-low': buildCombinedStats.protections[f].total === 0 }" @click="$emit('toggleBuildStatExpand', f)">
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
                    <div class="build-tile-stat build-prot-expandable" :class="{ 'build-prot-low': buildCombinedStats.restorations[f].total === 0 }" @click="$emit('toggleBuildStatExpand', f)">
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
                <button class="build-weapon-toggle-btn" :class="{ active: buildActiveWeaponTab === 'primary' }" @click="$emit('update:buildActiveWeaponTab', 'primary')" v-if="buildWeaponPrimary">
                    {{ tName(buildWeaponPrimary) }}<template v-if="buildAmmoPrimary"> <span class="build-weapon-toggle-with">with</span> {{ shortAmmoName(tName(buildAmmoPrimary)) }}</template>
                </button>
                <button class="build-weapon-toggle-btn" :class="{ active: buildActiveWeaponTab === 'secondary' }" @click="$emit('update:buildActiveWeaponTab', 'secondary')" v-if="buildWeaponSecondary">
                    {{ tName(buildWeaponSecondary) }}<template v-if="buildAmmoSecondary"> <span class="build-weapon-toggle-with">with</span> {{ shortAmmoName(tName(buildAmmoSecondary)) }}</template>
                </button>
                <button class="build-weapon-toggle-btn" :class="{ active: buildActiveWeaponTab === 'sidearm' }" @click="$emit('update:buildActiveWeaponTab', 'sidearm')" v-if="buildWeaponSidearm">
                    {{ tName(buildWeaponSidearm) }}<template v-if="buildAmmoSidearm"> <span class="build-weapon-toggle-with">with</span> {{ shortAmmoName(tName(buildAmmoSidearm)) }}</template>
                </button>
                <button class="build-weapon-toggle-btn" :class="{ active: buildActiveWeaponTab === 'grenade' }" @click="$emit('update:buildActiveWeaponTab', 'grenade')" v-if="buildWeaponGrenade">
                    {{ tItemName(buildWeaponGrenade) }}
                </button>
            </div>
            <template v-if="buildWeaponStats">
                <div v-for="s in buildWeaponStats.stats" :key="s.field" class="build-tile-wrap">
                    <div class="build-tile-stat build-prot-expandable" :class="{ 'build-prot-low': s.effective == null || s.effective === 0 }" @click="$emit('toggleBuildStatExpand', 'wpn_' + s.field)">
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
                    <button class="build-expand-all-btn" @click="$emit('openInventoryPicker')"><LucidePlus :size="10" /> {{ t('app_build_add_to_inventory') }}</button>
                    <button class="build-expand-all-btn" @click="$emit('addFavoritesToInventory')" :disabled="!favoriteIds.length"><LucideStar :size="10" /> {{ t('app_build_add_favourites') }}</button>
                    <button v-if="buildInventory.length > 0" class="build-expand-all-btn" @click="$emit('clearInventory')"><LucideTrash2 :size="10" /> {{ t('app_build_clear_inventory') }}</button>
                    <button v-if="buildInventory.length > 1" class="build-expand-all-btn" :class="{ active: buildInventorySort !== 'none' }" @click="$emit('cycleInventorySort')"><LucideArrowUpDown :size="10" /><span v-if="buildInventorySort !== 'none'"> {{ buildInventorySortLabel }}</span></button>
                </div>
            </div>
            <div v-if="weaponCompareSlotCount > 1" class="build-compare-toggle">
                <span class="build-compare-toggle-label">{{ t('app_build_weapon_comparison') }}</span>
                <button v-if="buildWeaponPrimary" class="build-compare-toggle-btn" :class="{ active: buildWeaponCompareSlot === 'primary' }" @click="$emit('setWeaponCompareSlot', 'primary')">{{ t('app_build_weapon_primary') }}</button>
                <button v-if="buildWeaponSecondary" class="build-compare-toggle-btn" :class="{ active: buildWeaponCompareSlot === 'secondary' }" @click="$emit('setWeaponCompareSlot', 'secondary')">{{ t('app_build_weapon_secondary') }}</button>
                <button v-if="buildWeaponSidearm" class="build-compare-toggle-btn" :class="{ active: buildWeaponCompareSlot === 'sidearm' }" @click="$emit('setWeaponCompareSlot', 'sidearm')">{{ t('app_build_sidearm') }}</button>
            </div>
            <div class="build-inventory-body" :class="{ 'drag-over': buildDragState && buildDragState.targetSlot === 'inventory' }" @dragover.prevent="$emit('onInventoryDragOver', $event)" @drop.prevent="$emit('onInventoryDrop', $event)">
                <div v-if="buildInventory.length > 0" class="build-inventory-items">
                    <div v-for="entry in buildInventorySorted" :key="entry.originalIndex"
                         class="build-inventory-item"
                         :class="'build-inv-' + entry.slotType"
                         draggable="true"
                         @dragstart="$emit('onInventoryDragStart', $event, entry.originalIndex)"
                         @dragend="$emit('onDragEnd')"
                         @click="$emit('equipFromInventory', entry.originalIndex)"
                         @mouseenter="$emit('showBuildHover', entry.item, $event)"
                         @mousemove="$emit('moveBuildHover', $event)"
                         @mouseleave="$emit('hideBuildHover')">
                        <span class="build-inventory-item-name">{{ tItemName(entry.item) }}</span>
                        <span class="build-inventory-item-type">{{ getItemCategoryLabel(entry.item) }}</span>
                        <button class="build-inventory-item-remove" @click.stop="$emit('removeFromInventory', entry.originalIndex)">&times;</button>
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
</div>
</template>

<script>
export default {
    props: {
        buildPlayerName: { type: String, default: '' },
        buildPlayerFaction: { type: String, default: '' },
        buildSavedBuilds: { type: Array, default: () => [] },
        buildSaveModalOpen: { type: Boolean, default: false },
        buildSharing: { type: Boolean, default: false },
        copyBuildLinkFeedback: { type: Boolean, default: false },
        copyBuildCodeFeedback: { type: Boolean, default: false },
        buildOutfit: { type: Object, default: null },
        buildHelmet: { type: Object, default: null },
        buildBackpack: { type: Object, default: null },
        buildBelts: { type: Array, default: () => [] },
        buildArtifacts: { type: Array, default: () => [] },
        buildWeaponPrimary: { type: Object, default: null },
        buildWeaponSecondary: { type: Object, default: null },
        buildWeaponSidearm: { type: Object, default: null },
        buildWeaponGrenade: { type: Object, default: null },
        buildAmmoPrimary: { type: Object, default: null },
        buildAmmoSecondary: { type: Object, default: null },
        buildAmmoSidearm: { type: Object, default: null },
        buildActiveWeaponTab: { type: String, default: 'primary' },
        buildWeaponCompareSlot: { type: String, default: 'primary' },
        buildLoadoutCollapsed: { type: Boolean, default: false },
        buildLoadoutSummary: { type: String, default: '' },
        buildBeltSlots: { type: Array, default: () => [] },
        buildBeltSlotMax: { type: Number, default: 0 },
        buildBeltSlotUsed: { type: Number, default: 0 },
        buildCombinedStats: { type: Object, default: () => ({}) },
        buildAllItems: { type: Array, default: () => [] },
        buildExpandedStats: { type: Object, default: () => ({}) },
        buildAllExpanded: { type: Boolean, default: false },
        buildHideGearStats: { type: Boolean, default: false },
        buildHideWeaponStats: { type: Boolean, default: false },
        buildRadarVisible: { type: Boolean, default: false },
        buildWeaponStats: { type: Object, default: null },
        buildInventory: { type: Array, default: () => [] },
        buildInventorySorted: { type: Array, default: () => [] },
        buildInventorySort: { type: String, default: 'none' },
        buildInventorySortLabel: { type: String, default: '' },
        buildDragState: { type: Object, default: null },
        favoriteIds: { type: Array, default: () => [] },
        factionList: { type: Array, default: () => [] },
        weaponCompareSlotCount: { type: Number, default: 0 },
    },
    emits: [
        'update:buildPlayerName',
        'update:buildPlayerFaction',
        'update:buildSaveModalOpen',
        'update:buildActiveWeaponTab',
        'update:buildLoadoutCollapsed',
        'update:buildHideGearStats',
        'update:buildHideWeaponStats',
        'update:buildRadarVisible',
        'openSaveImport',
        'loadSavedBuild',
        'deleteSavedBuild',
        'clearBuild',
        'copyBuildLink',
        'copyBuildCode',
        'openImportCode',
        'openBuildPicker',
        'removeBuildSlot',
        'toggleBuildStatExpand',
        'toggleBuildExpandAll',
        'openInventoryPicker',
        'addFavoritesToInventory',
        'clearInventory',
        'cycleInventorySort',
        'setWeaponCompareSlot',
        'equipFromInventory',
        'removeFromInventory',
        'showBuildHover',
        'moveBuildHover',
        'hideBuildHover',
        'onSlotDragStart',
        'onSlotDragOver',
        'onSlotDragLeave',
        'onSlotDrop',
        'onDragEnd',
        'onBeltAreaDragOver',
        'onBeltAreaDrop',
        'onInventoryDragStart',
        'onInventoryDragOver',
        'onInventoryDrop',
    ],
    inject: [
        't', 'tName', 'tItemName', 'headerLabel', 'formatValue',
        'statClass', 'statStyle', 'cellValue',
        'displayLabel', 'displayStyle',
        'factionIcon', 'factionColor',
        'caliberName', 'ammoTooltipPayload', 'openAmmoFromCaliber',
        'shortAmmoName', 'singularCategory',
        'tUnit', 'buildSlotColor', 'buildStatFormatted',
        'parseDescription', 'getItemFields', 'getItemCategoryLabel',
        'buildHoverDiff', 'buildHoverCompareFields',
        'isWeaponMelee',
    ],
    data() {
        return {
            factionPickerOpen: false,
            savedDropdownOpen: false,
            overflowOpen: false,
            overflowStyle: {},
        };
    },
    methods: {
        getRadarCanvas() {
            return this.$refs.buildWeaponRadarCanvas;
        },
        toggleOverflow() {
            this.overflowOpen = !this.overflowOpen;
            if (this.overflowOpen) {
                const btn = this.$refs.overflowBtn;
                if (btn) {
                    const rect = btn.getBoundingClientRect();
                    this.overflowStyle = {
                        position: 'fixed',
                        top: rect.bottom + 4 + 'px',
                        right: (window.innerWidth - rect.right) + 'px',
                    };
                }
            }
        },
    },
};
</script>

<style>
/* ── Build header toolbar ── */
.build-header-actions {
    display: flex;
    gap: 0.15rem;
    align-items: center;
    margin-left: auto;
}
.build-action-group {
    display: flex;
    align-items: center;
    gap: 0.15rem;
}
.build-action-divider {
    width: 1px;
    height: 1.1rem;
    background: var(--color-overlay-white-10);
    margin: 0 0.25rem;
    flex-shrink: 0;
}
.build-header-icon {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.3rem;
    min-width: 1.8rem;
    height: 1.8rem;
    padding: 0 0.25rem;
    background: none;
    border: none;
    border-radius: 4px;
    color: var(--text-secondary);
    cursor: pointer;
    transition: color 0.15s, background 0.15s;
}
.build-header-icon > * {
    pointer-events: none;
}
.build-header-icon:hover {
    color: var(--text);
    background: var(--color-overlay-white-6);
}
.build-header-icon.copied {
    color: var(--color-green);
}
.build-header-icon-label {
    font-size: 0.68rem;
    font-weight: 500;
    white-space: nowrap;
    pointer-events: none;
}
.build-header-icon-danger {
    color: var(--text-secondary);
}
.build-header-icon-danger:hover {
    color: var(--color-red-vibrant);
    background: var(--color-red-vibrant-tint-10);
}

/* Inline badge (flows after label text) */
.build-header-badge-inline {
    background: var(--accent);
    color: var(--color-black);
    font-size: 0.5rem;
    font-weight: 700;
    min-width: 0.9rem;
    height: 0.9rem;
    line-height: 0.9rem;
    text-align: center;
    border-radius: 50%;
    padding: 0 0.2rem;
    pointer-events: none;
}

/* ── Overflow menu (mobile) ── */
.build-overflow-dropdown {
    position: relative;
}
.build-overflow-menu {
    min-width: 11rem;
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: 4px;
    padding: 0.25rem;
    z-index: 120;
    box-shadow: 0 4px 12px var(--color-overlay-black-40);
}
.build-overflow-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    width: 100%;
    padding: 0.4rem 0.5rem;
    background: none;
    border: none;
    border-radius: 3px;
    color: var(--text-secondary);
    font-size: 0.72rem;
    cursor: pointer;
    transition: color 0.15s, background 0.15s;
    text-align: left;
}
.build-overflow-item:hover {
    color: var(--text);
    background: var(--color-overlay-white-6);
}
.build-overflow-item.copied {
    color: var(--color-green);
}
.build-overflow-item:disabled {
    opacity: 0.4;
    cursor: default;
}
.build-overflow-item-danger:hover {
    color: var(--color-red-vibrant);
    background: var(--color-red-vibrant-tint-10);
}
.build-overflow-divider {
    height: 1px;
    background: var(--color-overlay-white-8);
    margin: 0.2rem 0.3rem;
}

/* ── Responsive: show/hide desktop vs mobile ── */
.build-actions-mobile { display: none; }
.build-actions-desktop { display: flex; align-items: center; gap: 0.15rem; }

@media (max-width: 1200px) {
    .build-header-icon-label { display: none; }
}
@media (max-width: 900px) {
    .build-actions-desktop,
    .build-action-divider-desktop { display: none; }
    .build-actions-mobile { display: block; }
}

/* ── Import code modal banner ── */
.build-import-code-banner {
    min-height: 1.8rem;
    padding: 0.4rem 0.6rem;
    border-radius: 4px;
    font-size: 0.72rem;
    margin-bottom: 0.5rem;
    background: transparent;
    border: 1px solid transparent;
    color: var(--color-red-vibrant);
    transition: background 0.15s, border-color 0.15s;
}
.build-import-code-banner.visible {
    background: var(--color-red-vibrant-tint-12);
    border-color: var(--color-red-vibrant-tint-30);
}
.build-save-input-error {
    border-color: var(--color-red-vibrant-tint-50) !important;
}
</style>
