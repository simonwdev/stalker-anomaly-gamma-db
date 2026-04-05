<template>
<div v-if="item && compareItem" class="item-compare-popover" :style="posStyle">
    <div class="tile-card build-hover-tile build-hover-tile--compare">
        <div class="build-compare-header">
            {{ tItemName(compareItem) }} <span class="build-compare-vs">vs</span> {{ tItemName(item) }}
        </div>
        <div class="build-compare-grid">
            <span class="build-compare-sublabel"></span>
            <span class="build-compare-sublabel">{{ t('app_build_equipped') }}</span>
            <span class="build-compare-sublabel">{{ t('app_build_inventory') }}</span>
            <span class="build-compare-sublabel"></span>
            <template v-for="field in fields" :key="field">
                <span class="stat-label">{{ headerLabel(field) }}</span>
                <span class="stat-value build-compare-val">{{ formatValue(field, cellValue(compareItem, field)) }}</span>
                <span class="stat-value build-compare-val">{{ formatValue(field, cellValue(item, field)) }}</span>
                <span class="build-compare-diff"
                      :class="diffClass(field)">
                    {{ diffLabel(field) }}
                </span>
            </template>
        </div>
        <div class="build-hover-desc">
            <img class="build-hover-icon" :src="'img/icons/' + item.id + '.png'" loading="lazy" @error="$event.target.style.display='none'">
            <p v-if="description" class="modal-description">{{ description.text }}</p>
            <div v-if="description && description.sections.length" class="modal-desc-meta">
                <template v-for="section in description.sections" :key="section.header">
                    <span v-for="line in section.items" :key="line" :class="section.header === 'WARNING' ? 'desc-chip desc-chip-warning' : 'desc-chip'">{{ line }}</span>
                </template>
            </div>
        </div>
    </div>
</div>
</template>

<script>
export default {
  name: 'ItemComparePopover',
  inject: ['t', 'tItemName', 'headerLabel', 'formatValue', 'cellValue', 'parseDescription', 'buildHoverDiff', 'buildHoverCompareFields'],
  props: {
    item: { type: Object, default: null },
    compareItem: { type: Object, default: null },
    pos: { type: Object, default: null },
  },
  computed: {
    posStyle() {
      if (!this.pos) return { visibility: 'hidden' };
      return { top: this.pos.top + 'px', left: this.pos.left + 'px' };
    },
    fields() {
      if (!this.item || !this.compareItem) return [];
      return this.buildHoverCompareFields();
    },
    description() {
      if (!this.item) return null;
      return this.parseDescription(this.item);
    },
  },
  methods: {
    diffClass(field) {
      const d = this.buildHoverDiff(field, this.item, this.compareItem);
      if (d.value === null) return 'diff-dash';
      if (d.value === 0) return 'diff-zero';
      return d.positive ? 'diff-positive' : 'diff-negative';
    },
    diffLabel(field) {
      const d = this.buildHoverDiff(field, this.item, this.compareItem);
      if (d.value === null) return '—';
      if (d.value === 0) return '=';
      return (d.value > 0 ? '+' : '') + this.formatValue(field, d.value);
    },
  },
};
</script>

<style scoped>
.item-compare-popover {
  position: fixed;
  top: 0;
  left: 0;
  z-index: 220;
  pointer-events: none;
}
</style>
