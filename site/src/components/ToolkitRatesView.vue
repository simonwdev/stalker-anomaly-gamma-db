<template>
    <div v-if="isToolkitRates && toolkitRates" class="toolkit-rates-view">
        <div class="table-wrap">
            <table class="toolkit-rates-table">
                <thead>
                <tr>
                    <th class="toolkit-map-col" @click="$emit('toggleToolkitSort', '_name')">
                        <span>{{ t('app_label_map') }}</span><span class="sort-icon">{{ toolkitSortIcon('_name') }}</span>
                    </th>
                    <th v-for="tt in toolkitRates.toolTypes" :key="tt" @click="$emit('toggleToolkitSort', tt)" class="toolkit-rate-col">
                        <span>{{ t(tt) }}</span><span class="sort-icon">{{ toolkitSortIcon(tt) }}</span>
                    </th>
                </tr>
                </thead>
                <tbody>
                <tr v-for="map in toolkitRatesSorted" :key="map.id">
                    <td class="toolkit-map-col">{{ t(map.id) }}</td>
                    <td v-for="tt in toolkitRates.toolTypes" :key="tt" class="toolkit-rate-col" :style="toolkitHeatBg(map.rates[tt])">
                        {{ map.rates[tt] ? map.rates[tt] + '%' : '--' }}
                    </td>
                </tr>
                </tbody>
            </table>
        </div>
    </div>
</template>

<script>
export default {
    name: "ToolkitRatesView",
    inject: ["t"],
    props: {
        isToolkitRates: Boolean,
        toolkitRates: { type: [Object, null], default: null },
        toolkitRatesSorted: { type: Array, default: () => [] },
        toolkitSortCol: { type: String, default: "_name" },
        toolkitSortAsc: { type: Boolean, default: true },
    },
    emits: ["toggleToolkitSort"],
    methods: {
        toolkitSortIcon(col) {
            if (this.toolkitSortCol !== col) return "";
            return this.toolkitSortAsc ? " \u25B2" : " \u25BC";
        },
        toolkitHeatBg(value) {
            if (!value) return "";
            const intensity = Math.min(value / 100, 1) * 0.45;
            return `background: rgba(var(--color-green-intensity-rgb), ${intensity})`;
        },
    },
};
</script>
