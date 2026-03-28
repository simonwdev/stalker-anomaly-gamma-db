<template>
<!-- Build Picker modal -->
<Transition name="fade">
<div class="modal-backdrop" v-if="open" @click.self="$emit('close')" style="z-index: 210;">
    <Transition name="modal" appear>
    <div class="modal build-picker-modal" v-if="open">
        <button class="modal-close" @click="$emit('close')">&times;</button>
        <div class="modal-body">
            <h2 class="build-picker-title">{{ t('app_build_select') }} {{ buildPickerSlot ? buildPickerSlotLabel : '' }}</h2>
            <div class="build-picker-search">
                <svg class="filter-input-icon" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                <input type="text" :value="buildPickerQuery" @input="$emit('update:buildPickerQuery', $event.target.value)" :placeholder="t('app_label_filter_placeholder')" class="build-picker-input" ref="buildPickerInput">
            </div>
            <div class="build-picker-list">
                <div v-for="item in buildPickerItems" :key="item.id" class="build-picker-item" @click="$emit('selectItem', item)" @mouseenter="$emit('showBuildHover', item, $event)" @mousemove="$emit('moveBuildHover', $event)" @mouseleave="$emit('hideBuildHover')">
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
</template>

<script>
export default {
  name: "BuildPickerModal",
  inject: ["t", "tItemName", "formatValue", "isAltAmmo", "getItemSlotType", "getItemCategoryLabel"],
  props: {
    open: Boolean,
    buildPickerSlot: Object,
    buildPickerSlotLabel: String,
    buildPickerQuery: String,
    buildPickerItems: Array,
    buildPickerAmmoWeapon: Object,
  },
  emits: [
    "close",
    "update:buildPickerQuery",
    "selectItem",
    "showBuildHover",
    "moveBuildHover",
    "hideBuildHover",
  ],
  watch: {
    open(val) {
      if (val) {
        this.$nextTick(() => {
          const input = this.$refs.buildPickerInput;
          if (input) input.focus();
        });
      }
    },
  },
};
</script>
