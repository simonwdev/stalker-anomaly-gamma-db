<template>
<!-- Save Import modal -->
<Transition name="fade">
<div class="modal-backdrop" v-if="open" @click.self="$emit('close')" style="z-index: 215;">
    <Transition name="modal" appear>
    <div class="modal save-import-modal" v-if="open">
        <div class="save-import-header">
            <h2 class="build-picker-title" style="margin:0">{{ t('app_save_import_title') || 'Import Save File' }}</h2>
            <button class="save-import-close" @click="$emit('close')">&times;</button>
        </div>
        <div class="modal-body">

            <!-- Drop zone -->
            <div v-if="!saveImportPreview && !saveImportParsing && !saveImportError" class="save-import-dropzone" :class="{ 'save-import-dragover': dragOver }" @dragover.prevent="dragOver = true" @dragleave.prevent="dragOver = false" @drop.prevent="onDrop($event)">
                <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="save-import-icon"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M12 18v-6"/><path d="m9 15 3-3 3 3"/></svg>
                <p class="save-import-dropzone-label">{{ t('app_save_import_drop') || 'Drop save files here' }}</p>
                <label class="save-import-browse-btn build-toolbar-btn">
                    {{ t('app_save_import_browse') || 'Browse' }}
                    <input type="file" accept=".scop,.scoc" multiple @change="$emit('handleFile', $event)" style="display:none">
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
                <button class="build-toolbar-btn" @click="$emit('retryImport')">{{ t('app_save_import_retry') || 'Try Again' }}</button>
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
                    <label class="save-import-stash-toggle"><input type="checkbox" :checked="saveImportIncludeAmmo" @change="$emit('update:saveImportIncludeAmmo', $event.target.checked)"> {{ t('app_save_import_include_ammo') || 'Include ammo' }}</label>
                    <label class="save-import-stash-toggle"><input type="checkbox" :checked="saveImportIncludeStash" @change="$emit('update:saveImportIncludeStash', $event.target.checked)"> {{ t('app_save_import_include_stash') || 'Include stash' }}</label>
                </div>

                <div class="save-import-columns">
                <!-- Left column: Loadout + Inventory -->
                <div class="save-import-col">
                    <p class="save-import-section-label">{{ t('app_build_loadout') || 'Loadout' }}</p>
                    <div class="save-import-slots">
                        <div class="save-import-slot" v-if="saveImportPreview.outfit">
                            <span class="save-import-slot-label">{{ t('app_cat_outfits') || 'Outfit' }}</span>
                            <span class="save-import-slot-items"><span class="save-import-slot-item" @mouseenter="$emit('saveImportHover', saveImportPreview.outfit, $event)" @mousemove="$emit('moveBuildHover', $event)" @mouseleave="$emit('hideBuildHover')">{{ saveImportItemName(saveImportPreview.outfit) }}</span></span>
                        </div>
                        <div class="save-import-slot" v-if="saveImportPreview.helmet">
                            <span class="save-import-slot-label">{{ t('app_cat_helmets') || 'Helmet' }}</span>
                            <span class="save-import-slot-items"><span class="save-import-slot-item" @mouseenter="$emit('saveImportHover', saveImportPreview.helmet, $event)" @mousemove="$emit('moveBuildHover', $event)" @mouseleave="$emit('hideBuildHover')">{{ saveImportItemName(saveImportPreview.helmet) }}</span></span>
                        </div>
                        <div class="save-import-slot" v-if="saveImportPreview.backpack">
                            <span class="save-import-slot-label">{{ t('app_type_backpack') || 'Backpack' }}</span>
                            <span class="save-import-slot-items"><span class="save-import-slot-item" @mouseenter="$emit('saveImportHover', saveImportPreview.backpack, $event)" @mousemove="$emit('moveBuildHover', $event)" @mouseleave="$emit('hideBuildHover')">{{ saveImportItemName(saveImportPreview.backpack) }}</span></span>
                        </div>
                        <div class="save-import-slot" v-if="saveImportPreview.artifacts.length">
                            <span class="save-import-slot-label">{{ t('app_cat_artefacts') || 'Artefacts' }}</span>
                            <span class="save-import-slot-items">
                                <span v-for="(id, i) in saveImportPreview.artifacts" :key="i" class="save-import-slot-item" @mouseenter="$emit('saveImportHover', id, $event)" @mousemove="$emit('moveBuildHover', $event)" @mouseleave="$emit('hideBuildHover')">{{ saveImportItemName(id) }}</span>
                            </span>
                        </div>
                        <div class="save-import-slot" v-if="saveImportPreview.belts.length">
                            <span class="save-import-slot-label">{{ t('app_cat_belt_attachments') || 'Belt' }}</span>
                            <span class="save-import-slot-items">
                                <span v-for="(id, i) in saveImportPreview.belts" :key="i" class="save-import-slot-item" @mouseenter="$emit('saveImportHover', id, $event)" @mousemove="$emit('moveBuildHover', $event)" @mouseleave="$emit('hideBuildHover')">{{ saveImportItemName(id) }}</span>
                            </span>
                        </div>
                        <div class="save-import-slot" v-if="saveImportPreview.weapons.length">
                            <span class="save-import-slot-label">{{ t('app_group_weapons') || 'Weapons' }}</span>
                            <span class="save-import-slot-items">
                                <span v-for="(id, i) in saveImportPreview.weapons" :key="i" class="save-import-slot-item" @mouseenter="$emit('saveImportHover', id, $event)" @mousemove="$emit('moveBuildHover', $event)" @mouseleave="$emit('hideBuildHover')">{{ saveImportItemName(id) }}</span>
                            </span>
                        </div>
                        <div class="save-import-slot" v-if="saveImportPreview.sidearms.length">
                            <span class="save-import-slot-label">{{ t('app_build_sidearm') || 'Sidearm' }}</span>
                            <span class="save-import-slot-items">
                                <span v-for="(id, i) in saveImportPreview.sidearms" :key="i" class="save-import-slot-item" @mouseenter="$emit('saveImportHover', id, $event)" @mousemove="$emit('moveBuildHover', $event)" @mouseleave="$emit('hideBuildHover')">{{ saveImportItemName(id) }}</span>
                            </span>
                        </div>
                        <div class="save-import-slot" v-if="saveImportPreview.grenades.length">
                            <span class="save-import-slot-label">{{ t('app_cat_explosives') || 'Grenades' }}</span>
                            <span class="save-import-slot-items">
                                <span v-for="(id, i) in saveImportPreview.grenades" :key="i" class="save-import-slot-item" @mouseenter="$emit('saveImportHover', id, $event)" @mousemove="$emit('moveBuildHover', $event)" @mouseleave="$emit('hideBuildHover')">{{ saveImportItemName(id) }}</span>
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
                                    <span v-for="(id, i) in saveImportPreview.inventory.artifacts" :key="i" class="save-import-slot-item" @mouseenter="$emit('saveImportHover', id, $event)" @mousemove="$emit('moveBuildHover', $event)" @mouseleave="$emit('hideBuildHover')">{{ saveImportItemName(id) }}</span>
                                </span>
                            </div>
                            <div class="save-import-slot" v-if="saveImportPreview.inventory.belts.length">
                                <span class="save-import-slot-label">{{ t('app_cat_belt_attachments') || 'Belt' }}</span>
                                <span class="save-import-slot-items">
                                    <span v-for="(id, i) in saveImportPreview.inventory.belts" :key="i" class="save-import-slot-item" @mouseenter="$emit('saveImportHover', id, $event)" @mousemove="$emit('moveBuildHover', $event)" @mouseleave="$emit('hideBuildHover')">{{ saveImportItemName(id) }}</span>
                                </span>
                            </div>
                            <div class="save-import-slot" v-if="saveImportPreview.inventory.weapons.length || saveImportPreview.inventory.sidearms.length">
                                <span class="save-import-slot-label">{{ t('app_group_weapons') || 'Weapons' }}</span>
                                <span class="save-import-slot-items">
                                    <span v-for="(id, i) in [...saveImportPreview.inventory.weapons, ...saveImportPreview.inventory.sidearms]" :key="i" class="save-import-slot-item" @mouseenter="$emit('saveImportHover', id, $event)" @mousemove="$emit('moveBuildHover', $event)" @mouseleave="$emit('hideBuildHover')">{{ saveImportItemName(id) }}</span>
                                </span>
                            </div>
                            <div class="save-import-slot" v-if="saveImportPreview.inventory.outfits.length">
                                <span class="save-import-slot-label">{{ t('app_cat_outfits') || 'Outfits' }}</span>
                                <span class="save-import-slot-items">
                                    <span v-for="(id, i) in saveImportPreview.inventory.outfits" :key="i" class="save-import-slot-item" @mouseenter="$emit('saveImportHover', id, $event)" @mousemove="$emit('moveBuildHover', $event)" @mouseleave="$emit('hideBuildHover')">{{ saveImportItemName(id) }}</span>
                                </span>
                            </div>
                            <div class="save-import-slot" v-if="saveImportPreview.inventory.helmets.length">
                                <span class="save-import-slot-label">{{ t('app_cat_helmets') || 'Helmets' }}</span>
                                <span class="save-import-slot-items">
                                    <span v-for="(id, i) in saveImportPreview.inventory.helmets" :key="i" class="save-import-slot-item" @mouseenter="$emit('saveImportHover', id, $event)" @mousemove="$emit('moveBuildHover', $event)" @mouseleave="$emit('hideBuildHover')">{{ saveImportItemName(id) }}</span>
                                </span>
                            </div>
                            <div class="save-import-slot" v-if="saveImportIncludeAmmo && saveImportPreview.ammo.length">
                                <span class="save-import-slot-label">{{ t('app_cat_ammo') || 'Ammo' }}</span>
                                <span class="save-import-slot-items">
                                    <span v-for="(id, i) in saveImportPreview.ammo" :key="i" class="save-import-slot-item" @mouseenter="$emit('saveImportHover', id, $event)" @mousemove="$emit('moveBuildHover', $event)" @mouseleave="$emit('hideBuildHover')">{{ saveImportItemName(id) }}</span>
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
                                <span v-for="(id, i) in saveImportPreview.stash.outfits" :key="i" class="save-import-slot-item" @mouseenter="$emit('saveImportHover', id, $event)" @mousemove="$emit('moveBuildHover', $event)" @mouseleave="$emit('hideBuildHover')">{{ saveImportItemName(id) }}</span>
                            </span>
                        </div>
                        <div class="save-import-slot" v-if="saveImportPreview.stash.helmets.length">
                            <span class="save-import-slot-label">{{ t('app_cat_helmets') || 'Helmets' }}</span>
                            <span class="save-import-slot-items">
                                <span v-for="(id, i) in saveImportPreview.stash.helmets" :key="i" class="save-import-slot-item" @mouseenter="$emit('saveImportHover', id, $event)" @mousemove="$emit('moveBuildHover', $event)" @mouseleave="$emit('hideBuildHover')">{{ saveImportItemName(id) }}</span>
                            </span>
                        </div>
                        <div class="save-import-slot" v-if="saveImportPreview.stash.belts.length">
                            <span class="save-import-slot-label">{{ t('app_cat_belt_attachments') || 'Belt' }}</span>
                            <span class="save-import-slot-items">
                                <span v-for="(id, i) in saveImportPreview.stash.belts" :key="i" class="save-import-slot-item" @mouseenter="$emit('saveImportHover', id, $event)" @mousemove="$emit('moveBuildHover', $event)" @mouseleave="$emit('hideBuildHover')">{{ saveImportItemName(id) }}</span>
                            </span>
                        </div>
                        <div class="save-import-slot" v-if="saveImportPreview.stash.artifacts.length">
                            <span class="save-import-slot-label">{{ t('app_cat_artefacts') || 'Artefacts' }}</span>
                            <span class="save-import-slot-items">
                                <span v-for="(id, i) in saveImportPreview.stash.artifacts" :key="i" class="save-import-slot-item" @mouseenter="$emit('saveImportHover', id, $event)" @mousemove="$emit('moveBuildHover', $event)" @mouseleave="$emit('hideBuildHover')">{{ saveImportItemName(id) }}</span>
                            </span>
                        </div>
                        <div class="save-import-slot" v-if="saveImportPreview.stash.weapons.length || saveImportPreview.stash.sidearms.length">
                            <span class="save-import-slot-label">{{ t('app_group_weapons') || 'Weapons' }}</span>
                            <span class="save-import-slot-items">
                                <span v-for="(id, i) in [...saveImportPreview.stash.weapons, ...saveImportPreview.stash.sidearms]" :key="i" class="save-import-slot-item" @mouseenter="$emit('saveImportHover', id, $event)" @mousemove="$emit('moveBuildHover', $event)" @mouseleave="$emit('hideBuildHover')">{{ saveImportItemName(id) }}</span>
                            </span>
                        </div>
                        <div class="save-import-slot" v-if="saveImportPreview.stash.grenades.length">
                            <span class="save-import-slot-label">{{ t('app_cat_explosives') || 'Grenades' }}</span>
                            <span class="save-import-slot-items">
                                <span v-for="(id, i) in saveImportPreview.stash.grenades" :key="i" class="save-import-slot-item" @mouseenter="$emit('saveImportHover', id, $event)" @mousemove="$emit('moveBuildHover', $event)" @mouseleave="$emit('hideBuildHover')">{{ saveImportItemName(id) }}</span>
                            </span>
                        </div>
                        <div class="save-import-slot" v-if="saveImportIncludeAmmo && saveImportPreview.stash.ammo.length">
                            <span class="save-import-slot-label">{{ t('app_cat_ammo') || 'Ammo' }}</span>
                            <span class="save-import-slot-items">
                                <span v-for="(id, i) in saveImportPreview.stash.ammo" :key="i" class="save-import-slot-item" @mouseenter="$emit('saveImportHover', id, $event)" @mousemove="$emit('moveBuildHover', $event)" @mouseleave="$emit('hideBuildHover')">{{ saveImportItemName(id) }}</span>
                            </span>
                        </div>
                    </div>
                </div>
                </div>

                <div class="save-import-actions">
                    <button class="build-toolbar-btn save-import-cancel" @click="$emit('close')">Cancel</button>
                    <button class="build-toolbar-btn save-import-confirm" @click="$emit('confirmImport')">{{ t('app_save_import_load') || 'Load Build' }}</button>
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
  name: "SaveImportModal",
  inject: ["t", "saveImportItemName"],
  props: {
    open: Boolean,
    saveImportParsing: Boolean,
    saveImportError: String,
    saveImportPreview: Object,
    saveImportFileName: String,
    saveImportIncludeStash: Boolean,
    saveImportIncludeAmmo: Boolean,
  },
  emits: [
    "close",
    "update:saveImportIncludeStash",
    "update:saveImportIncludeAmmo",
    "handleDrop",
    "handleFile",
    "retryImport",
    "confirmImport",
    "saveImportHover",
    "moveBuildHover",
    "hideBuildHover",
  ],
  data() {
    return {
      dragOver: false,
    };
  },
  methods: {
    onDrop(event) {
      this.dragOver = false;
      this.$emit("handleDrop", event);
    },
  },
};
</script>
