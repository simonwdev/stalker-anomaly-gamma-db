<template>
<div class="compare-panel-wrapper">

<!-- Compare bar -->
<Transition name="slide-up">
<div class="compare-bar" v-show="pinnedIds.length > 0">
    <LucideScale class="compare-bar-icon" />
    <div class="compare-bar-chips">
        <span v-for="p in pinnedItems" :key="p.id" class="compare-chip">
          <span class="compare-chip-name">{{ p.displayName }}</span>
          <span class="compare-chip-cat">{{ tCatSingular(p.category) }}</span>
          <button class="compare-chip-remove" @click="$emit('togglePin', p.id)">&times;</button>
        </span>
    </div>
    <div class="compare-bar-actions">
        <button class="compare-btn" :disabled="pinnedIds.length < 2" @click="$emit('openCompare')">{{ t('app_label_compare') }} ({{ pinnedIds.length }})</button>
        <button class="compare-clear-btn" @click="$emit('clearPins')">{{ t('app_label_clear') }}</button>
    </div>
</div>
</Transition>

<!-- Compare modal -->
<Transition name="fade">
<div class="modal-backdrop" v-if="compareOpen" @click.self="$emit('closeCompare')" style="z-index: 200;">
    <Transition name="modal" appear>
    <div class="modal compare-modal" v-if="compareOpen">
        <button class="modal-close" @click="$emit('closeCompare')">&times;</button>
        <div class="compare-header">
            <h2 class="compare-title">{{ t('app_label_compare_items') }}</h2>
            <div class="compare-view-toggle" v-if="compareData.length > 0">
                <button :class="{ active: compareViewMode === 'table' }" @click="$emit('update:compareViewMode', 'table')">Table</button>
                <button :class="{ active: compareViewMode === 'chart' }" @click="$emit('update:compareViewMode', 'chart')">Chart</button>
            </div>
        </div>
        <div class="compare-content">
            <template v-if="compareData.length === 0">
                <p class="loading">{{ t('app_label_loading_compare') }}</p>
            </template>
            <template v-else>
                <div v-show="compareViewMode === 'chart'" class="compare-chart-wrap">
                    <canvas ref="compareChartCanvas"></canvas>
                </div>
                <div class="compare-table-wrap" v-show="compareViewMode === 'table'">
                    <table class="compare-table">
                        <thead>
                        <tr>
                            <th class="compare-label-col">{{ t('app_label_stat') }}</th>
                            <th v-for="entry in compareData" :key="entry.item.id" class="compare-item-col">
                                <span class="compare-item-name">{{ tName(entry.item) }}</span>
                                <span class="compare-item-cat">{{ tCat(entry.category) }}</span>
                            </th>
                        </tr>
                        </thead>
                        <tbody>
                        <tr v-for="row in compareStatRows" :key="row.label">
                            <td class="compare-label">{{ headerLabel(row.label) }}</td>
                            <td v-for="(val, idx) in row.values" :key="idx" class="compare-value" :class="compareValueClass(row, idx)">
                                <span class="compare-icon">{{ compareValueIcon(row, idx) }}</span>
                                <span>{{ formatValue(row.label, val) }}</span>
                            </td>
                        </tr>
                        </tbody>
                    </table>
                </div>
            </template>
        </div>
    </div>
    </Transition>
</div>
</Transition>

</div>
</template>

<script>
export default {
    props: {
        pinnedIds: { type: Array, default: () => [] },
        pinnedItems: { type: Array, default: () => [] },
        compareOpen: { type: Boolean, default: false },
        compareData: { type: Array, default: () => [] },
        compareStatRows: { type: Array, default: () => [] },
        compareViewMode: { type: String, default: 'table' },
    },
    emits: [
        'togglePin', 'openCompare', 'clearPins', 'closeCompare',
        'update:compareViewMode',
    ],
    inject: [
        't', 'tName', 'tCat', 'headerLabel', 'formatValue',
        'compareValueClass', 'compareValueIcon', 'tCatSingular',
    ],
    methods: {
        getChartCanvas() {
            return this.$refs.compareChartCanvas;
        },
    },
};
</script>
