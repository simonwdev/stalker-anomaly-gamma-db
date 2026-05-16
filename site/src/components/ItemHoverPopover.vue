<template>
<div v-if="item" class="item-hover-popover" :style="posStyle">
    <div class="item-hover-card">
        <div class="item-hover-header">
            <span class="item-hover-name">{{ tItemName(item) }}</span>
            <span v-if="originBadge(item.factions)" class="badge-flag" :class="originBadge(item.factions).cls">{{ originBadge(item.factions).label }}</span>
            <span v-if="item['st_data_export_has_perk'] === 'Y'" class="badge-flag badge-perk">{{ t('app_badge_perk') }}</span>
            <span v-if="item['ui_mcm_menu_exo'] === 'Y'" class="badge-flag badge-powered">{{ t('app_badge_powered') }}</span>
        </div>
        <div class="item-hover-stats">
            <div v-for="field in fields" :key="field" class="item-hover-stat-row">
                <span class="item-hover-stat-label">{{ headerLabel(field) }}</span>
                <template v-if="field === 'ui_mm_repair'">
                    <span class="badge" :style="displayStyle(field, item[field])">{{ displayLabel(field, item[field]) }}</span>
                </template>
                <template v-else-if="field === 'ui_ammo_types' || field === 'st_data_export_ammo_types_alt'">
                    <span v-if="item[field]" class="item-hover-ammo-list">
                        <span v-for="a in item[field].split(';')" :key="a" :class="field === 'st_data_export_ammo_types_alt' ? 'badge-ammo badge-ammo-alt' : 'badge-ammo'">{{ caliberName(a.trim()) }}</span>
                    </span>
                    <span v-else class="item-hover-stat-value">--</span>
                </template>
                <template v-else>
                    <span class="item-hover-stat-value" :class="statClass(field, cellValue(item, field))" :style="statStyle(field, cellValue(item, field))">{{ formatValue(field, cellValue(item, field)) }}</span>
                </template>
            </div>
        </div>
        <div class="item-hover-desc">
            <img class="item-hover-icon" :src="'img/icons/' + item.id + '.png'" @error="($event.target as HTMLElement).style.display='none'">
            <p v-if="description" class="item-hover-desc-text">{{ description.text }}</p>
            <div v-if="description && description.sections.length" class="item-hover-desc-meta">
                <template v-for="section in description.sections" :key="section.header">
                    <span v-for="line in section.items" :key="line" :class="section.header === 'WARNING' ? 'desc-chip desc-chip-warning' : 'desc-chip'">{{ line }}</span>
                </template>
            </div>
        </div>
    </div>
</div>
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue';

interface HoverPos {
  top: number;
  left: number;
}

export default defineComponent({
  name: 'ItemHoverPopover',
  inject: ['t', 'tItemName', 'headerLabel', 'formatValue', 'displayStyle', 'displayLabel', 'statClass', 'statStyle', 'cellValue', 'getItemFields', 'parseDescription', 'caliberName', 'originBadge'],
  props: {
    item: { type: Object, default: null },
    pos: { type: Object as PropType<HoverPos | null>, default: null },
  },
  computed: {
    posStyle(): Record<string, string> {
      if (!this.pos) return { visibility: 'hidden' };
      return { top: this.pos.top + 'px', left: this.pos.left + 'px' };
    },
    fields(): string[] {
      if (!this.item) return [];
      return (this as any).getItemFields(this.item);
    },
    description(): any {
      if (!this.item) return null;
      return (this as any).parseDescription(this.item);
    },
  },
});
</script>

<style scoped>
.item-hover-popover {
  position: fixed;
  top: 0;
  left: 0;
  z-index: 220;
  pointer-events: none;
  max-height: 80vh;
  overflow-y: auto;
}
.item-hover-card {
  background: var(--card);
  border: 1px solid var(--color-accent-tint-20);
  border-radius: 5px;
  padding: 0.5rem 0.6rem;
  box-shadow: 0 4px 16px var(--color-overlay-black-50);
  min-width: 18rem;
  max-width: 24rem;
  overflow: hidden;
}
.item-hover-header {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  margin-bottom: 0.4rem;
  padding-bottom: 0.3rem;
  border-bottom: 1px solid var(--border);
}
.item-hover-header .badge-flag {
  font-size: 0.55rem;
  padding: 0.05rem 0.3rem;
}
.item-hover-name {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--accent);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  min-width: 0;
}
.item-hover-stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.1rem 0.75rem;
}
.item-hover-stat-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.25rem;
  min-width: 0;
}
.item-hover-stat-row:has(.item-hover-ammo-list) {
  grid-column: 1 / -1;
}
.item-hover-stat-label {
  color: var(--text-secondary);
  font-size: 0.6rem;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.item-hover-stat-value {
  font-family: var(--mono);
  font-size: 0.7rem;
  text-align: right;
  flex-shrink: 0;
  white-space: nowrap;
}
.item-hover-stat-row .badge,
.item-hover-stat-row .badge-ammo,
.item-hover-stat-row .badge-flag {
  font-size: 0.6rem;
  padding: 0 0.35rem;
  line-height: 1.3;
}
.item-hover-ammo-list {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 0.2rem;
  min-width: 0;
}
.item-hover-ammo-list .badge-ammo {
  white-space: nowrap;
}
.item-hover-desc {
  padding: 0.4rem 0 0;
  margin-top: 0.4rem;
  border-top: 1px solid var(--color-overlay-white-8);
}
.item-hover-icon {
  float: right;
  margin: 0 0 0.25rem 0.5rem;
  opacity: 0.85;
}
.item-hover-icon:only-child {
  float: none;
  display: block;
  margin: 0 auto;
}
.item-hover-desc-text {
  font-size: 0.65rem;
  color: var(--text-secondary);
  line-height: 1.4;
  margin: 0;
}
.item-hover-desc-meta {
  margin-top: 0.25rem;
}
</style>
